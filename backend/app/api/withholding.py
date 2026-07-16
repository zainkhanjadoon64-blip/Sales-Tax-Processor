from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from app.db.session import get_db
from app.models.withholding import WithholdingRecord, WithholdingType
from app.models.document import Document
from app.models.client import Client
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()



class WithholdingRecordCreate(BaseModel):
    client_id: UUID
    section_type: WithholdingType
    period: str
    challan_number: Optional[str] = None
    amount: Decimal
    payment_date: Optional[date] = None
    remarks: Optional[str] = None

class WithholdingRecordUpdate(BaseModel):
    section_type: Optional[WithholdingType] = None
    period: Optional[str] = None
    challan_number: Optional[str] = None
    amount: Optional[Decimal] = None
    payment_date: Optional[date] = None
    remarks: Optional[str] = None

class DocumentInfo(BaseModel):
    id: UUID
    file_name: str
    original_file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None

    class Config:
        from_attributes = True

class WithholdingRecordResponse(BaseModel):
    id: UUID
    client_id: UUID
    client_name: Optional[str] = None
    section_type: WithholdingType
    period: str
    challan_number: Optional[str]
    amount: Decimal
    payment_date: Optional[date]
    payment_section_code: Optional[str] = None
    remarks: Optional[str]
    document_id: Optional[UUID]
    document: Optional[DocumentInfo] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class WithholdingListResponse(BaseModel):
    success: bool
    data: List[WithholdingRecordResponse]
    total: int
    page: int
    limit: int

# --------------- Import Response Types ---------------

class ImportFileInfo(BaseModel):
    saved_path: str
    file_name: str

class ImportClientInfo(BaseModel):
    id: UUID
    client_name: str
    created: bool = False

class ImportRecordInfo(BaseModel):
    id: UUID
    section_type: str
    period: str
    amount: Decimal
    payment_section_code: Optional[str] = None
    document_id: Optional[UUID] = None

class ImportChallanResponse(BaseModel):
    success: bool
    client: ImportClientInfo
    records: List[ImportRecordInfo]
    file: ImportFileInfo
    warnings: List[str] = []

class PendingClientInfo(BaseModel):
    client_name: str
    ntn: Optional[str] = None
    cnic: Optional[str] = None

class WithholdingImportConfirmationClient(BaseModel):
    client_name: str
    ntn: Optional[str] = None
    cnic: Optional[str] = None

class WithholdingImportConfirmationRequest(BaseModel):
    extracted_data: Dict[str, Any]
    approved_new_clients: List[WithholdingImportConfirmationClient]

class ImportStatementResponse(BaseModel):
    success: bool
    rows_processed: int
    rows_failed: int
    clients: List[ImportClientInfo]
    records: List[ImportRecordInfo]
    errors: List[str] = []
    warnings: List[str] = []

class WithholdingImportPreviewResponse(BaseModel):
    success: bool
    detected_type: str
    fields: Optional[Dict[str, Any]] = None
    rows: Optional[List[Dict[str, Any]]] = None
    total_rows: Optional[int] = None
    parsed_rows: Optional[int] = None
    errors: Optional[List[str]] = None
    confidence: Optional[Dict[str, Any]] = None
    pending_clients: Optional[List[PendingClientInfo]] = None


def _parse_approved_new_clients(raw: Optional[str]) -> List[PendingClientInfo]:
    if not raw:
        return []
    try:
        import json
        parsed = json.loads(raw)
        return [PendingClientInfo(**item) for item in parsed]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid approved_new_clients payload")


def _match_approved_client(client_name: Optional[str], ntn: Optional[str], cnic: Optional[str], approved_clients: List[PendingClientInfo]) -> Optional[PendingClientInfo]:
    if not client_name:
        return None
    normalized_name = client_name.strip().upper()
    for approved in approved_clients:
        if approved.client_name.strip().upper() == normalized_name:
            if approved.ntn or approved.cnic:
                if approved.ntn and ntn and approved.ntn == ntn:
                    return approved
                if approved.cnic and cnic and approved.cnic == cnic:
                    return approved
            else:
                return approved
    return None


def _create_client_if_approved(
    db: Session,
    client_name: str,
    ntn: Optional[str],
    cnic: Optional[str],
    approved_clients: List[PendingClientInfo],
):
    from app.models.client import Client
    approved = _match_approved_client(client_name, ntn, cnic, approved_clients)
    if not approved:
        return None

    new_client = Client(
        client_name=approved.client_name.strip(),
        ntn=approved.ntn,
        cnic=approved.cnic,
        withholding_registered=True,
        is_active=True,
    )
    db.add(new_client)
    db.flush()
    db.refresh(new_client)
    return new_client

# --------------- Existing CRUD Endpoints ---------------

@router.post("/", response_model=WithholdingRecordResponse, status_code=status.HTTP_201_CREATED)
def create_withholding_record(
    record_data: WithholdingRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    from app.models.client import Client
    client = db.query(Client).filter(Client.id == record_data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    record = WithholdingRecord(**record_data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/", response_model=WithholdingListResponse)
def get_withholding_records(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    client_id: Optional[UUID] = Query(None),
    section_type: Optional[WithholdingType] = Query(None),
    period: Optional[str] = Query(None),
    withholding_registered_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(WithholdingRecord)
    
    if client_id:
        query = query.filter(WithholdingRecord.client_id == str(client_id))
    if section_type:
        query = query.filter(WithholdingRecord.section_type == section_type)
    if period:
        query = query.filter(WithholdingRecord.period.ilike(f"%{period}%"))
    if withholding_registered_only:
        from app.models.client import Client as ClientModel
        query = query.join(ClientModel, ClientModel.id == WithholdingRecord.client_id)
        query = query.filter(ClientModel.withholding_registered == True)
    
    total = query.count()
    records = query.order_by(WithholdingRecord.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    # Build response with client_name and document info
    response_records = []
    for r in records:
        rec_dict = WithholdingRecordResponse.model_validate(r)
        if r.client:
            rec_dict.client_name = r.client.client_name
        # Populate document info from relationship or explicit query
        if r.document_id and not rec_dict.document:
            doc = db.query(Document).filter(Document.id == r.document_id).first()
            if doc:
                rec_dict.document = DocumentInfo(
                    id=doc.id,
                    file_name=doc.file_name,
                    original_file_name=doc.original_file_name,
                    file_path=doc.file_path,
                    file_size=doc.file_size,
                )
        response_records.append(rec_dict)
    
    return WithholdingListResponse(
        success=True,
        data=response_records,
        total=total,
        page=page,
        limit=limit
    )

@router.get("/{record_id}", response_model=WithholdingRecordResponse)
def get_withholding_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    record = db.query(WithholdingRecord).filter(WithholdingRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@router.put("/{record_id}", response_model=WithholdingRecordResponse)
def update_withholding_record(
    record_id: UUID,
    record_data: WithholdingRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    record = db.query(WithholdingRecord).filter(WithholdingRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    update_data = record_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    
    db.commit()
    db.refresh(record)
    return record

@router.delete("/{record_id}")
def delete_withholding_record(
    record_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    record = db.query(WithholdingRecord).filter(WithholdingRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    db.delete(record)
    db.commit()
    return {"success": True, "message": "Record deleted successfully"}


# --------------- Import Endpoints ---------------

@router.post("/import/challan", response_model=ImportChallanResponse, status_code=status.HTTP_201_CREATED)
def import_withholding_challan(
    file: UploadFile = File(...),
    section_hint: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Import a withholding challan PDF (236H or 153).
    Parses the PDF, matches/creates client, saves file and creates records.
    """
    from app.services.super_parser import parse_pdf
    from app.services.client_resolver import resolve_client
    from app.services.file_storage import (
        resolve_withholding_folder,
        generate_withholding_filename,
        save_file_with_versioning,
    )
    
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted for challan import")
    
    # Read file bytes
    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")
    
    warnings = []
    
    # Parse the challan PDF using super parser
    result = parse_pdf(file_bytes)
    if not result.get("success") or result.get("format") != "challan":
        raise HTTPException(status_code=400, detail="Could not parse challan PDF")
    
    meta = result.get("metadata", {})
    entries = result.get("entries", [])
    if not entries:
        raise HTTPException(status_code=400, detail="No entries found in challan")
    
    entry = entries[0]
    client_name = entry.get("name", "")
    if not client_name:
        raise HTTPException(status_code=400, detail="Could not extract client name from challan PDF")
    
    ntn_str = entry.get("cnicNtn", "")
    is_ntn = bool(re.match(r"^\d{7}-\d$", str(ntn_str)))
    ntn = ntn_str if is_ntn else None
    cnic = ntn_str if re.match(r"^\d{13}$", str(ntn_str)) else None
    
    section = "153" if "153" in meta.get("section", "") else "236H"
    period = meta.get("period", "")
    challan_number = meta.get("challan_number", "")
    amount = Decimal(str(meta.get("total_amount", 0) or 0))
    payment_section_code = meta.get("payment_section_code", "")
    
    payment_date_str = meta.get("payment_date", "")
    payment_date = None
    if payment_date_str:
        try:
            payment_date = datetime.strptime(str(payment_date_str), "%Y-%m-%d").date()
        except ValueError:
            pass
    
    # Resolve or create client
    client, client_created, _ = resolve_client(
        db=db,
        ntn=ntn,
        client_name=client_name,
        cnic=cnic,
    )
    
    # Ensure withholding_registered True
    if not client.withholding_registered:
        client.withholding_registered = True
        db.flush()
    
    # Determine period for filename (fallback to current month)
    if not period:
        period = datetime.now().strftime("%Y-%m")
        warnings.append("Tax period not found in PDF, using current month")
    
    # Resolve folder and generate filename
    folder = resolve_withholding_folder(client.client_name, section)
    ext = ".pdf"
    filename = generate_withholding_filename(
        client_name=client.client_name,
        ntn=client.ntn,
        doc_type=section,
        period=period,
        ext=ext,
    )
    
    # Save file with versioning
    saved_path, saved_filename = save_file_with_versioning(folder, filename, file_bytes)
    
    # Create Document record
    document = Document(
        client_id=client.id,
        original_file_name=file.filename or saved_filename,
        file_name=saved_filename,
        file_extension="pdf",
        file_size=len(file_bytes),
        file_path=str(saved_path),
        file_type="PDF",
        uploaded_by=current_user.id,
    )
    db.add(document)
    db.flush()
    
    # Build remarks
    remarks_parts = ["Imported from challan"]
    if payment_section_code:
        remarks_parts.append(f"Payment Section Code: {payment_section_code}")
    
    # Upsert WithholdingRecord
    existing = db.query(WithholdingRecord).filter(
        WithholdingRecord.client_id == client.id,
        WithholdingRecord.section_type == section,
        WithholdingRecord.period == period,
        WithholdingRecord.challan_number == (challan_number or None),
    ).first()
    
    if existing:
        existing.amount = amount or existing.amount
        existing.payment_date = payment_date or existing.payment_date
        existing.document_id = document.id
        existing.remarks = "\n".join(remarks_parts) + " (updated)"
        db.flush()
        record = existing
        warnings.append(f"Updated existing withholding record (ID: {record.id})")
    else:
        record = WithholdingRecord(
            client_id=client.id,
            section_type=section,
            period=period,
            challan_number=challan_number,
            amount=amount or Decimal("0"),
            payment_date=payment_date,
            document_id=document.id,
            remarks="\n".join(remarks_parts),
        )
        db.add(record)
        db.flush()
    
    db.commit()
    db.refresh(record)
    db.refresh(document)
    
    return ImportChallanResponse(
        success=True,
        client=ImportClientInfo(
            id=client.id,
            client_name=client.client_name,
            created=client_created,
        ),
        records=[ImportRecordInfo(
            id=record.id,
            section_type=str(record.section_type.value) if hasattr(record.section_type, 'value') else str(record.section_type),
            period=record.period,
            amount=record.amount,
            payment_section_code=record.payment_section_code,
            document_id=document.id,
        )],
        file=ImportFileInfo(
            saved_path=str(saved_path),
            file_name=saved_filename,
        ),
        warnings=warnings,
    )


@router.post("/import/statement", response_model=ImportStatementResponse, status_code=status.HTTP_201_CREATED)
def import_withholding_statement(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Import a withholding statement (PDF or Excel).
    Extracts multiple rows and creates/updates withholding records.
    """
    from app.services.statement_parser import parse_statement
    from app.services.client_resolver import resolve_client
    from app.services.file_storage import (
        resolve_withholding_folder,
        generate_withholding_filename,
        save_file_with_versioning,
    )
    
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    lower = file.filename.lower()
    if not (lower.endswith(".pdf") or lower.endswith(".xlsx") or lower.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Only PDF or Excel files (.xlsx, .xls) are accepted for statement import")
    
    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")
    
    # Parse the statement
    parse_result = parse_statement(file_bytes, file.filename)
    
    if parse_result.errors and not parse_result.rows:
        raise HTTPException(status_code=400, detail=f"Failed to parse statement: {'; '.join(parse_result.errors[:5])}")
    
    if not parse_result.rows:
        raise HTTPException(status_code=400, detail="No valid data rows found in statement")
    
    clients_map = {}  # client_id -> ImportClientInfo
    client_records_map = {}  # client_id -> list of WithholdingRecord IDs
    records_list = []
    all_errors = list(parse_result.errors)
    all_warnings = []
    
    for extract in parse_result.rows:
        try:
            if not extract.ntn and not extract.client_name:
                all_errors.append(f"Row {extract.line_number}: Missing NTN and client name, skipping")
                continue
            
            # Resolve or create client
            client, client_created, _ = resolve_client(
                db=db,
                ntn=extract.ntn,
                client_name=extract.client_name,
            )
            
            # Ensure withholding_registered
            if not client.withholding_registered:
                client.withholding_registered = True
                db.flush()
            
            # Track client in map
            if client.id not in clients_map:
                clients_map[client.id] = ImportClientInfo(
                    id=client.id,
                    client_name=client.client_name,
                    created=client_created,
                )
                client_records_map[client.id] = []
            elif client_created:
                clients_map[client.id].created = True
            
            section = extract.section_type or "236H"
            period = extract.period
            if not period:
                from datetime import datetime
                period = datetime.now().strftime("%Y-%m")
                extract.warnings.append("Period not found, using current month")
            
            # Upsert WithholdingRecord
            existing = db.query(WithholdingRecord).filter(
                WithholdingRecord.client_id == client.id,
                WithholdingRecord.section_type == section,
                WithholdingRecord.period == period,
                WithholdingRecord.challan_number == (extract.challan_number or None),
            ).first()
            
            if existing:
                existing.amount = extract.amount or existing.amount
                existing.payment_date = extract.payment_date or existing.payment_date
                existing.remarks = "Imported from statement (updated)"
                db.flush()
                record = existing
            else:
                record = WithholdingRecord(
                    client_id=client.id,
                    section_type=section,  # type: ignore
                    period=period,
                    challan_number=extract.challan_number,
                    amount=extract.amount or Decimal("0"),
                    payment_date=extract.payment_date,
                    remarks="Imported from statement",
                )
                db.add(record)
                db.flush()
            
            # Track which records belong to which client
            client_records_map[client.id].append(record.id)
            
            records_list.append(ImportRecordInfo(
                id=record.id,
                section_type=str(record.section_type.value) if hasattr(record.section_type, 'value') else str(record.section_type),
                period=record.period,
                amount=record.amount,
            ))
            
            all_warnings.extend(extract.warnings)
            
        except Exception as e:
            all_errors.append(f"Row {extract.line_number}: {str(e)}")
    
    # Save file to each unique client's folder and create Document records
    client_documents_map = {}  # client_id -> document_id
    if clients_map:
        from app.models.client import Client as ClientModel
        
        for client_id in clients_map.keys():
            client = db.query(ClientModel).filter(ClientModel.id == client_id).first()
            if not client:
                continue
            
            # Determine folder and filename for this client
            folder = resolve_withholding_folder(client.client_name, "Statements")
            ext = ".pdf" if file.filename.lower().endswith(".pdf") else ".xlsx"
            
            # Use period from first row of this client if available
            period_for_filename = "0000-00"
            for extract in parse_result.rows:
                if extract.client_name == client.client_name and extract.period:
                    period_for_filename = extract.period
                    break
            
            filename = generate_withholding_filename(
                client_name=client.client_name,
                ntn=client.ntn,
                doc_type="STATEMENT",
                period=period_for_filename,
                ext=ext,
            )
            
            # Save file with versioning
            saved_path, saved_filename = save_file_with_versioning(folder, filename, file_bytes)
            
            # Create Document record for this client
            doc_ext = file.filename.lower().split(".")[-1] if "." in file.filename else "pdf"
            document = Document(
                client_id=client.id,
                original_file_name=file.filename or saved_filename,
                file_name=saved_filename,
                file_extension=doc_ext,
                file_size=len(file_bytes),
                file_path=str(saved_path),
                file_type="PDF" if file.filename.lower().endswith(".pdf") else "Excel",
                uploaded_by=current_user.id,
            )
            db.add(document)
            db.flush()
            client_documents_map[client.id] = document.id
    
    db.commit()
    
    # Link each WithholdingRecord to its client's Document
    for client_id, record_ids in client_records_map.items():
        document_id = client_documents_map.get(client_id)
        if document_id:
            for record_id in record_ids:
                rec = db.query(WithholdingRecord).filter(WithholdingRecord.id == record_id).first()
                if rec and not rec.document_id:
                    rec.document_id = document_id
    db.commit()
    
    return ImportStatementResponse(
        success=True,
        rows_processed=parse_result.parsed_rows,
        rows_failed=len(all_errors),
        clients=list(clients_map.values()),
        records=records_list,
        errors=all_errors,
        warnings=all_warnings,
    )


@router.post("/import/challan/bulk", response_model=List[ImportChallanResponse], status_code=status.HTTP_201_CREATED)
def import_withholding_challan_bulk(
    files: List[UploadFile] = File(...),
    section_hint: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Import multiple 236H challan PDFs in bulk.
    Each file is processed independently; partial failures don't block others.
    """
    results = []
    for file in files:
        try:
            # Read file bytes
            file_bytes = file.file.read()
            if not file_bytes:
                continue

            from app.services.super_parser import parse_pdf
            from app.services.client_resolver import resolve_client
            from app.services.file_storage import (
                resolve_withholding_folder,
                generate_withholding_filename,
                save_file_with_versioning,
            )

            result = parse_pdf(file_bytes)
            if not result.get("success") or result.get("format") != "challan":
                continue

            meta = result.get("metadata", {})
            entries = result.get("entries", [])
            if not entries:
                continue

            entry = entries[0]
            client_name = entry.get("name", "")
            if not client_name:
                continue

            ntn_str = entry.get("cnicNtn", "")
            is_ntn = bool(re.match(r"^\d{7}-\d$", str(ntn_str)))
            ntn = ntn_str if is_ntn else None
            cnic = ntn_str if re.match(r"^\d{13}$", str(ntn_str)) else None

            section = "153" if "153" in meta.get("section", "") else "236H"
            period = meta.get("period", "")
            challan_number = meta.get("challan_number", "")
            amount = Decimal(str(meta.get("total_amount", 0) or 0))

            payment_date_str = meta.get("payment_date", "")
            payment_date = None
            if payment_date_str:
                try:
                    payment_date = datetime.strptime(str(payment_date_str), "%Y-%m-%d").date()
                except ValueError:
                    pass

            # Resolve or create client
            client, client_created, _ = resolve_client(
                db=db,
                ntn=ntn,
                client_name=client_name,
                cnic=cnic,
            )

            if not client.withholding_registered:
                client.withholding_registered = True
                db.flush()

            if not period:
                period = datetime.now().strftime("%Y-%m")

            folder = resolve_withholding_folder(client.client_name, section)
            ext = ".pdf"
            filename = generate_withholding_filename(
                client_name=client.client_name,
                ntn=client.ntn,
                doc_type=section,
                period=period,
                ext=ext,
            )

            saved_path, saved_filename = save_file_with_versioning(folder, filename, file_bytes)

            document = Document(
                client_id=client.id,
                original_file_name=file.filename or saved_filename,
                file_name=saved_filename,
                file_extension="pdf",
                file_size=len(file_bytes),
                file_path=str(saved_path),
                file_type="PDF",
                uploaded_by=current_user.id,
            )
            db.add(document)
            db.flush()

            existing = db.query(WithholdingRecord).filter(
                WithholdingRecord.client_id == client.id,
                WithholdingRecord.section_type == section,
                WithholdingRecord.period == period,
                WithholdingRecord.challan_number == (challan_number or None),
            ).first()

            warnings = []
            remarks_parts = ["Imported from challan"]
            if meta.get("payment_section_code"):
                remarks_parts.append(f"Payment Section Code: {meta['payment_section_code']}")

            if existing:
                existing.amount = amount or existing.amount
                existing.payment_date = payment_date or existing.payment_date
                existing.document_id = document.id
                existing.remarks = "\n".join(remarks_parts) + " (updated)"
                db.flush()
                record = existing
                warnings.append(f"Updated existing record")
            else:
                record = WithholdingRecord(
                    client_id=client.id,
                    section_type=section,
                    period=period,
                    challan_number=challan_number,
                    amount=amount or Decimal("0"),
                    payment_date=payment_date,
                    document_id=document.id,
                    remarks="\n".join(remarks_parts),
                )
                db.add(record)
                db.flush()

            results.append(ImportChallanResponse(
                success=True,
                client=ImportClientInfo(id=client.id, client_name=client.client_name, created=client_created),
                records=[ImportRecordInfo(
                    id=record.id,
                    section_type=str(record.section_type.value) if hasattr(record.section_type, 'value') else str(record.section_type),
                    period=record.period,
                    amount=record.amount,
                    payment_section_code=record.payment_section_code,
                    document_id=document.id,
                )],
                file=ImportFileInfo(saved_path=str(saved_path), file_name=saved_filename),
                warnings=warnings,
            ))

        except Exception:
            continue

    db.commit()
    return results


@router.post("/import/preview", response_model=WithholdingImportPreviewResponse)
def preview_withholding_import(
    file: UploadFile = File(...),
    section_hint: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
):
    """
    Preview import without writing to DB.
    Parses the file and returns extracted data for user review.
    """
    import json
    from datetime import datetime
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")
    
    lower = file.filename.lower()
    
    if lower.endswith(".pdf"):
        from app.services.super_parser import parse_pdf
        result = parse_pdf(file_bytes)

        if not result.get("success"):
            return {
                "success": True,
                "detected_type": "unknown",
                "fields": result.get("metadata", {}),
                "errors": result.get("errors", ["Could not parse PDF"]),
            }

        fmt = result.get("format", "unknown")

        if fmt == "challan":
            meta = result.get("metadata", {})
            entries = result.get("entries", [])
            entry = entries[0] if entries else {}
            return {
                "success": True,
                "detected_type": "challan",
                "fields": {
                    "section_type": "153" if "153" in meta.get("section", "") else "236H",
                    "client_name": entry.get("name", ""),
                    "ntn": entry.get("cnicNtn", ""),
                    "cnic": "",
                    "period": meta.get("period", ""),
                    "challan_number": meta.get("challan_number", ""),
                    "amount": str(meta.get("total_amount", 0)) if meta.get("total_amount") else None,
                    "payment_date": meta.get("payment_date", "") or None,
                    "payment_section_code": meta.get("payment_section_code", ""),
                },
                "confidence": {},
            }
        else:
            entries = result.get("entries", [])
            rows_data = []
            meta = result.get("metadata", {})
            for e in entries:
                rows_data.append({
                    "line_number": "",
                    "ntn": e.get("cnicNtn", ""),
                    "client_name": e.get("name", ""),
                    "section_type": meta.get("section", ""),
                    "period": meta.get("period", ""),
                    "challan_number": meta.get("challan_number", ""),
                    "amount": str(e.get("taxable", 0)) if e.get("taxable") else None,
                    "warnings": [],
                })
            return {
                "success": True,
                "detected_type": "statement",
                "rows": rows_data,
                "total_rows": len(entries),
                "parsed_rows": len(entries),
                "errors": [],
            }
    elif lower.endswith((".xlsx", ".xls")):
        from app.services.statement_parser import parse_statement_excel
        result = parse_statement_excel(file_bytes, file.filename)
        rows_data = []
        pending_clients: List[PendingClientInfo] = []
        seen_pending = set()
        
        for row in result.rows:
            rows_data.append({
                "line_number": row.line_number,
                "ntn": row.ntn,
                "client_name": row.client_name,
                "section_type": row.section_type,
                "period": row.period,
                "challan_number": row.challan_number,
                "amount": str(row.amount) if row.amount else None,
                "warnings": row.warnings,
            })
            
            # Check if client would be auto-created
            if row.client_name:
                from app.services.client_resolver import resolve_client
                from app.db.session import SessionLocal
                temp_db = SessionLocal()
                try:
                    client, _, would_create = resolve_client(
                        db=temp_db,
                        ntn=row.ntn,
                        client_name=row.client_name,
                        cnic=None,
                        auto_create=False,
                    )
                    if would_create:
                        key = (row.client_name.strip().upper(), row.ntn or '')
                        if key not in seen_pending:
                            seen_pending.add(key)
                            pending_clients.append(PendingClientInfo(
                                client_name=row.client_name,
                                ntn=row.ntn,
                                cnic=None
                            ))
                finally:
                    temp_db.close()
        
        return WithholdingImportPreviewResponse(
            success=True,
            detected_type="statement",
            rows=rows_data,
            total_rows=result.total_rows,
            parsed_rows=result.parsed_rows,
            errors=result.errors,
            pending_clients=pending_clients if pending_clients else None,
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Supported: .pdf, .xlsx, .xls")
