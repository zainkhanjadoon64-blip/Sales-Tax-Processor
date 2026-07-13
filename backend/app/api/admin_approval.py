"""Admin endpoints for user management (approval, ban, disable, delete)."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class UserOut(BaseModel):
    id: str
    full_name: str
    username: str
    email: Optional[str] = None
    is_active: bool
    is_approved: bool
    role: str = "user"
    banned_until: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: List[UserOut]
    total: int


class BanDurationRequest(BaseModel):
    ban_until: datetime


class MessageResponse(BaseModel):
    success: bool
    message: str


class AdminStatsResponse(BaseModel):
    success: bool
    data: dict


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _get_user_or_404(user_id: str, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def _admin_only(current_user: User) -> None:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@router.get("/admin/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get admin dashboard statistics."""
    _admin_only(current_user)
    now = datetime.utcnow()
    total_users = db.query(User).count()
    pending_approvals = db.query(User).filter(User.is_approved == False, User.role == "user").count()
    active_users = db.query(User).filter(User.is_active == True, User.is_approved == True, User.role == "user").count()
    banned_users = db.query(User).filter(User.banned_until != None, User.banned_until > now).count()

    return AdminStatsResponse(
        success=True,
        data={
            "total_users": total_users,
            "pending_approvals": pending_approvals,
            "active_users": active_users,
            "banned_users": banned_users,
        }
    )


# ---------------------------------------------------------------------------
# User listing
# ---------------------------------------------------------------------------

@router.get("/admin/users/pending", response_model=UserListResponse)
def list_pending_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return users who have not been approved yet."""
    _admin_only(current_user)
    users = db.query(User).filter(User.is_approved == False, User.role == "user").all()
    return UserListResponse(
        users=[UserOut.model_validate(u) for u in users],
        total=len(users),
    )


@router.get("/admin/users/all", response_model=UserListResponse)
def list_all_users(
    search: Optional[str] = Query(None, description="Filter by name or username"),
    approved: Optional[bool] = Query(None, description="Filter by approval status"),
    active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all users with optional filtering and pagination."""
    _admin_only(current_user)
    query = db.query(User)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            User.full_name.ilike(pattern) | User.username.ilike(pattern)
        )
    if approved is not None:
        query = query.filter(User.is_approved == approved)
    if active is not None:
        query = query.filter(User.is_active == active)

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    return UserListResponse(
        users=[UserOut.model_validate(u) for u in users],
        total=total,
    )


@router.get("/admin/users/{user_id}", response_model=UserOut)
def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details of a single user by ID."""
    _admin_only(current_user)
    user = _get_user_or_404(user_id, db)
    return UserOut.model_validate(user)


# ---------------------------------------------------------------------------
# Approval actions
# ---------------------------------------------------------------------------

@router.put("/admin/users/{user_id}/approve", response_model=MessageResponse)
def approve_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve a pending user so they can log in."""
    _admin_only(current_user)
    user = _get_user_or_404(user_id, db)
    user.is_approved = True
    user.is_active = True
    db.commit()
    return MessageResponse(success=True, message=f"User '{user.username}' approved")


@router.put("/admin/users/{user_id}/reject", response_model=MessageResponse)
def reject_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reject / unapprove a user."""
    _admin_only(current_user)
    user = _get_user_or_404(user_id, db)
    user.is_approved = False
    db.commit()
    return MessageResponse(success=True, message=f"User '{user.username}' rejected")


# ---------------------------------------------------------------------------
# Status management
# ---------------------------------------------------------------------------

@router.put("/admin/users/{user_id}/disable", response_model=MessageResponse)
def disable_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disable a user account (is_active=False). Data is preserved."""
    _admin_only(current_user)
    user = _get_user_or_404(user_id, db)
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already disabled",
        )
    user.is_active = False
    db.commit()
    return MessageResponse(success=True, message=f"User '{user.username}' disabled")


@router.put("/admin/users/{user_id}/enable", response_model=MessageResponse)
def enable_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-enable a disabled user account (is_active=True)."""
    _admin_only(current_user)
    user = _get_user_or_404(user_id, db)
    if user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already enabled",
        )
    user.is_active = True
    db.commit()
    return MessageResponse(success=True, message=f"User '{user.username}' enabled")


@router.put("/admin/users/{user_id}/ban", response_model=MessageResponse)
def ban_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ban a user: deactivate + unapprove so they cannot log in."""
    _admin_only(current_user)
    user = _get_user_or_404(user_id, db)
    user.is_active = False
    user.is_approved = False
    db.commit()
    return MessageResponse(success=True, message=f"User '{user.username}' banned")


@router.put("/admin/users/{user_id}/set-ban-duration", response_model=MessageResponse)
def set_ban_duration(
    user_id: str,
    body: BanDurationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set a timed ban on a user."""
    _admin_only(current_user)
    user = _get_user_or_404(user_id, db)

    now = datetime.utcnow()
    if body.ban_until <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ban_until must be a future datetime",
        )

    user.banned_until = body.ban_until
    user.is_active = False
    user.is_approved = False
    db.commit()

    return MessageResponse(
        success=True,
        message=f"User '{user.username}' banned until {body.ban_until.isoformat()}",
    )


@router.delete("/admin/users/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete a user from the database."""
    _admin_only(current_user)
    user = _get_user_or_404(user_id, db)

    # Prevent self-deletion
    if str(user.id) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    db.delete(user)
    db.commit()
    return MessageResponse(success=True, message=f"User '{user.username}' permanently deleted")
