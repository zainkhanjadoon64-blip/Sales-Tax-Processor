from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date
from app.db.session import get_db
from app.models.sales_tax import SalesTaxRecord, SalesTaxStatus
from app.models.document import Document
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()

class SalesTaxRecordCreate(BaseModel):
    client_id: UUID
    filing_year: int
    filing_month: int
    status: SalesTaxStatus = SalesTaxStatus.NOT_FILED
    filing_date: Optional[date] = None
    remarks: Optional[str] = None

class SalesTaxRecordUpdate(BaseModel):
    status: Optional[SalesTaxStatus] = None
    filing_date: Optional[date] = None
    remarks: Optional[str] = None

class SalesTaxRecordResponse(BaseModel):
    id: UUID
    client_id: UUID
    filing_year: int
    filing_month: int
    status: SalesTaxStatus
    filing_date: Optional[date]
    remarks: Optional[str]
    document_id: Optional[UUID]

    class Config:
        from_attributes = True

class SalesTaxListResponse(BaseModel):
    success: bool
    data: List[SalesTaxRecordResponse]
    total: int
    page: int
    limit: int

@router.post("/", response_model=SalesTaxRecordResponse, status_code=status.HTTP_201_CREATED)
def create_sales_tax_record(
    client_id: UUID = Form(...),
    filing_year: int = Form(...),
    filing_month: int = Form(...),
    status: SalesTaxStatus = Form(SalesTaxStatus.NOT_FILED),
    filing_date: Optional[str] = Form(None),
    remarks: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if client exists
    from app.models.client import Client
    client = db.query(Client).filter(Client.id == str(client_id)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check for duplicate
    existing = db.query(SalesTaxRecord).filter(
        SalesTaxRecord.client_id == str(client_id),
        SalesTaxRecord.filing_year == filing_year,
        SalesTaxRecord.filing_month == filing_month
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Record for this month already exists")
    
    # Parse filing_date if provided
    filing_date_obj = None
    if filing_date:
        from datetime import datetime
        try:
            filing_date_obj = datetime.strptime(filing_date, "%Y-%m-%d").date()
        except ValueError:
            pass
    
    # Handle file upload if provided
    document_id = None
    if file and file.filename:
        from app.services.file_storage import (
            resolve_sales_tax_folder,
            generate_sales_tax_filename,
            save_file_with_versioning,
        )
        
        # Validate file type
        if not file.filename.lower().endswith(('.pdf', '.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Only PDF or Excel files are accepted")
        
        # Read file bytes
        file_bytes = file.file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Determine folder and filename
        folder = resolve_sales_tax_folder(client.client_name, filing_year)
        ext = "." + file.filename.lower().split(".")[-1]
        filename = generate_sales_tax_filename(
            client_name=client.client_name,
            ntn=client.ntn,
            year=filing_year,
            month=filing_month,
            ext=ext,
        )
        
        # Save file with versioning
        saved_path, saved_filename = save_file_with_versioning(folder, filename, file_bytes)
        
        # Create Document record
        document = Document(
            client_id=client.id,
            original_file_name=file.filename,
            file_name=saved_filename,
            file_extension=ext.lstrip('.'),
            file_size=len(file_bytes),
            file_path=str(saved_path),
            file_type="PDF" if ext.lower() == '.pdf' else "Excel",
            uploaded_by=current_user.id,
        )
        db.add(document)
        db.flush()
        document_id = document.id
    
    # Create sales tax record
    record = SalesTaxRecord(
        client_id=client_id,
        filing_year=filing_year,
        filing_month=filing_month,
        status=status,
        filing_date=filing_date_obj,
        remarks=remarks,
        document_id=document_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/", response_model=SalesTaxListResponse)
def get_sales_tax_records(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
    client_id: Optional[UUID] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    status: Optional[SalesTaxStatus] = Query(None),
    sales_tax_registered_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(SalesTaxRecord)
    
    if client_id:
        query = query.filter(SalesTaxRecord.client_id == str(client_id))
    if year:
        query = query.filter(SalesTaxRecord.filing_year == year)
    if month:
        query = query.filter(SalesTaxRecord.filing_month == month)
    if status:
        query = query.filter(SalesTaxRecord.status == status)
    if sales_tax_registered_only:
        from app.models.client import Client as ClientModel
        query = query.join(ClientModel, ClientModel.id == SalesTaxRecord.client_id)
        query = query.filter(ClientModel.sales_tax_registered == True)
    
    total = query.count()
    records = query.order_by(
        SalesTaxRecord.filing_year.desc(),
        SalesTaxRecord.filing_month.desc()
    ).offset((page - 1) * limit).limit(limit).all()
    
    return SalesTaxListResponse(
        success=True,
        data=records,
        total=total,
        page=page,
        limit=limit
    )

@router.get("/{record_id}", response_model=SalesTaxRecordResponse)
def get_sales_tax_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    record = db.query(SalesTaxRecord).filter(SalesTaxRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@router.put("/{record_id}", response_model=SalesTaxRecordResponse)
def update_sales_tax_record(
    record_id: UUID,
    record_data: SalesTaxRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    record = db.query(SalesTaxRecord).filter(SalesTaxRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    update_data = record_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    
    db.commit()
    db.refresh(record)
    return record

@router.delete("/{record_id}")
def delete_sales_tax_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    record = db.query(SalesTaxRecord).filter(SalesTaxRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    db.delete(record)
    db.commit()
    return {"success": True, "message": "Record deleted successfully"}