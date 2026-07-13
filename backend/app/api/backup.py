import os
import shutil
import subprocess
import uuid
import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.db.session import get_db
from app.models.backup import Backup, BackupStatus
from app.api.deps import get_current_active_user
from app.models.user import User
from app.core.config import settings

router = APIRouter()

# On serverless platforms (e.g. Vercel) the project filesystem is read-only;
# only /tmp is writable. Detect that and route backup output there.
_IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
_BACKUP_ROOT = Path("/tmp") if _IS_SERVERLESS else Path(".")

BACKUP_DIR = _BACKUP_ROOT / "backups" / "manual"
STORAGE_DIR = Path(settings.STORAGE_PATH)


class BackupResponse(BaseModel):
    id: str
    backup_name: str
    backup_path: str
    backup_size: Optional[int] = None
    backup_date: str
    status: str

    class Config:
        from_attributes = True


class RestoreResponse(BaseModel):
    success: bool
    message: str


def perform_backup(backup_name: str) -> tuple[str, int, BackupStatus]:
    """Perform actual backup - copies database and storage files."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = backup_name.replace(" ", "_").replace("/", "_")
    backup_dir = BACKUP_DIR / f"{safe_name}_{timestamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Backup database using sqlite3 if SQLite, otherwise pg_dump
        db_path = Path("tax_compliance.db")
        if db_path.exists():
            db_backup_path = backup_dir / "tax_compliance.db"
            shutil.copy2(str(db_path), str(db_backup_path))
        
        # Backup database/init scripts
        db_init_dir = Path("database")
        if db_init_dir.exists():
            db_dest = backup_dir / "database"
            shutil.copytree(str(db_init_dir), str(db_dest), dirs_exist_ok=True)

        # Backup storage folder
        if STORAGE_DIR.exists():
            storage_dest = backup_dir / "storage"
            shutil.copytree(str(STORAGE_DIR), str(storage_dest), dirs_exist_ok=True)

        # Calculate total backup size
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(str(backup_dir)):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                total_size += os.path.getsize(fp)

        return str(backup_dir), total_size, BackupStatus.SUCCESS
    except Exception as e:
        # Cleanup on failure
        if backup_dir.exists():
            shutil.rmtree(str(backup_dir), ignore_errors=True)
        raise e


@router.get("/", response_model=List[BackupResponse])
def list_backups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all backups ordered by date descending."""
    backups = db.query(Backup).order_by(Backup.backup_date.desc()).all()
    return backups


@router.post("/", response_model=BackupResponse, status_code=status.HTTP_201_CREATED)
def create_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new manual backup."""
    backup_name = f"Manual_Backup_{datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}"
    
    try:
        backup_path, backup_size, backup_status = perform_backup(backup_name)
        status_value = backup_status
    except Exception:
        backup_path = ""
        backup_size = 0
        status_value = BackupStatus.FAILED

    backup = Backup(
        id=uuid.uuid4(),
        backup_name=backup_name,
        backup_path=backup_path,
        backup_size=backup_size,
        backup_date=datetime.datetime.utcnow(),
        status=status_value,
    )
    db.add(backup)
    db.commit()
    db.refresh(backup)
    return backup


@router.get("/{backup_id}", response_model=BackupResponse)
def get_backup(
    backup_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get backup details by ID."""
    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    return backup


@router.post("/{backup_id}/restore", response_model=RestoreResponse)
def restore_backup(
    backup_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Restore system from a backup."""
    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    
    backup_path = Path(backup.backup_path)
    if not backup_path.exists():
        raise HTTPException(status_code=404, detail="Backup files not found on disk")
    
    try:
        # Restore database file
        db_backup = backup_path / "tax_compliance.db"
        if db_backup.exists():
            shutil.copy2(str(db_backup), "tax_compliance.db")
        
        # Restore database init
        db_init_backup = backup_path / "database"
        if db_init_backup.exists():
            db_init_dest = Path("database")
            if db_init_dest.exists():
                shutil.rmtree(str(db_init_dest))
            shutil.copytree(str(db_init_backup), str(db_init_dest))
        
        # Restore storage
        storage_backup = backup_path / "storage"
        if storage_backup.exists():
            if STORAGE_DIR.exists():
                shutil.rmtree(str(STORAGE_DIR))
            shutil.copytree(str(storage_backup), str(STORAGE_DIR))
        
        return RestoreResponse(
            success=True,
            message=f"System restored successfully from backup: {backup.backup_name}"
        )
    except Exception as e:
        return RestoreResponse(
            success=False,
            message=f"Restore failed: {str(e)}"
        )


@router.delete("/{backup_id}")
def delete_backup(
    backup_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a backup record and its files."""
    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    
    # Remove backup files
    backup_path = Path(backup.backup_path)
    if backup_path.exists():
        shutil.rmtree(str(backup_path), ignore_errors=True)
    
    db.delete(backup)
    db.commit()
    return {"success": True, "message": "Backup deleted successfully"}
