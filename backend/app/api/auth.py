from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.db.session import get_db
from app.models.user import User
from app.core.security import create_access_token, verify_password, get_password_hash
from app.api.deps import get_current_user
from app.core.config import settings
from app.core.dev_auth import DEV_AUTH_DISABLED
from datetime import timedelta, datetime

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    user: Optional[dict] = None
    message: str = ""

class UserResponse(BaseModel):
    id: str
    name: str
    username: str

    class Config:
        from_attributes = True


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class RegisterResponse(BaseModel):
    success: bool
    message: str
    requires_approval: bool = True


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # DEV MODE: accept any credentials and return a mock token
    if DEV_AUTH_DISABLED:
        access_token = create_access_token(
            data={"sub": request.username, "user_id": "dev-user"},
            expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
        )
        return LoginResponse(
            success=True,
            token=access_token,
            user={"id": "dev-user", "name": "Dev User", "username": request.username},
            message="Dev mode: login bypassed",
        )

    user = db.query(User).filter(User.username == request.username).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if user.role != "admin" and not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account pending admin approval. Please wait for an administrator to approve your account.",
        )

    # Check timed ban — auto-unban if ban period has expired
    if user.banned_until is not None:
        now = datetime.utcnow()
        if now < user.banned_until:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is banned until {user.banned_until.isoformat()}",
            )
        else:
            # Ban period has lapsed — auto-unban
            user.banned_until = None
            user.is_active = True
            user.is_approved = True

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )

    access_token_expires = timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": str(user.id)},
        expires_delta=access_token_expires,
    )

    return LoginResponse(
        success=True,
        token=access_token,
        user={"id": str(user.id), "name": user.full_name, "username": user.username},
        message="Login successful"
    )


@router.post("/register", response_model=RegisterResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists",
        )

    hashed_password = get_password_hash(request.password)
    new_user = User(
        full_name=request.name,
        username=request.email,
        email=request.email,
        password_hash=hashed_password,
        role="user",
        is_approved=False,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return RegisterResponse(
        success=True,
        message="Account created successfully. It requires approval from an administrator before you can log in.",
        requires_approval=True,
    )

@router.post("/logout")
def logout():
    return {"success": True, "message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
