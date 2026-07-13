"""
Shared file storage helpers for withholding challan/statement imports.
Extracts folder/path logic from documents.py into a reusable module.
"""
import os
import shutil
from pathlib import Path
from typing import Optional
from datetime import datetime

from app.core.config import settings


def get_storage_base_path() -> Path:
    """
    Return the base storage path, checking the DB settings first.
    Falls back to the env/config STORAGE_PATH if no setting is found.
    """
    try:
        from app.db.session import SessionLocal
        from app.models.setting import Setting
        db = SessionLocal()
        try:
            row = db.query(Setting).filter(Setting.key == "withholding_storage_path").first()
            if row and row.value and os.path.isdir(row.value):
                return Path(row.value)
        except Exception:
            pass
        finally:
            db.close()
    except Exception:
        pass
    return Path(settings.STORAGE_PATH)


def _safe_mkdir(folder: Path) -> Path:
    """Create the folder on disk, but skip silently when the filesystem is
    read-only (serverless) or Blob storage is in use."""
    try:
        from app.services import blob_storage
        if blob_storage.is_enabled():
            return folder
    except Exception:
        pass
    try:
        folder.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass
    return folder


def resolve_withholding_folder(client_name: str, section_or_category: str) -> Path:
    """
    Return the storage folder for a client's withholding documents.
    section_or_category: "236H", "153", "165", or "Statements"
    """
    base = get_storage_base_path() / "Clients" / client_name / "Withholding"
    folder = base / section_or_category
    return _safe_mkdir(folder)


def generate_withholding_filename(
    client_name: str,
    ntn: Optional[str],
    doc_type: str,
    period: str,
    ext: str,
) -> str:
    """
    Generate a standardized filename for withholding documents.
    doc_type: "236H", "153", or "STATEMENT"
    period: "YYYY-MM"
    
    Patterns:
      Challan: {CLIENT}_{NTN}_{SECTION}_{MON}_{YEAR}{ext}
      Statement: {CLIENT}_{NTN}_STATEMENT_{MON}_{YEAR}{ext}
    """
    # Sanitize components for safe filenames
    safe_name = client_name.replace(" ", "_").replace("/", "_").replace("\\", "_")
    ntn_part = ntn.replace("-", "") if ntn else "NONTN"
    mon, year = period.split("-") if "-" in period else ("00", "0000")
    
    if doc_type.upper() in ("236H", "153", "165"):
        return f"{safe_name}_{ntn_part}_{doc_type.upper()}_{mon}_{year}{ext}"
    else:
        return f"{safe_name}_{ntn_part}_STATEMENT_{mon}_{year}{ext}"


def save_file_with_versioning(
    folder: Path,
    filename: str,
    content: bytes,
    content_type: Optional[str] = None,
) -> tuple[str, str]:
    """
    Persist a file and return (path_or_url, final_filename).

    When Vercel Blob is configured (e.g. on serverless), the file is uploaded to
    Blob and the returned path is the blob URL. Otherwise it is written to the
    local filesystem with version-suffix collision handling. Callers store the
    returned path in Document.file_path, so both modes work transparently.
    """
    from app.services import blob_storage

    if blob_storage.is_blob_url is not None and blob_storage.is_enabled():
        # Blob adds a random suffix for uniqueness, so no manual versioning needed
        key = f"{Path(folder).as_posix()}/{filename}"
        url = blob_storage.upload_bytes(key, content, content_type=content_type)
        return url, filename

    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)

    stem, ext = os.path.splitext(filename)
    final_path = folder / filename
    counter = 1

    while final_path.exists():
        final_path = folder / f"{stem}_v{counter}{ext}"
        counter += 1

    final_path.write_bytes(content)
    return str(final_path), final_path.name


def ensure_client_folder_structure(client_name: str) -> dict[str, Path]:
    """
    Create the full withholding folder structure for a client.
    Returns a dict mapping section -> folder Path.
    """
    sections = ["236H", "153", "165", "Statements"]
    folders = {}
    for section in sections:
        folders[section] = resolve_withholding_folder(client_name, section)
    return folders


def resolve_sales_tax_folder(client_name: str, year: int) -> Path:
    """
    Return the storage folder for a client's sales tax documents.
    Pattern: storage/Clients/{ClientName}/{Year}/Sales_Tax/
    """
    base = get_storage_base_path() / "Clients" / client_name / str(year) / "Sales_Tax"
    return _safe_mkdir(base)


def generate_sales_tax_filename(
    client_name: str,
    ntn: Optional[str],
    year: int,
    month: int,
    ext: str,
) -> str:
    """
    Generate a standardized filename for sales tax documents.
    Pattern: {CLIENT}_{NTN}_SALESTAX_{MONTH}_{YEAR}{ext}
    """
    safe_name = client_name.replace(" ", "_").replace("/", "_").replace("\\", "_")
    ntn_part = ntn.replace("-", "") if ntn else "NONTN"
    month_str = f"{month:02d}"
    
    return f"{safe_name}_{ntn_part}_SALESTAX_{month_str}_{year}{ext}"
