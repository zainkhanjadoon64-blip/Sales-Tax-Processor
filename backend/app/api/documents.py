import uuid
import os
import hashlib
import calendar
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID

from app.db.session import get_db
from app.models.document import (
    Document, DocumentType, DocumentCategory, FilingStatus,
    DocumentActivityLog, DocumentActivityType, SavedFilter
)
from app.models.client import Client
from app.models.user import User
from app.api.deps import get_current_active_user
from app.core.config import settings
from app.services.document_classifier import classify_document, generate_standardized_filename
from app.services.folder_service import get_folder_for_category, move_document_file, copy_document_file
from app.services import blob_storage

router = APIRouter()

# ============================================================================
# Pydantic Response Models
# ============================================================================

class DocumentResponse(BaseModel):
    id: UUID
    client_id: UUID
    file_name: str
    original_file_name: str
    file_extension: str
    file_size: int
    file_path: str
    file_type: str
    doc_category: Optional[str] = None
    classification_method: Optional[str] = None
    classification_confidence: Optional[float] = None
    tax_year: Optional[int] = None
    tax_month: Optional[int] = None
    filing_status: Optional[str] = None
    is_missing: bool = False
    document_date: Optional[str] = None
    expiry_date: Optional[str] = None
    upload_date: str
    uploaded_by: Optional[UUID] = None
    is_deleted: bool = False
    version: int = 1
    parent_document_id: Optional[UUID] = None
    notes: Optional[str] = None
    tags: Optional[list] = None
    batch_id: Optional[UUID] = None
    checksum: Optional[str] = None
    created_at: str
    updated_at: str
    # Joined fields
    client_name: Optional[str] = None
    client_ntn: Optional[str] = None
    client_cnic: Optional[str] = None
    uploader_name: Optional[str] = None

    class Config:
        from_attributes = True

class DocumentListResponse(BaseModel):
    success: bool
    data: list
    total: int
    page: int
    limit: int
    total_pages: int

class DocumentStatsResponse(BaseModel):
    success: bool
    data: dict

class RenameRequest(BaseModel):
    file_name: str

class MoveRequest(BaseModel):
    client_id: UUID
    folder_path: str

class CopyRequest(BaseModel):
    client_id: UUID
    folder_path: str

class BatchDeleteRequest(BaseModel):
    ids: list[UUID]

class BatchMoveRequest(BaseModel):
    ids: list[UUID]
    client_id: UUID
    folder_path: str

class BatchCopyRequest(BaseModel):
    ids: list[UUID]
    client_id: UUID
    folder_path: str

class NotesRequest(BaseModel):
    notes: str

class ActivityRequest(BaseModel):
    activity_type: str
    metadata: Optional[dict] = None

class BulkUploadResponse(BaseModel):
    success: list
    errors: list
    skipped: list

# ============================================================================
# Constants
# ============================================================================

ALLOWED_EXTENSIONS = {'.pdf', '.xlsx', '.xls'}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB

MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]


# ============================================================================
# Helper Functions
# ============================================================================

def get_file_type(extension: str) -> str:
    ext = extension.lower()
    if ext == '.pdf':
        return DocumentType.PDF.value
    elif ext in ('.xlsx', '.xls'):
        return DocumentType.EXCEL.value
    return DocumentType.OTHER.value


def document_to_response(doc: Document, db: Session) -> dict:
    """Convert Document model to response dict with joined fields."""
    client_name = None
    client_ntn = None
    client_cnic = None
    uploader_name = None

    if doc.client:
        client_name = doc.client.client_name
        client_ntn = doc.client.ntn
        client_cnic = doc.client.cnic
    if doc.uploader:
        uploader_name = doc.uploader.full_name

    return {
        "id": doc.id,
        "client_id": doc.client_id,
        "file_name": doc.file_name,
        "original_file_name": doc.original_file_name,
        "file_extension": doc.file_extension,
        "file_size": doc.file_size,
        "file_path": doc.file_path,
        "file_type": doc.file_type.value if doc.file_type else "Other",
        "doc_category": doc.doc_category.value if doc.doc_category else None,
        "classification_method": doc.classification_method,
        "classification_confidence": doc.classification_confidence,
        "tax_year": doc.tax_year,
        "tax_month": doc.tax_month,
        "filing_status": doc.filing_status.value if doc.filing_status else None,
        "is_missing": doc.is_missing or False,
        "document_date": doc.document_date.isoformat() if doc.document_date else None,
        "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
        "upload_date": doc.upload_date.isoformat() if doc.upload_date else "",
        "uploaded_by": doc.uploaded_by,
        "is_deleted": doc.is_deleted or False,
        "version": doc.version or 1,
        "parent_document_id": doc.parent_document_id,
        "notes": doc.notes,
        "tags": doc.tags or [],
        "batch_id": doc.batch_id,
        "checksum": doc.checksum,
        "created_at": doc.created_at.isoformat() if doc.created_at else "",
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else "",
        "client_name": client_name,
        "client_ntn": client_ntn,
        "client_cnic": client_cnic,
        "uploader_name": uploader_name,
    }


def compute_checksum(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def log_activity(
    db: Session,
    document_id: UUID,
    activity_type: DocumentActivityType,
    user_id: Optional[UUID] = None,
    metadata: Optional[dict] = None,
):
    """Log a document activity."""
    entry = DocumentActivityLog(
        document_id=document_id,
        user_id=user_id,
        activity_type=activity_type,
        activity_metadata=metadata or {},
        created_at=datetime.utcnow(),
    )
    db.add(entry)


def validate_folder_path(folder_path: str) -> Path:
    """Validate that a user-supplied folder_path does not escape the storage directory.

    Resolves the folder_path against the storage base path and verifies
    the resulting path is within the allowed storage directory.

    Raises HTTPException(400) if the path escapes or is invalid.
    """
    storage_base = Path(settings.STORAGE_PATH).resolve()
    # Normalize path separators and strip leading/trailing slashes
    normalized = folder_path.replace("\\", "/").strip("/")
    new_folder = (storage_base / normalized).resolve()

    # Verify the resolved path is within the storage directory
    try:
        new_folder.relative_to(storage_base)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid folder path: path escapes the storage directory"
        )

    return new_folder


# ============================================================================
# Upload Endpoints
# ============================================================================

@router.post("/upload", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    client_id: UUID = Form(...),
    document_type: Optional[str] = Form(None),
    tax_year: Optional[int] = Form(None),
    tax_month: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Client/document IDs are stored as VARCHAR; coerce the parsed UUID to str
    # so PostgreSQL does not attempt a varchar = uuid comparison.
    client_id = str(client_id)

    # Validate client
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF, XLSX, XLS files allowed")

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 25MB limit")

    f_type = get_file_type(file_ext)

    # Classify document
    classification = classify_document(
        file_name=file.filename,
        manual_category=document_type,
    )

    # Determine tax period from current date if not provided
    now = datetime.now()
    final_year = tax_year or now.year
    final_month = tax_month or now.month

    # Generate standardized filename
    file_name = generate_standardized_filename(
        client_name=client.client_name,
        ntn=client.ntn,
        category=classification.category,
        tax_year=final_year,
        tax_month=final_month,
        original_ext=file_ext,
    )

    # Get target folder
    folder_path = get_folder_for_category(
        client_name=client.client_name,
        category=classification.category.value,
        tax_year=final_year,
    )

    # Persist the file. When Blob storage is configured (e.g. on Vercel) the file
    # is uploaded to Vercel Blob and file_path holds the blob URL; otherwise it is
    # written to the local filesystem with version-suffix collision handling.
    if blob_storage.is_enabled():
        blob_key = f"{folder_path}/{file_name}"
        file_full_path = blob_storage.upload_bytes(blob_key, content, content_type=file.content_type)
    else:
        file_full_path = os.path.join(str(folder_path), file_name)
        if os.path.exists(file_full_path):
            stem, ext = os.path.splitext(file_name)
            counter = 1
            while os.path.exists(os.path.join(str(folder_path), f"{stem}_v{counter}{ext}")):
                counter += 1
            file_name = f"{stem}_v{counter}{ext}"
            file_full_path = os.path.join(str(folder_path), file_name)
        os.makedirs(folder_path, exist_ok=True)
        with open(file_full_path, "wb") as f:
            f.write(content)

    # Determine filing status
    filing_status = FilingStatus.UPLOADED

    # Save metadata
    document = Document(
        client_id=client_id,
        file_name=file_name,
        original_file_name=file.filename,
        file_extension=file_ext,
        file_size=len(content),
        file_path=file_full_path,
        file_type=DocumentType(f_type),
        doc_category=classification.category,
        classification_method=classification.method,
        classification_confidence=classification.confidence,
        tax_year=final_year,
        tax_month=final_month,
        filing_status=filing_status,
        uploaded_by=current_user.id,
        checksum=compute_checksum(content),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    # Log activity
    log_activity(db, document.id, DocumentActivityType.UPLOAD, current_user.id)
    db.commit()

    return document_to_response(document, db)


@router.post("/upload/batch", response_model=dict)
async def upload_batch(
    files: list[UploadFile] = File(...),
    client_id: UUID = Form(...),
    doc_category: Optional[str] = Form(None),
    tax_year: Optional[int] = Form(None),
    tax_month: Optional[int] = Form(None),
    overwrite: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Client/document IDs are stored as VARCHAR; coerce parsed UUIDs to str.
    client_id = str(client_id)

    # Validate client
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    results = {"success": [], "errors": [], "skipped": []}
    batch_id = str(uuid.uuid4())
    now = datetime.now()

    for upload_file in files:
        try:
            file_ext = os.path.splitext(upload_file.filename)[1].lower()

            if file_ext not in ALLOWED_EXTENSIONS:
                results["errors"].append({
                    "file_name": upload_file.filename,
                    "error": "File type not allowed. Only PDF, XLSX, XLS supported."
                })
                continue

            content = await upload_file.read()
            if len(content) > MAX_FILE_SIZE:
                results["errors"].append({
                    "file_name": upload_file.filename,
                    "error": "File exceeds 25MB limit."
                })
                continue

            f_type = get_file_type(file_ext)

            # Classify
            classification = classify_document(
                file_name=upload_file.filename,
                manual_category=doc_category,
            )

            final_year = tax_year or now.year
            final_month = tax_month or now.month

            file_name = generate_standardized_filename(
                client_name=client.client_name,
                ntn=client.ntn,
                category=classification.category,
                tax_year=final_year,
                tax_month=final_month,
                original_ext=file_ext,
            )

            folder_path = get_folder_for_category(
                client_name=client.client_name,
                category=classification.category.value,
                tax_year=final_year,
            )

            if blob_storage.is_enabled():
                blob_key = f"{folder_path}/{file_name}"
                file_full_path = blob_storage.upload_bytes(blob_key, content, content_type=upload_file.content_type)
            else:
                file_full_path = os.path.join(str(folder_path), file_name)
                # Handle existing file
                if os.path.exists(file_full_path):
                    if not overwrite:
                        stem, ext = os.path.splitext(file_name)
                        counter = 1
                        while os.path.exists(os.path.join(str(folder_path), f"{stem}_v{counter}{ext}")):
                            counter += 1
                        file_name = f"{stem}_v{counter}{ext}"
                        file_full_path = os.path.join(str(folder_path), file_name)

                os.makedirs(folder_path, exist_ok=True)
                with open(file_full_path, "wb") as f:
                    f.write(content)

            document = Document(
                client_id=client_id,
                file_name=file_name,
                original_file_name=upload_file.filename,
                file_extension=file_ext,
                file_size=len(content),
                file_path=file_full_path,
                file_type=DocumentType(f_type),
                doc_category=classification.category,
                classification_method=classification.method,
                classification_confidence=classification.confidence,
                tax_year=final_year,
                tax_month=final_month,
                filing_status=FilingStatus.UPLOADED,
                uploaded_by=current_user.id,
                batch_id=batch_id,
                checksum=compute_checksum(content),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(document)
            db.commit()
            db.refresh(document)

            log_activity(db, document.id, DocumentActivityType.UPLOAD, current_user.id, {"batch": str(batch_id)})
            db.commit()

            results["success"].append(document_to_response(document, db))

        except Exception as e:
            results["errors"].append({
                "file_name": upload_file.filename,
                "error": str(e)
            })

    return results


# ============================================================================
# List / Read Endpoints
# ============================================================================

@router.get("/", response_model=DocumentListResponse)
def get_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    client_id: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    doc_category: Optional[str] = Query(None),
    tax_year: Optional[int] = Query(None),
    tax_month: Optional[str] = Query(None),
    filing_status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    is_missing: Optional[bool] = Query(None),
    sort_by: str = Query("upload_date"),
    sort_order: str = Query("desc"),
    folder_path: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Document).filter(Document.is_deleted == False)

    # Client filter (supports comma-separated IDs)
    if client_id:
        ids = [uid.strip() for uid in client_id.split(",") if uid.strip()]
        if ids:
            query = query.filter(Document.client_id.in_(ids))

    # File type
    if file_type:
        query = query.filter(Document.file_type == file_type)

    # Category filter (comma-separated)
    if doc_category:
        cats = [c.strip() for c in doc_category.split(",") if c.strip()]
        if cats:
            query = query.filter(Document.doc_category.in_(cats))

    # Tax year
    if tax_year:
        query = query.filter(Document.tax_year == tax_year)

    # Tax month (comma-separated)
    if tax_month:
        months = [int(m.strip()) for m in tax_month.split(",") if m.strip().isdigit()]
        if months:
            query = query.filter(Document.tax_month.in_(months))

    # Filing status
    if filing_status:
        query = query.filter(Document.filing_status == filing_status)

    # Missing filter
    if is_missing:
        query = query.filter(Document.is_missing == True)

    # Text search
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            (Document.file_name.ilike(search_term)) |
            (Document.original_file_name.ilike(search_term)) |
            (Document.notes.ilike(search_term)) |
            (Document.doc_category.ilike(search_term))
        )

    # Folder path filter
    if folder_path:
        normalized = folder_path.replace("\\", "/").strip("/")
        db_path_pattern = normalized.replace("/", "\\")
        query = query.filter(Document.file_path.ilike(f"%{db_path_pattern}%"))

    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)

    # Sorting
    sort_column_map = {
        "upload_date": Document.upload_date,
        "file_name": Document.file_name,
        "file_size": Document.file_size,
        "doc_category": Document.doc_category,
        "filing_status": Document.filing_status,
    }
    sort_col = sort_column_map.get(sort_by, Document.upload_date)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    documents = query.offset((page - 1) * limit).limit(limit).all()

    return DocumentListResponse(
        success=True,
        data=[document_to_response(d, db) for d in documents],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/stats", response_model=dict)
def get_document_stats(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    now = datetime.utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Previous month
    if first_of_month.month == 1:
        prev_month_start = first_of_month.replace(year=first_of_month.year - 1, month=12)
    else:
        prev_month_start = first_of_month.replace(month=first_of_month.month - 1)

    base_query = db.query(Document).filter(Document.is_deleted == False)
    if client_id:
        base_query = base_query.filter(Document.client_id == str(client_id))

    total = base_query.count()
    total_pdf = base_query.filter(Document.file_type == DocumentType.PDF).count()
    total_excel = base_query.filter(Document.file_type == DocumentType.EXCEL).count()

    # Recent uploads (24h and 7d)
    from datetime import timedelta
    yesterday = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)
    recent_24h = base_query.filter(Document.upload_date >= yesterday).count()
    recent_7d = base_query.filter(Document.upload_date >= week_ago).count()

    # Missing documents
    missing = base_query.filter(Document.is_missing == True).count()

    # Uploads this month vs previous
    uploads_this_month = base_query.filter(Document.upload_date >= first_of_month).count()
    uploads_prev_month = base_query.filter(
        Document.upload_date >= prev_month_start,
        Document.upload_date < first_of_month,
    ).count()

    # Monthly trend (last 6 months)
    monthly_trend = []
    for i in range(5, -1, -1):
        month_date = now.month - i
        month_year = now.year
        while month_date <= 0:
            month_date += 12
            month_year -= 1
        m_start = datetime(month_year, month_date, 1)
        if month_date == 12:
            m_end = datetime(month_year + 1, 1, 1)
        else:
            m_end = datetime(month_year, month_date + 1, 1)
        count = base_query.filter(
            Document.upload_date >= m_start,
            Document.upload_date < m_end,
        ).count()
        monthly_trend.append({
            "month": f"{month_year}-{month_date:02d}",
            "count": count,
        })

    # Clients with gaps
    from app.models.client import Client
    clients_with_gaps = (
        db.query(func.count(func.distinct(Document.client_id)))
        .filter(Document.is_missing == True, Document.is_deleted == False)
        .scalar() or 0
    )

    return {
        "success": True,
        "data": {
            "total_documents": total,
            "total_pdf": total_pdf,
            "total_excel": total_excel,
            "recent_uploads_24h": recent_24h,
            "recent_uploads_7d": recent_7d,
            "missing_documents": missing,
            "uploads_this_month": uploads_this_month,
            "uploads_previous_month": uploads_prev_month,
            "monthly_trend": monthly_trend,
            "total_clients_with_gaps": clients_with_gaps,
        }
    }


@router.get("/search")
def search_documents(
    q: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    client_id: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    doc_category: Optional[str] = Query(None),
    tax_year: Optional[int] = Query(None),
    filing_status: Optional[str] = Query(None),
    sort_by: str = Query("upload_date"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Use tsvector search if available, otherwise ILIKE
    query = (
        db.query(Document)
        .filter(Document.is_deleted == False)
    )

    if q:
        # Try full-text search first
        try:
            from sqlalchemy import text
            ts_query = text(
                "to_tsquery('english', :query)"
            )
            query = query.filter(
                Document.search_vector.isnot(None)
            ).order_by(
                func.ts_rank(Document.search_vector, ts_query).desc()
            )
        except Exception:
            # Fallback to ILIKE
            search_term = f"%{q}%"
            query = query.filter(
                (Document.file_name.ilike(search_term)) |
                (Document.original_file_name.ilike(search_term)) |
                (Document.notes.ilike(search_term))
            )

    # Apply filters
    if client_id:
        ids = [uid.strip() for uid in client_id.split(",") if uid.strip()]
        if ids:
            query = query.filter(Document.client_id.in_(ids))
    if file_type:
        query = query.filter(Document.file_type == file_type)
    if doc_category:
        cats = [c.strip() for c in doc_category.split(",") if c.strip()]
        if cats:
            query = query.filter(Document.doc_category.in_(cats))
    if tax_year:
        query = query.filter(Document.tax_year == tax_year)
    if filing_status:
        query = query.filter(Document.filing_status == filing_status)

    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)

    documents = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "success": True,
        "data": [document_to_response(d, db) for d in documents],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


@router.get("/{document_id}")
def get_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document_to_response(document, db)


@router.patch("/{document_id}")
def update_document(
    document_id: UUID,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Allow updating these fields
    allowed_fields = [
        'doc_category', 'tax_year', 'tax_month', 'filing_status',
        'notes', 'is_missing', 'document_date', 'expiry_date', 'tags',
    ]
    for field_name in allowed_fields:
        if field_name in data:
            setattr(document, field_name, data[field_name])

    # If category changed, update classification
    if 'doc_category' in data:
        document.classification_method = 'manual'
        document.classification_confidence = 1.0

    document.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(document)
    return document_to_response(document, db)


# ============================================================================
# Action Endpoints
# ============================================================================

@router.get("/{document_id}/download")
def download_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Log download activity
    log_activity(db, document.id, DocumentActivityType.DOWNLOAD, current_user.id)
    db.commit()

    disposition = f"attachment; filename=\"{document.original_file_name}\""

    if blob_storage.is_blob_url(document.file_path):
        try:
            content = blob_storage.download_bytes(document.file_path)
        except Exception:
            raise HTTPException(status_code=404, detail="File not found in storage")
        return Response(
            content=content,
            media_type='application/octet-stream',
            headers={"Content-Disposition": disposition},
        )

    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=document.file_path,
        filename=document.original_file_name,
        media_type='application/octet-stream',
        headers={"Content-Disposition": disposition}
    )


@router.get("/{document_id}/preview")
def preview_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Log preview activity
    log_activity(db, document.id, DocumentActivityType.PREVIEW, current_user.id)
    db.commit()

    # Set proper media type for inline preview
    ext = (document.file_extension or Path(document.file_path).suffix or "").lower()
    media_type_map = {
        DocumentType.PDF: 'application/pdf',
        DocumentType.EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        DocumentType.WORD: 'application/msword',
    }
    image_ext_map = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp'}
    if document.file_type == DocumentType.IMAGE:
        media_type = image_ext_map.get(ext, 'application/octet-stream')
    else:
        media_type = media_type_map.get(document.file_type, 'application/octet-stream')

    disposition = f"inline; filename=\"{document.original_file_name}\""

    if blob_storage.is_blob_url(document.file_path):
        try:
            content = blob_storage.download_bytes(document.file_path)
        except Exception:
            raise HTTPException(status_code=404, detail="File not found in storage")
        return Response(content=content, media_type=media_type, headers={"Content-Disposition": disposition})

    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=document.file_path,
        filename=document.original_file_name,
        media_type=media_type,
        headers={"Content-Disposition": disposition}
    )


@router.put("/{document_id}/rename")
def rename_document(
    document_id: UUID,
    data: RenameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    old_name = document.file_name
    new_name = data.file_name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="File name cannot be empty")

    # Rename on disk
    old_path = document.file_path
    new_path = os.path.join(os.path.dirname(old_path), new_name)
    if os.path.exists(old_path):
        os.rename(old_path, new_path)

    document.file_name = new_name
    document.file_path = new_path
    document.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(document)

    log_activity(db, document.id, DocumentActivityType.RENAME, current_user.id, {"old_name": old_name, "new_name": new_name})
    db.commit()

    return document_to_response(document, db)


@router.post("/{document_id}/move")
def move_document(
    document_id: UUID,
    data: MoveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    new_client = db.query(Client).filter(Client.id == data.client_id).first()
    if not new_client:
        raise HTTPException(status_code=404, detail="Target client not found")

    try:
        new_folder = validate_folder_path(data.folder_path)
        new_path, new_filename = move_document_file(document.file_path, new_folder)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Source file not found on disk")

    document.client_id = data.client_id
    document.file_path = new_path
    document.file_name = new_filename
    document.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(document)

    log_activity(db, document.id, DocumentActivityType.MOVE, current_user.id, {
        "new_client_id": str(data.client_id),
        "folder_path": data.folder_path,
    })
    db.commit()

    return document_to_response(document, db)


@router.post("/{document_id}/copy")
def copy_document(
    document_id: UUID,
    data: CopyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    new_client = db.query(Client).filter(Client.id == data.client_id).first()
    if not new_client:
        raise HTTPException(status_code=404, detail="Target client not found")

    try:
        new_folder = validate_folder_path(data.folder_path)
        new_path, new_filename = copy_document_file(document.file_path, new_folder)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Source file not found on disk")

    # Create new document record for the copy
    import os
    new_doc = Document(
        client_id=data.client_id,
        file_name=new_filename,
        original_file_name=document.original_file_name,
        file_extension=document.file_extension,
        file_size=document.file_size,
        file_path=new_path,
        file_type=document.file_type,
        doc_category=document.doc_category,
        classification_method='copy',
        classification_confidence=1.0,
        tax_year=document.tax_year,
        tax_month=document.tax_month,
        filing_status=document.filing_status,
        uploaded_by=current_user.id,
        parent_document_id=document.id,
        version=document.version + 1,
        checksum=document.checksum,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    log_activity(db, new_doc.id, DocumentActivityType.COPY, current_user.id, {
        "source_document_id": str(document.id),
    })
    db.commit()

    return document_to_response(new_doc, db)


@router.post("/{document_id}/restore")
def restore_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.is_deleted = False
    document.deleted_at = None
    document.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(document)

    log_activity(db, document.id, DocumentActivityType.RESTORE, current_user.id)
    db.commit()

    return document_to_response(document, db)


# ============================================================================
# Batch Operations
# ============================================================================

@router.post("/batch/delete")
def batch_delete_documents(
    data: BatchDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    count = 0
    for doc_id in data.ids:
        document = db.query(Document).filter(Document.id == doc_id).first()
        if document:
            document.is_deleted = True
            document.deleted_at = datetime.utcnow()
            document.updated_at = datetime.utcnow()
            log_activity(db, document.id, DocumentActivityType.DELETE, current_user.id)
            count += 1

    db.commit()
    return {"success": True, "deleted": count}


@router.post("/batch/move")
def batch_move_documents(
    data: BatchMoveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    count = 0
    for doc_id in data.ids:
        document = db.query(Document).filter(Document.id == doc_id).first()
        if document:
            try:
                new_folder = validate_folder_path(data.folder_path)
                new_path, new_filename = move_document_file(document.file_path, new_folder)
                document.client_id = data.client_id
                document.file_path = new_path
                document.file_name = new_filename
                document.updated_at = datetime.utcnow()
                log_activity(db, document.id, DocumentActivityType.MOVE, current_user.id)
                count += 1
            except Exception:
                pass
    db.commit()
    return {"success": True, "moved": count}


@router.post("/batch/copy")
def batch_copy_documents(
    data: BatchCopyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    count = 0
    for doc_id in data.ids:
        document = db.query(Document).filter(Document.id == doc_id).first()
        if document:
            try:
                new_folder = validate_folder_path(data.folder_path)
                new_path, new_filename = copy_document_file(document.file_path, new_folder)
                new_doc = Document(
                    client_id=data.client_id,
                    file_name=new_filename,
                    original_file_name=document.original_file_name,
                    file_extension=document.file_extension,
                    file_size=document.file_size,
                    file_path=new_path,
                    file_type=document.file_type,
                    doc_category=document.doc_category,
                    classification_method='copy',
                    classification_confidence=1.0,
                    tax_year=document.tax_year,
                    tax_month=document.tax_month,
                    filing_status=document.filing_status,
                    uploaded_by=current_user.id,
                    parent_document_id=document.id,
                    checksum=document.checksum,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(new_doc)
                log_activity(db, document.id, DocumentActivityType.COPY, current_user.id)
                count += 1
            except Exception:
                pass
    db.commit()
    return {"success": True, "copied": count}


# ============================================================================
# Activity & Notes
# ============================================================================

@router.get("/{document_id}/activity")
def get_activity(
    document_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    activities = (
        db.query(DocumentActivityLog)
        .filter(DocumentActivityLog.document_id == document_id)
        .order_by(DocumentActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for a in activities:
        user_name = None
        if a.user and a.user:
            user_name = a.user.full_name
        result.append({
            "id": a.id,
            "document_id": a.document_id,
            "user_id": a.user_id,
            "activity_type": a.activity_type.value if a.activity_type else "",
            "metadata": a.activity_metadata or {},
            "created_at": a.created_at.isoformat() if a.created_at else "",
            "user_name": user_name,
        })

    return result


@router.post("/{document_id}/activity")
def log_document_activity(
    document_id: UUID,
    data: ActivityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        activity_type = DocumentActivityType(data.activity_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid activity type: {data.activity_type}")

    log_activity(db, document_id, activity_type, current_user.id, data.metadata)
    db.commit()
    return {"success": True}


@router.patch("/{document_id}/notes")
def update_notes(
    document_id: UUID,
    data: NotesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.notes = data.notes
    document.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(document)
    return document_to_response(document, db)


# ============================================================================
# Trash
# ============================================================================

@router.get("/trash/list")
def get_trash_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Document).filter(Document.is_deleted == True)
    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)
    documents = (
        query
        .order_by(Document.deleted_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    return {
        "success": True,
        "data": [document_to_response(d, db) for d in documents],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


@router.delete("/trash/empty")
def empty_trash(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    documents = db.query(Document).filter(Document.is_deleted == True).all()
    count = 0
    for doc in documents:
        if doc.file_path and blob_storage.is_blob_url(doc.file_path):
            blob_storage.delete(doc.file_path)
        elif doc.file_path and os.path.exists(doc.file_path):
            os.remove(doc.file_path)
        db.delete(doc)
        count += 1
    db.commit()
    return {"success": True, "deleted": count}


# ============================================================================
# File System Actions
# ============================================================================

import shutil
from pathlib import Path as PathLib

@router.post("/{document_id}/standardize-name")
def standardize_document_name(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Rename the document to {ClientName}-{CNIC}-{DocCategory}-{Year}-{Month} format."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    client = db.query(Client).filter(Client.id == document.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    safe_name = (client.client_name or "Unknown").replace(" ", "_").replace("/", "_").replace("\\", "_")
    cnic_part = (client.cnic or "NOCNIC").replace("-", "")
    category_part = (document.doc_category.value if document.doc_category else "Other").replace(" ", "_")
    year_part = str(document.tax_year or datetime.now().year)
    month_part = f"{document.tax_month or datetime.now().month:02d}"
    ext = document.file_extension

    new_filename = f"{safe_name}-{cnic_part}-{category_part}-{year_part}-{month_part}{ext}"

    # Rename on disk
    old_path = document.file_path
    new_path = os.path.join(os.path.dirname(old_path), new_filename)
    counter = 1
    while os.path.exists(new_path):
        stem, ext2 = os.path.splitext(new_filename)
        new_path = os.path.join(os.path.dirname(old_path), f"{stem}_{counter}{ext2}")
        counter += 1

    if os.path.exists(old_path):
        os.rename(old_path, new_path)

    document.file_name = os.path.basename(new_path)
    document.file_path = new_path
    document.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(document)

    log_activity(db, document.id, DocumentActivityType.RENAME, current_user.id, {
        "old_name": os.path.basename(old_path),
        "new_name": os.path.basename(new_path),
        "method": "standardize"
    })
    db.commit()

    return document_to_response(document, db)


@router.post("/{document_id}/save-to-desktop")
def save_to_desktop(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Copy document to user's desktop in a sales-tax folder."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    desktop = PathLib.home() / "Desktop" / "Sales Tax Documents"
    client_folder = desktop / (document.client_name or "Unknown")
    client_folder.mkdir(parents=True, exist_ok=True)

    dest = client_folder / document.file_name
    counter = 1
    while dest.exists():
        stem, ext = os.path.splitext(document.file_name)
        dest = client_folder / f"{stem}_{counter}{ext}"
        counter += 1

    shutil.copy2(document.file_path, str(dest))

    log_activity(db, document.id, DocumentActivityType.DOWNLOAD, current_user.id, {
        "action": "save_to_desktop",
        "destination": str(dest),
    })
    db.commit()

    return {"success": True, "path": str(dest)}


@router.post("/{document_id}/save-to-client-folder")
def save_to_client_folder(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Copy document into the correct client/year/category folder structure."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    target_folder = get_folder_for_category(
        client_name=document.client_name or "Unknown",
        category=document.doc_category.value if document.doc_category else "Other",
        tax_year=document.tax_year,
    )

    from app.services.folder_service import copy_document_file as copy_file
    new_path, new_filename = copy_file(document.file_path, target_folder)

    log_activity(db, document.id, DocumentActivityType.COPY, current_user.id, {
        "action": "save_to_client_folder",
        "destination": str(new_path),
    })
    db.commit()

    return {"success": True, "path": str(new_path), "file_name": new_filename}


# ============================================================================
# Delete (soft)
# ============================================================================

@router.delete("/{document_id}")
def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.is_deleted = True
    document.deleted_at = datetime.utcnow()
    document.updated_at = datetime.utcnow()
    db.commit()

    log_activity(db, document.id, DocumentActivityType.DELETE, current_user.id)
    db.commit()

    return {"success": True, "message": "Document moved to trash"}
