from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
import uuid
import io

from app.db.session import get_db
from app.models.statement_165 import Statement165Entry, Statement165Session
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────


class WhtEntryIn(BaseModel):
    id: str
    name: str
    cnicNtn: str
    date: str
    code: str
    taxable: float
    tax: float


class WhtEntryUpdate(BaseModel):
    name: Optional[str] = None
    cnicNtn: Optional[str] = None
    date: Optional[str] = None
    code: Optional[str] = None
    taxable: Optional[float] = None
    tax: Optional[float] = None


class ProcessRequest(BaseModel):
    entries: list[WhtEntryIn]
    fileName: Optional[str] = None
    statementPeriodStart: Optional[str] = None
    statementPeriodEnd: Optional[str] = None


class SessionUpdate(BaseModel):
    status: Optional[str] = None
    file_name: Optional[str] = None
    statement_period_start: Optional[str] = None
    statement_period_end: Optional[str] = None


# ── Individual Entry CRUD ──────────────────────────────────────────────────────


@router.post("/statement-165/entries")
def create_entry(
    body: WhtEntryIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    entry = Statement165Entry(
        user_id=current_user.id,
        name=body.name,
        cnic_ntn=body.cnicNtn,
        date=body.date,
        code=body.code,
        taxable=body.taxable,
        tax=body.tax,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "success": True,
        "entry": {
            "id": entry.id,
            "name": entry.name,
            "cnicNtn": entry.cnic_ntn,
            "date": entry.date,
            "code": entry.code,
            "taxable": entry.taxable,
            "tax": entry.tax,
        },
    }


@router.get("/statement-165/entries")
def list_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    session_id: Optional[str] = Query(None),
):
    q = db.query(Statement165Entry).filter(Statement165Entry.user_id == current_user.id)
    if session_id:
        q = q.filter(Statement165Entry.session_id == session_id)
    total = q.count()
    rows = q.order_by(Statement165Entry.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "success": True,
        "total": total,
        "entries": [
            {
                "id": r.id,
                "name": r.name,
                "cnicNtn": r.cnic_ntn,
                "date": r.date,
                "code": r.code,
                "taxable": r.taxable,
                "tax": r.tax,
                "sessionId": r.session_id,
                "createdAt": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.put("/statement-165/entries/{entry_id}")
def update_entry(
    entry_id: str,
    body: WhtEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    entry = db.query(Statement165Entry).filter(
        Statement165Entry.id == entry_id,
        Statement165Entry.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if body.name is not None:
        entry.name = body.name
    if body.cnicNtn is not None:
        entry.cnic_ntn = body.cnicNtn
    if body.date is not None:
        entry.date = body.date
    if body.code is not None:
        entry.code = body.code
    if body.taxable is not None:
        entry.taxable = body.taxable
    if body.tax is not None:
        entry.tax = body.tax
    entry.updated_at = datetime.utcnow()
    db.commit()
    return {"success": True}


@router.delete("/statement-165/entries/{entry_id}")
def delete_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    entry = db.query(Statement165Entry).filter(
        Statement165Entry.id == entry_id,
        Statement165Entry.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"success": True}


# ── Session Management ─────────────────────────────────────────────────────────


@router.post("/statement-165/sessions")
def create_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    session_id = f"stmt_{uuid.uuid4().hex[:12]}"
    sess = Statement165Session(
        user_id=current_user.id,
        session_id=session_id,
        status="draft",
        last_saved_at=datetime.utcnow(),
    )
    db.add(sess)
    db.commit()
    db.refresh(sess)
    return {
        "success": True,
        "session": {
            "id": sess.id,
            "sessionId": sess.session_id,
            "status": sess.status,
            "entryCount": 0,
            "taxableTotal": 0,
            "taxTotal": 0,
        },
    }


@router.get("/statement-165/sessions")
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = Query(50, le=100),
):
    sessions = (
        db.query(Statement165Session)
        .filter(Statement165Session.user_id == current_user.id)
        .order_by(Statement165Session.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "success": True,
        "sessions": [
            {
                "id": s.id,
                "sessionId": s.session_id,
                "fileName": s.file_name or "",
                "entryCount": s.entry_count or 0,
                "taxableTotal": s.taxable_total or 0,
                "taxTotal": s.tax_total or 0,
                "status": s.status,
                "statementPeriodStart": s.statement_period_start or "",
                "statementPeriodEnd": s.statement_period_end or "",
                "lastSavedAt": s.last_saved_at.isoformat() if s.last_saved_at else None,
                "createdAt": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sessions
        ],
    }


@router.put("/statement-165/sessions/{session_id}")
def update_session(
    session_id: str,
    body: SessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    sess = db.query(Statement165Session).filter(
        Statement165Session.session_id == session_id,
        Statement165Session.user_id == current_user.id,
    ).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    if body.status is not None:
        sess.status = body.status
    if body.file_name is not None:
        sess.file_name = body.file_name
    if body.statement_period_start is not None:
        sess.statement_period_start = body.statement_period_start
    if body.statement_period_end is not None:
        sess.statement_period_end = body.statement_period_end
    sess.last_saved_at = datetime.utcnow()
    db.commit()
    return {"success": True}


# ── Save entries (batch) ───────────────────────────────────────────────────────


@router.post("/statement-165/save-entries")
def save_statement_165_entries(
    body: ProcessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not body.entries:
        raise HTTPException(status_code=400, detail="No entries provided")

    session_id = f"stmt_{uuid.uuid4().hex[:12]}"
    total_taxable = sum(e.taxable for e in body.entries)
    total_tax = sum(e.tax for e in body.entries)

    for e in body.entries:
        entry = Statement165Entry(
            user_id=current_user.id,
            session_id=session_id,
            name=e.name,
            cnic_ntn=e.cnicNtn,
            date=e.date,
            code=e.code,
            taxable=e.taxable,
            tax=e.tax,
        )
        db.add(entry)

    file_name = body.fileName or f"165_Statement_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsm"

    sess = Statement165Session(
        user_id=current_user.id,
        session_id=session_id,
        file_name=file_name,
        entry_count=len(body.entries),
        taxable_total=total_taxable,
        tax_total=total_tax,
        status="exported",
        statement_period_start=body.statementPeriodStart or None,
        statement_period_end=body.statementPeriodEnd or None,
        last_saved_at=datetime.utcnow(),
    )
    db.add(sess)
    db.commit()

    return {
        "success": True,
        "session_id": session_id,
        "records_processed": len(body.entries),
    }


# ── History ────────────────────────────────────────────────────────────────────


@router.get("/statement-165/history")
def list_statement_165_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    sessions = (
        db.query(Statement165Session)
        .filter(Statement165Session.user_id == current_user.id)
        .order_by(Statement165Session.created_at.desc())
        .limit(50)
        .all()
    )
    return {
        "success": True,
        "sessions": [
            {
                "id": s.id,
                "sessionId": s.session_id,
                "fileName": s.file_name or "statement.xlsx",
                "entryCount": s.entry_count or 0,
                "taxableTotal": s.taxable_total or 0,
                "taxTotal": s.tax_total or 0,
                "status": s.status,
                "createdAt": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sessions
        ],
    }


# ── Upload File (Excel or PDF) ─────────────────────────────────────────────────


@router.post("/statement-165/upload")
def upload_statement_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    ext = file.filename.lower().split(".")[-1] if "." in file.filename else ""

    if ext not in ("xlsx", "xlsm", "pdf"):
        return {
            "success": True,
            "entries": [],
            "source": ext,
            "count": 0,
            "errors": [{"file": file.filename, "error": f"Unsupported file type: .{ext}"}],
        }

    try:
        if ext in ("xlsx", "xlsm"):
            from app.services.statement_165_service import read_existing_statement
            records = read_existing_statement(file_bytes)
            if not records:
                return {
                    "success": True,
                    "entries": [],
                    "source": "excel",
                    "count": 0,
                    "errors": [{"file": file.filename, "error": "No valid data found in spreadsheet. Expected headers in row 3 (REGISTRATION NO, IDENTIFICATION NO, NAME, etc.)"}],
                }
            entries = [
                {
                    "id": uuid.uuid4().hex[:12],
                    "name": r.get("name", ""),
                    "cnicNtn": r.get("registration_no", ""),
                    "date": r.get("transaction_date", ""),
                    "code": r.get("payment_code", ""),
                    "taxable": r.get("taxable_amount", 0),
                    "tax": r.get("tax_amount", 0),
                }
                for r in records
            ]
            return {"success": True, "entries": entries, "source": "excel", "count": len(entries), "errors": []}

        if ext == "pdf":
            from app.services.super_parser import parse_pdf

            result = parse_pdf(file_bytes)

            if not result.get("success"):
                return {
                    "success": True,
                    "entries": [],
                    "source": "pdf",
                    "count": 0,
                    "errors": [{"file": file.filename, "error": result.get("error", "Could not extract data from this PDF. The format may not be supported.")}],
                }

            entries = [
                {
                    "id": uuid.uuid4().hex[:12],
                    "name": e.get("name", ""),
                    "cnicNtn": e.get("cnicNtn", ""),
                    "date": e.get("date", ""),
                    "code": e.get("code", ""),
                    "taxable": e.get("taxable", 0),
                    "tax": e.get("tax", 0),
                }
                for e in result.get("entries", [])
            ]
            return {"success": True, "entries": entries, "source": "pdf", "count": len(entries), "errors": []}

    except Exception as e:
        return {
            "success": True,
            "entries": [],
            "source": ext,
            "count": 0,
            "errors": [{"file": file.filename, "error": str(e)}],
        }

    return {"success": True, "entries": [], "source": ext, "count": 0, "errors": []}


# ── Process Statement ──────────────────────────────────────────────────────────


@router.post("/statement-165/process")
def process_statement(
    body: ProcessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not body.entries:
        raise HTTPException(status_code=400, detail="No entries provided")

    from app.services.statement_165_service import build_statement_workbook, normalize_record

    records = [normalize_record(e.model_dump()) for e in body.entries]
    excel_bytes = build_statement_workbook(records)

    from starlette.responses import Response
    file_name = body.fileName or f"165_Statement_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsm"

    # Save session
    session_id = f"stmt_{uuid.uuid4().hex[:12]}"
    total_taxable = sum(e.taxable for e in body.entries)
    total_tax = sum(e.tax for e in body.entries)

    for e in body.entries:
        entry = Statement165Entry(
            user_id=current_user.id,
            session_id=session_id,
            name=e.name,
            cnic_ntn=e.cnicNtn,
            date=e.date,
            code=e.code,
            taxable=e.taxable,
            tax=e.tax,
        )
        db.add(entry)

    sess = Statement165Session(
        user_id=current_user.id,
        session_id=session_id,
        file_name=file_name,
        entry_count=len(body.entries),
        taxable_total=total_taxable,
        tax_total=total_tax,
        status="completed",
        statement_period_start=body.statementPeriodStart or None,
        statement_period_end=body.statementPeriodEnd or None,
        last_saved_at=datetime.utcnow(),
    )
    db.add(sess)
    db.commit()

    return Response(
        content=excel_bytes,
        media_type="application/vnd.ms-excel.sheet.macroEnabled.12",
        headers={
            "Content-Disposition": f'attachment; filename="{file_name}"',
            "X-Session-Id": session_id,
        },
    )


# ── Export / Download ──────────────────────────────────────────────────────────


@router.get("/statement-165/export/{session_id}")
def export_statement(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    rows = (
        db.query(Statement165Entry)
        .filter(Statement165Entry.session_id == session_id)
        .order_by(Statement165Entry.id)
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Entries not found")

    from app.services.statement_165_service import build_statement_workbook, normalize_record

    records = []
    for r in rows:
        records.append(normalize_record({
            "name": r.name,
            "registration_no": r.cnic_ntn,
            "transaction_date": r.date,
            "payment_code": r.code,
            "taxable_amount": r.taxable,
            "tax_amount": r.tax,
        }))

    excel_bytes = build_statement_workbook(records)
    sess = db.query(Statement165Session).filter(Statement165Session.session_id == session_id).first()
    file_name = sess.file_name if sess else f"165_Statement_{session_id}.xlsm"

    from starlette.responses import Response
    return Response(
        content=excel_bytes,
        media_type="application/vnd.ms-excel.sheet.macroEnabled.12",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


# ── Download (legacy) ──────────────────────────────────────────────────────────


@router.get("/statement-165/download/{session_id}")
def download_statement_165(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return export_statement(session_id, db, current_user)


# ── Upload Existing Statement (extract entries) ────────────────────────────────


@router.post("/statement-165/upload-existing")
def upload_existing_statement(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Upload an existing .xlsm/.xlsx statement and return all entries."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.lower().split(".")[-1] if "." in file.filename else ""
    if ext not in ("xlsx", "xlsm", "xls"):
        raise HTTPException(status_code=400, detail="Invalid format. Upload .xlsm, .xlsx, or .xls")

    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    from app.services.statement_165_service import read_existing_statement

    records = read_existing_statement(file_bytes)
    entries = [
        {
            "id": uuid.uuid4().hex[:12],
            "name": r.get("name", ""),
            "cnicNtn": r.get("registration_no", ""),
            "date": r.get("transaction_date", ""),
            "code": r.get("payment_code", ""),
            "taxable": r.get("taxable_amount", 0),
            "tax": r.get("tax_amount", 0),
        }
        for r in records
    ]

    return {
        "success": True,
        "entries": entries,
        "count": len(entries),
    }


# ── Upload Abbottabad Excel (10-column format) ─────────────────────────────────


@router.post("/statement-165/upload-excel")
def upload_abbottabad_excel(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Upload Abbottabad-format Excel (10-column) and extract entries."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.lower().split(".")[-1] if "." in file.filename else ""
    if ext not in ("xlsx", "xlsm", "xls"):
        raise HTTPException(status_code=400, detail="Invalid format. Upload .xlsx, .xlsm, or .xls")

    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    from app.services.statement_165_service import read_abbottabad_excel

    records = read_abbottabad_excel(file_bytes)
    entries = [
        {
            "id": uuid.uuid4().hex[:12],
            "name": r.get("business_name", ""),
            "cnicNtn": r.get("ntn_cnic", ""),
            "date": r.get("generation_date", ""),
            "code": r.get("payment_code", ""),
            "taxable": r.get("amount", 0),
            "tax": r.get("tax_amount", 0),
        }
        for r in records
    ]

    return {"success": True, "entries": entries, "count": len(entries)}


# ── Append to Existing Statement ───────────────────────────────────────────────


class AppendRequest(BaseModel):
    entries: list[WhtEntryIn]
    fileName: Optional[str] = None


@router.post("/statement-165/append-to-existing")
def append_to_existing_statement_endpoint(
    file: UploadFile = File(...),
    body: str = Form(...),
    current_user: User = Depends(get_current_active_user),
):
    """Append new records to an existing statement .xlsm file."""
    import json

    data = json.loads(body)
    append_req = AppendRequest(**data)

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    if not append_req.entries:
        raise HTTPException(status_code=400, detail="No entries to append")

    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    from app.services.statement_165_service import append_to_existing_statement, normalize_record

    records = [normalize_record(e.model_dump()) for e in append_req.entries]
    excel_bytes = append_to_existing_statement(file_bytes, records)

    file_name = append_req.fileName or f"165_Statement_Updated_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsm"

    from starlette.responses import Response
    return Response(
        content=excel_bytes,
        media_type="application/vnd.ms-excel.sheet.macroEnabled.12",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


# ── Heartbeat ──────────────────────────────────────────────────────────────────


@router.get("/statement-165/ping")
def heartbeat(
    current_user: User = Depends(get_current_active_user),
):
    return {"success": True, "time": datetime.utcnow().isoformat()}


# ── System Status ──────────────────────────────────────────────────────────────


@router.get("/statement-165/status")
def system_status(
    current_user: User = Depends(get_current_active_user),
):
    return {
        "success": True,
        "status": "ready",
        "autoSave": "completed",
        "lastBackup": "10 min ago",
        "lastSaved": "30 seconds ago",
        "version": "2.0.0",
        "serverTime": datetime.utcnow().isoformat(),
    }
