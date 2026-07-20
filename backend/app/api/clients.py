from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, asc, desc
from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime, date
import csv
import io
from app.db.session import get_db
from app.models.client import Client
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()

class ClientStats(BaseModel):
    total_clients: int
    sales_tax_registered: int
    withholding_registered: int
    kpra_registered: int
    active_clients: int
    new_this_month: int

OPTIONAL_STRING_FIELDS = [
    "business_name", "cnic", "ntn", "strn", "contact_number", "email", "address",
    "client_password", "notes", "contact_person", "contact_person_designation",
    "contact_person_phone", "contact_person_email", "secondary_phone", "city",
    "province", "business_type", "client_type", "tax_period", "fbr_office",
    "registration_date",
]


def sanitize_client_data(data: dict[str, Any]) -> dict[str, Any]:
    """Convert empty strings to None for optional fields."""
    sanitized = dict(data)
    for field in OPTIONAL_STRING_FIELDS:
        if field in sanitized and sanitized[field] == "":
            sanitized[field] = None

    if sanitized.get("registration_date"):
        raw = sanitized["registration_date"]
        if isinstance(raw, date):
            pass
        else:
            try:
                sanitized["registration_date"] = datetime.fromisoformat(str(raw)).date()
            except ValueError:
                sanitized["registration_date"] = None

    return sanitized

class ClientCreate(BaseModel):
    client_name: str
    business_name: Optional[str] = None
    cnic: Optional[str] = None
    ntn: Optional[str] = None
    strn: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    client_password: Optional[str] = None
    sales_tax_registered: bool = False
    withholding_registered: bool = False
    kpra_registered: bool = False
    notes: Optional[str] = None
    sales_tax_material_status: Optional[str] = 'NIL'
    withholding_236_applied: Optional[bool] = False
    withholding_236_prepared_by_us: Optional[bool] = False
    withholding_153_applicable: Optional[bool] = False
    withholding_153_prepared_by_us: Optional[bool] = False
    withholding_filing_frequency: Optional[str] = None
    # New fields
    contact_person: Optional[str] = None
    contact_person_designation: Optional[str] = None
    contact_person_phone: Optional[str] = None
    contact_person_email: Optional[str] = None
    secondary_phone: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    business_type: Optional[str] = None
    client_type: Optional[str] = None
    registration_date: Optional[date] = None
    tax_period: Optional[str] = None
    fbr_office: Optional[str] = None
    is_active: bool = True

class ClientUpdate(BaseModel):
    client_name: Optional[str] = None
    business_name: Optional[str] = None
    cnic: Optional[str] = None
    ntn: Optional[str] = None
    strn: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    client_password: Optional[str] = None
    sales_tax_registered: Optional[bool] = None
    withholding_registered: Optional[bool] = None
    kpra_registered: Optional[bool] = None
    notes: Optional[str] = None
    sales_tax_material_status: Optional[str] = None
    withholding_236_applied: Optional[bool] = None
    withholding_236_prepared_by_us: Optional[bool] = None
    withholding_153_applicable: Optional[bool] = None
    withholding_153_prepared_by_us: Optional[bool] = None
    withholding_filing_frequency: Optional[str] = None
    # New fields
    contact_person: Optional[str] = None
    contact_person_designation: Optional[str] = None
    contact_person_phone: Optional[str] = None
    contact_person_email: Optional[str] = None
    secondary_phone: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    business_type: Optional[str] = None
    client_type: Optional[str] = None
    registration_date: Optional[date] = None
    tax_period: Optional[str] = None
    fbr_office: Optional[str] = None
    is_active: Optional[bool] = None

class ClientResponse(BaseModel):
    id: UUID
    client_name: str
    business_name: Optional[str]
    cnic: Optional[str]
    ntn: Optional[str]
    strn: Optional[str]
    contact_number: Optional[str]
    email: Optional[str]
    address: Optional[str]
    sales_tax_registered: bool
    withholding_registered: bool
    kpra_registered: bool = False
    withholding_filing_frequency: Optional[str] = None
    notes: Optional[str]
    # New fields
    contact_person: Optional[str] = None
    contact_person_designation: Optional[str] = None
    contact_person_phone: Optional[str] = None
    contact_person_email: Optional[str] = None
    secondary_phone: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    business_type: Optional[str] = None
    client_type: Optional[str] = None
    registration_date: Optional[date] = None
    tax_period: Optional[str] = None
    fbr_office: Optional[str] = None
    sales_tax_material_status: str = 'NIL'
    withholding_236_applied: bool = False
    withholding_236_prepared_by_us: bool = False
    withholding_153_applicable: bool = False
    withholding_153_prepared_by_us: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ClientImportResponse(BaseModel):
    success: bool
    imported: int
    errors: List[str]
    updated_at: datetime

    class Config:
        from_attributes = True

class ClientListResponse(BaseModel):
    success: bool
    data: List[ClientResponse]
    total: int
    page: int
    limit: int


class ClientActivityResponse(BaseModel):
    id: str
    client_id: str
    action: str
    action_type: Optional[str] = None
    description: Optional[str] = None
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    performed_by: str
    created_at: datetime


SORTABLE_COLUMNS = {
    "client_name": Client.client_name,
    "business_name": Client.business_name,
    "ntn": Client.ntn,
    "created_at": Client.created_at,
    "city": Client.city,
}


def apply_client_filters(
    query,
    search: Optional[str] = None,
    sales_tax_registered: Optional[bool] = None,
    withholding_registered: Optional[bool] = None,
    kpra_registered: Optional[bool] = None,
    is_active: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Client.client_name.ilike(search_term),
                Client.business_name.ilike(search_term),
                Client.ntn.ilike(search_term),
                Client.cnic.ilike(search_term),
                Client.strn.ilike(search_term),
                Client.email.ilike(search_term),
                Client.contact_number.ilike(search_term),
                Client.city.ilike(search_term),
                Client.contact_person.ilike(search_term),
            )
        )

    if sales_tax_registered is not None:
        query = query.filter(Client.sales_tax_registered == sales_tax_registered)
    if withholding_registered is not None:
        query = query.filter(Client.withholding_registered == withholding_registered)
    if kpra_registered is not None:
        query = query.filter(Client.kpra_registered == kpra_registered)
    if is_active is not None:
        query = query.filter(Client.is_active == is_active)
    if date_from:
        try:
            query = query.filter(Client.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            end = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59)
            query = query.filter(Client.created_at <= end)
        except ValueError:
            pass

    return query


def apply_client_sort(query, sort_by: Optional[str], sort_order: Optional[str]):
    column = SORTABLE_COLUMNS.get(sort_by or "created_at", Client.created_at)
    direction = asc if (sort_order or "desc") == "asc" else desc
    return query.order_by(direction(column))

@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    client_dict = sanitize_client_data(client_data.model_dump())

    # Check for duplicate NTN/CNIC/STRN with field-level error info
    if client_dict.get("ntn"):
        existing = db.query(Client).filter(Client.ntn == client_dict["ntn"]).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "field": "ntn",
                    "message": f"NTN already assigned to '{existing.client_name}'",
                    "conflicting_client_id": str(existing.id),
                    "conflicting_client_name": existing.client_name,
                }
            )
    
    if client_dict.get("cnic"):
        existing = db.query(Client).filter(Client.cnic == client_dict["cnic"]).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "field": "cnic",
                    "message": f"CNIC already assigned to '{existing.client_name}'",
                    "conflicting_client_id": str(existing.id),
                    "conflicting_client_name": existing.client_name,
                }
            )
    
    if client_dict.get("strn"):
        existing = db.query(Client).filter(Client.strn == client_dict["strn"]).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "field": "strn",
                    "message": f"STRN already assigned to '{existing.client_name}'",
                    "conflicting_client_id": str(existing.id),
                    "conflicting_client_name": existing.client_name,
                }
            )
    
    client = Client(**client_dict)
    db.add(client)
    db.commit()
    db.refresh(client)

    # Auto-create filesystem folder structure for this client
    try:
        from app.services.folder_service import ensure_client_folder_structure
        ensure_client_folder_structure(client.client_name)
    except Exception:
        pass  # Non-critical: folder creation should not block client creation

    return client

@router.get("/stats", response_model=ClientStats)
def get_client_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get aggregate statistics for all clients"""
    from datetime import datetime
    from dateutil.relativedelta import relativedelta
    
    total_clients = db.query(Client).count()
    sales_tax_registered = db.query(Client).filter(Client.sales_tax_registered == True).count()
    withholding_registered = db.query(Client).filter(Client.withholding_registered == True).count()
    kpra_registered = db.query(Client).filter(Client.kpra_registered == True).count()
    active_clients = db.query(Client).filter(Client.is_active == True).count()
    
    # Calculate new clients this month
    now = datetime.now()
    first_day_of_month = datetime(now.year, now.month, 1)
    new_this_month = db.query(Client).filter(Client.created_at >= first_day_of_month).count()
    
    return ClientStats(
        total_clients=total_clients,
        sales_tax_registered=sales_tax_registered,
        withholding_registered=withholding_registered,
        kpra_registered=kpra_registered,
        active_clients=active_clients,
        new_this_month=new_this_month
    )

def _parse_bool(val: Optional[str]) -> Optional[bool]:
    if val is None:
        return None
    return val.lower() in ("true", "1", "yes")

@router.get("", response_model=ClientListResponse)
@router.get("/", response_model=ClientListResponse)
def get_clients(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=1000),
    search: Optional[str] = Query(None),
    sales_tax_registered: Optional[str] = Query(None),
    withholding_registered: Optional[str] = Query(None),
    kpra_registered: Optional[str] = Query(None),
    is_active: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
    sort_order: Optional[str] = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Client)
    query = apply_client_filters(
        query, search,
        _parse_bool(sales_tax_registered),
        _parse_bool(withholding_registered),
        _parse_bool(kpra_registered),
        _parse_bool(is_active),
        date_from, date_to
    )
    query = apply_client_sort(query, sort_by, sort_order)

    total = query.count()
    clients = query.offset((page - 1) * limit).limit(limit).all()

    return ClientListResponse(
        success=True,
        data=clients,
        total=total,
        page=page,
        limit=limit
    )


@router.get("/export/csv")
def export_clients_csv(
    search: Optional[str] = Query(None),
    sales_tax_registered: Optional[str] = Query(None),
    withholding_registered: Optional[str] = Query(None),
    kpra_registered: Optional[str] = Query(None),
    is_active: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Client)
    query = apply_client_filters(
        query, search,
        _parse_bool(sales_tax_registered),
        _parse_bool(withholding_registered),
        _parse_bool(kpra_registered),
        _parse_bool(is_active),
        date_from, date_to
    )
    query = apply_client_sort(query, "client_name", "asc")
    clients = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "client_name", "business_name", "ntn", "cnic", "strn", "email", "contact_number",
        "city", "province", "sales_tax_registered", "withholding_registered", "is_active", "created_at"
    ])
    for client in clients:
        writer.writerow([
            client.client_name,
            client.business_name or "",
            client.ntn or "",
            client.cnic or "",
            client.strn or "",
            client.email or "",
            client.contact_number or "",
            client.city or "",
            client.province or "",
            client.sales_tax_registered,
            client.withholding_registered,
            client.is_active,
            client.created_at.isoformat() if client.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=clients-export.csv"},
    )


@router.post("/import", response_model=ClientImportResponse)
async def import_clients(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    content = await file.read()
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    errors: List[str] = []

    for row_num, row in enumerate(reader, start=2):
        client_name = (row.get("client_name") or row.get("Client Name") or "").strip()
        if not client_name:
            errors.append(f"Row {row_num}: client_name is required")
            continue

        client_data = sanitize_client_data({
            "client_name": client_name,
            "business_name": row.get("business_name") or row.get("Business Name"),
            "ntn": row.get("ntn") or row.get("NTN"),
            "cnic": row.get("cnic") or row.get("CNIC"),
            "strn": row.get("strn") or row.get("STRN"),
            "email": row.get("email") or row.get("Email"),
            "contact_number": row.get("contact_number") or row.get("Contact Number"),
            "city": row.get("city") or row.get("City"),
            "province": row.get("province") or row.get("Province"),
        })

        try:
            client = Client(**client_data)
            db.add(client)
            db.flush()
            imported += 1
        except Exception as exc:
            errors.append(f"Row {row_num}: {str(exc)}")

    if imported:
        db.commit()
    else:
        db.rollback()

    return ClientImportResponse(success=imported > 0, imported=imported, errors=errors)

@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    client = db.query(Client).filter(Client.id == str(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.get("/{client_id}/activity", response_model=List[ClientActivityResponse])
def get_client_activity(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    client = db.query(Client).filter(Client.id == str(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    activities = [
        ClientActivityResponse(
            id=str(client.id),
            client_id=str(client.id),
            action="Client created",
            action_type="created",
            description=f"Client {client.client_name} was created",
            field_name=None,
            old_value=None,
            new_value=None,
            performed_by=current_user.username,
            created_at=client.created_at,
        )
    ]

    if client.updated_at and client.updated_at != client.created_at:
        activities.insert(0, ClientActivityResponse(
            id=f"{client.id}-updated",
            client_id=str(client.id),
            action="Client updated",
            action_type="updated",
            description=f"Client {client.client_name} was last updated",
            field_name=None,
            old_value=None,
            new_value=None,
            performed_by=current_user.username,
            created_at=client.updated_at,
        ))

    return sorted(activities, key=lambda a: a.created_at, reverse=True)


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: UUID,
    client_data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    client = db.query(Client).filter(Client.id == str(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = sanitize_client_data(client_data.model_dump(exclude_unset=True))
    
    # Check for duplicates on update with field-level error info
    # and include the conflicting client's details for resolution
    if "ntn" in update_data and update_data["ntn"]:
        existing = db.query(Client).filter(
            Client.ntn == update_data["ntn"],
            Client.id != client_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "field": "ntn",
                    "message": f"NTN already assigned to '{existing.client_name}'",
                    "conflicting_client_id": str(existing.id),
                    "conflicting_client_name": existing.client_name,
                }
            )
    
    if "cnic" in update_data and update_data["cnic"]:
        existing = db.query(Client).filter(
            Client.cnic == update_data["cnic"],
            Client.id != client_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "field": "cnic",
                    "message": f"CNIC already assigned to '{existing.client_name}'",
                    "conflicting_client_id": str(existing.id),
                    "conflicting_client_name": existing.client_name,
                }
            )
    
    if "strn" in update_data and update_data["strn"]:
        existing = db.query(Client).filter(
            Client.strn == update_data["strn"],
            Client.id != client_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "field": "strn",
                    "message": f"STRN already assigned to '{existing.client_name}'",
                    "conflicting_client_id": str(existing.id),
                    "conflicting_client_name": existing.client_name,
                }
            )
    
    for field, value in update_data.items():
        setattr(client, field, value)
    
    db.commit()
    db.refresh(client)
    return client

@router.delete("/{client_id}")
def delete_client(
    client_id: UUID,
    confirm: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    client = db.query(Client).filter(Client.id == str(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    from app.models.sales_tax import SalesTaxRecord
    from app.models.withholding import WithholdingRecord
    from app.models.document import Document
    from app.models.task import Task
    from app.models.notification import Notification
    
    # Count related records
    doc_count = db.query(Document).filter(Document.client_id == client_id).count()
    sales_tax_count = db.query(SalesTaxRecord).filter(SalesTaxRecord.client_id == client_id).count()
    withholding_count = db.query(WithholdingRecord).filter(WithholdingRecord.client_id == client_id).count()
    task_count = db.query(Task).filter(Task.client_id == client_id).count()
    notification_count = db.query(Notification).filter(Notification.client_id == client_id).count()
    
    has_folder: bool = False
    storage_path = None
    try:
        from app.services.folder_service import get_clients_storage
        storage_path = get_clients_storage() / (client.business_name or client.client_name).strip()
        has_folder = storage_path.exists()
    except Exception:
        pass
    
    # If confirm=true and there are related records, delete everything
    if confirm:
        db.query(SalesTaxRecord).filter(SalesTaxRecord.client_id == client_id).delete()
        db.query(WithholdingRecord).filter(WithholdingRecord.client_id == client_id).delete()
        db.query(Document).filter(Document.client_id == client_id).delete()
        # Tasks and notifications use SET NULL, so we can leave them or optionally delete
        db.delete(client)
        db.commit()
        
        # Optionally remove the filesystem folder
        folder_deleted = False
        if has_folder and storage_path:
            try:
                import shutil
                shutil.rmtree(str(storage_path), ignore_errors=True)
                folder_deleted = True
            except Exception:
                pass
        
        return {
            "success": True,
            "message": f"Client '{client.client_name}' and all related records deleted successfully.",
            "details": {
                "documents_deleted": doc_count,
                "sales_tax_records_deleted": sales_tax_count,
                "withholding_records_deleted": withholding_count,
                "folder_deleted": folder_deleted,
            }
        }
    
    # If no related records, delete directly
    if doc_count == 0 and sales_tax_count == 0 and withholding_count == 0:
        db.delete(client)
        db.commit()
        return {"success": True, "message": "Client deleted successfully"}
    
    # Return summary of related records — frontend can show a warning dialog
    raise HTTPException(
        status_code=409,
        detail={
            "message": f"Client '{client.client_name}' has related records.",
            "has_related": True,
            "document_count": doc_count,
            "sales_tax_count": sales_tax_count,
            "withholding_count": withholding_count,
            "task_count": task_count,
            "notification_count": notification_count,
            "has_folder": has_folder,
            "client_name": client.client_name,
        }
    )