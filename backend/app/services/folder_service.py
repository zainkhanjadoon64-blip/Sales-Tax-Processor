"""
Folder Service
Scans the local file system and provides folder tree navigation
for the document module.
"""
import os
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.config import settings
from app.models.document import Document


def get_storage_base() -> Path:
    """Return the base storage path."""
    return Path(settings.STORAGE_PATH)


def get_clients_storage() -> Path:
    """Return the clients storage directory."""
    path = get_storage_base() / "Clients"
    path.mkdir(parents=True, exist_ok=True)
    return path


def scan_folder_tree(base_path: Optional[Path] = None, depth: int = 0, max_depth: int = 4) -> list[dict]:
    """
    Recursively scan directory structure and return nested folder tree.
    
    Returns list of:
    {
        "name": str,
        "path": str (relative to storage base),
        "type": "folder" | "file",
        "document_count": int,
        "children": [...]
    }
    """
    if base_path is None:
        base_path = get_clients_storage()

    if not base_path.exists():
        return []

    result = []

    try:
        entries = sorted(base_path.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
    except PermissionError:
        return []

    for entry in entries:
        if entry.name.startswith('.'):
            continue  # Skip hidden files

        node = {
            "name": entry.name,
            "path": str(entry.relative_to(get_storage_base())),
            "type": "folder" if entry.is_dir() else "file",
            "document_count": 0,
            "children": [],
        }

        if entry.is_dir():
            if depth < max_depth:
                node["children"] = scan_folder_tree(entry, depth + 1, max_depth)
            # Count files in this folder (non-recursive)
            try:
                node["document_count"] = sum(1 for f in entry.iterdir() if f.is_file())
            except PermissionError:
                pass
        else:
            node["document_count"] = 1

        result.append(node)

    return result


def get_folder_contents_db(
    db: Session,
    folder_path: str,
    page: int = 1,
    limit: int = 25,
) -> tuple[list[Document], int]:
    """
    Get documents from database that match a folder path prefix.
    """
    # Normalize path separators
    normalized = folder_path.replace("\\", "/").strip("/")

    query = db.query(Document).filter(Document.is_deleted == False)

    if normalized:
        db_path_pattern = normalized.replace("/", "\\")
        query = query.filter(Document.file_path.ilike(f"%{db_path_pattern}%"))

    total = query.count()
    documents = (
        query
        .order_by(Document.upload_date.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return documents, total


def search_folder_names(query_str: str, max_results: int = 20) -> list[dict]:
    """
    Search folder names matching a query string.
    """
    base = get_clients_storage()
    results = []
    query_lower = query_str.lower()

    for root, dirs, files in os.walk(base):
        for dirname in dirs:
            if query_lower in dirname.lower():
                root_path = Path(root) / dirname
                results.append({
                    "name": dirname,
                    "path": str(root_path.relative_to(get_storage_base())),
                    "type": "folder",
                    "document_count": sum(1 for f in root_path.iterdir() if f.is_file()),
                    "children": [],
                })
                if len(results) >= max_results:
                    return results

    return results


def ensure_client_folder_structure(client_name: str, year: Optional[int] = None) -> dict[str, Path]:
    """
    Create the full folder structure for a client.
    
    storage/Clients/{ClientName}/{Year}/
        Sales_Tax/
        Withholding/
            236H/
            153/
        KPRA/
        Income_Tax/
        Notices/
        Working_Files/
    
    Returns a dict mapping category name to folder Path.
    """
    base = get_clients_storage() / client_name
    current_year = year or __import__('datetime').datetime.now().year
    year_path = base / str(current_year)

    categories = {
        "Sales_Tax": year_path / "Sales_Tax",
        "236H": year_path / "Withholding" / "236H",
        "153": year_path / "Withholding" / "153",
        "165": year_path / "Withholding" / "165",
        "KPRA": year_path / "KPRA",
        "Income_Tax": year_path / "Income_Tax",
        "Notices": year_path / "Notices",
        "Working_Files": year_path / "Working_Files",
    }

    for path in categories.values():
        path.mkdir(parents=True, exist_ok=True)

    return categories


def get_folder_for_category(
    client_name: str,
    category: str,
    tax_year: Optional[int] = None,
) -> Path:
    """
    Get the appropriate folder path for a document category.
    """
    categories = ensure_client_folder_structure(client_name, tax_year)

    category_map = {
        "Sales Tax Return": "Sales_Tax",
        "236H": "236H",
        "153": "153",
        "165": "165",
        "KPRA": "KPRA",
        "Income Tax Return": "Income_Tax",
        "Working File": "Working_Files",
        "Notice": "Notices",
        "Other": "Working_Files",
    }

    folder_key = category_map.get(category, "Working_Files")
    return categories.get(folder_key, categories["Working_Files"])


def move_document_file(
    current_path: str,
    new_folder: Path,
) -> tuple[str, str]:
    """
    Move a file to a new folder. Returns (new_path, new_filename).
    """
    source = Path(current_path)
    if not source.exists():
        raise FileNotFoundError(f"Source file not found: {current_path}")

    new_folder.mkdir(parents=True, exist_ok=True)
    destination = new_folder / source.name

    # Handle name conflicts
    counter = 1
    while destination.exists():
        stem = source.stem
        ext = source.suffix
        destination = new_folder / f"{stem}_{counter}{ext}"
        counter += 1

    import shutil
    shutil.move(str(source), str(destination))
    return str(destination), destination.name


def copy_document_file(
    current_path: str,
    new_folder: Path,
) -> tuple[str, str]:
    """
    Copy a file to a new folder. Returns (new_path, new_filename).
    """
    import shutil

    source = Path(current_path)
    if not source.exists():
        raise FileNotFoundError(f"Source file not found: {current_path}")

    new_folder.mkdir(parents=True, exist_ok=True)
    destination = new_folder / source.name

    # Handle name conflicts
    counter = 1
    while destination.exists():
        stem = source.stem
        ext = source.suffix
        destination = new_folder / f"{stem}_{counter}{ext}"
        counter += 1

    shutil.copy2(str(source), str(destination))
    return str(destination), destination.name