from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.session import get_db
from app.models.notification import Notification, NotificationType, NotificationPriority
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()


class NotificationResponse:
    """Basic notification response schema (inline)."""
    def __init__(self, notification: Notification):
        self.id = str(notification.id)
        self.user_id = str(notification.user_id)
        self.notification_type = notification.notification_type.value if hasattr(notification.notification_type, 'value') else notification.notification_type
        self.priority = notification.priority.value if hasattr(notification.priority, 'value') else notification.priority
        self.title = notification.title
        self.message = notification.message
        self.is_read = notification.is_read
        self.link = notification.link
        self.client_id = str(notification.client_id) if notification.client_id else None
        self.task_id = str(notification.task_id) if notification.task_id else None
        self.created_at = notification.created_at.isoformat() if notification.created_at else None


@router.get("", response_model=List[dict])
async def get_notifications(
    is_read: Optional[bool] = None,
    notification_type: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    skip: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get notifications for the current user."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    if notification_type:
        query = query.filter(Notification.notification_type == notification_type)

    notifications = (
        query
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [NotificationResponse(n).__dict__ for n in notifications]


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get unread notification count for the current user."""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )
    return {"count": count}


@router.patch("/{notification_id}/read", response_model=dict)
async def mark_as_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    notification.is_read = True
    notification.updated_at = datetime.utcnow() if hasattr(notification, 'updated_at') else None
    db.commit()
    return {"status": "ok", "message": "Notification marked as read"}


@router.patch("/read-all", response_model=dict)
async def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    result = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return {"status": "ok", "message": f"{result} notifications marked as read"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification."""
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    db.delete(notification)
    db.commit()


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def clear_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear (delete) all read notifications for the current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == True,
    ).delete(synchronize_session=False)
    db.commit()
