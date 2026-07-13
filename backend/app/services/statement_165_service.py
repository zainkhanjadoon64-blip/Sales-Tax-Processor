"""
Section 165 Withholding Tax Statement service.

Handles PDF extraction, Excel building/reading, and record normalization.
Ported from the Next.js withholding-tax-statement project.
"""
import io
import re
import uuid
from datetime import datetime
from typing import Any

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# ── PDF Extraction ────────────────────────────────────────────────────────────


async def extract_pdf_lines(buffer: bytes) -> list[str]:
    """Reconstruct text lines from PDF using pymupdf."""
    try:
        import fitz  # pymupdf
    except ImportError:
        raise ImportError("pymupdf (fitz) is required for PDF extraction")

    doc = fitz.open(stream=buffer, filetype="pdf")
    page = doc[0]
    blocks = page.get_text("blocks")
    doc.close()

    # Sort by y-coordinate (top to bottom), group within 2px tolerance
    rows: dict[int, list[tuple[float, str]]] = {}
    for b in blocks:
        y = round(b[1])  # y0
        text = (b[4] or "").strip()
        if not text:
            continue
        x = b[0]
        # Find within tolerance
        key = next((k for k in rows if abs(k - y) <= 2), y)
        rows.setdefault(key, []).append((x, text))

    sorted_ys = sorted(rows.keys(), reverse=False)
    lines: list[str] = []
    for y in sorted_ys:
        items = sorted(rows[y], key=lambda it: it[0])
        line = " ".join(it[1] for it in items)
        line = re.sub(r"\s+", " ", line).strip()
        if line:
            lines.append(line)
    return lines


def extract_payment_code(text: str) -> str | None:
    m = re.search(r"Payment\s+Section\s*:[^\n]*?-\s*(\d{8})", text, re.I)
    if m:
        return m.group(1)
    fallback = re.search(r"\b(64\d{6})\b", text)
    return fallback.group(1) if fallback else None


def extract_generation_date(text: str) -> str | None:
    m = re.search(r"Generation\s+Date\s*:\s*(\d{1,2}-[A-Za-z]{3}-\d{4})", text, re.I)
    return m.group(1) if m else None


def parse_amount_pair(segment: str) -> tuple[float, float] | None:
    nums = re.findall(r"[\d,]+(?:\.\d+)?", segment)
    if len(nums) < 2:
        return None
    amount = float(nums[0].replace(",", ""))
    tax = float(nums[1].replace(",", ""))
    return (amount, tax)


LOCATION_CODES = re.compile(r"^[A-Z]{2,3}$")
ADDRESS_KEYWORDS = re.compile(
    r"\b(OPP|PLOT|HOUSE|STREET|ROAD|BLOCK|SECTOR|NEAR|SHOP|FLOOR|MOHALLA|BAZAR|MARKET|CHOWK|COLONY)\b", re.I
)
COMPANY_KEYWORDS = re.compile(
    r"\b(MEDICAL|STORE|LIMITED|LTD|PVT|PRIVATE|TRADERS|ENTERPRISES|PHARMACY|AGENCY|COMPANY|"
    r"CORPORATION|INDUSTRIES|MILLS|BROTHERS|SONS)\b", re.I
)


def extract_single_entry(lines: list[str], start_idx: int, serial_num: int) -> dict | None:
    line = lines[start_idx]
    line = re.sub(rf"^{serial_num}\s+", "", line)

    # Format 2 (Section 236H): "... NAME 236H / B01131 AMOUNT TAX"
    f2 = re.match(r"^(.*?)\s+236H\s*/\s*B\d+\s+(.*)$", line, re.I)
    if f2:
        name_part = f2.group(1)
        name_part = re.sub(r"^(LTO|RTO|CTO)\b[^A-Z]*(\/\s*)?", "", name_part, flags=re.I)
        name_part = re.sub(r"^/\s*", "", name_part).strip()
        amounts = parse_amount_pair(f2.group(2))
        ntn_cnic = ""
        for j in range(start_idx + 1, min(start_idx + 5, len(lines))):
            cm = re.search(r"\b(\d{5}-\d{7}-\d|\d{13})\b", lines[j])
            if cm:
                ntn_cnic = cm.group(1)
                break
        for j in range(start_idx + 1, min(start_idx + 5, len(lines))):
            cand = lines[j].strip()
            if not cand:
                continue
            if re.match(r"^\d", cand):
                break
            if LOCATION_CODES.match(cand):
                continue
            if ADDRESS_KEYWORDS.search(cand):
                continue
            if COMPANY_KEYWORDS.search(cand):
                existing_words = set(name_part.upper().split())
                extra = " ".join(
                    w for w in cand.split() if w.upper() not in existing_words
                )
                if extra:
                    name_part = f"{name_part} {extra}".strip()
                break
        if name_part and amounts:
            return {
                "serial": serial_num,
                "ntn_cnic": ntn_cnic,
                "business_name": name_part,
                "payment_code": "",
                "amount": amounts[0],
                "tax_amount": amounts[1],
            }
        return None

    # Format 1 (Section 153): "NTN OFFICE / NAME 153(1)(a) / AMOUNT TAX"
    ntn_match = re.match(r"^(\d{7}-\d)\s+(.*)$", line)
    if ntn_match:
        ntn = ntn_match.group(1)
        rest = ntn_match.group(2)
        rest = re.sub(r"^(LTO|RTO|CTO)\b[^/]*/\s*", "", rest, flags=re.I).strip()
        sec_match = re.match(r"^(.*?)\s+153\(1\)\([a-z]\)\s*/\s*(.*)$", rest, re.I)
        business_name = ""
        amounts = None
        if sec_match:
            business_name = sec_match.group(1).strip()
            amounts = parse_amount_pair(sec_match.group(2))
        else:
            tail = re.match(r"^(.*?)\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)$", rest)
            if tail:
                business_name = re.sub(
                    r"\s+\d{3}\(\d\)[a-z]\)\s*/?\s*$", "", tail.group(1), flags=re.I
                ).strip()
                amounts = parse_amount_pair(f"{tail.group(2)} {tail.group(3)}")
        payment_code = ""
        for j in range(start_idx + 1, min(start_idx + 4, len(lines))):
            pc = re.search(r"\b(64\d{6})\b", lines[j])
            if pc:
                payment_code = pc.group(1)
                break
        if business_name and amounts:
            return {
                "serial": serial_num,
                "ntn_cnic": ntn,
                "business_name": business_name,
                "payment_code": payment_code,
                "amount": amounts[0],
                "tax_amount": amounts[1],
            }
    return None


def extract_all_entries(lines: list[str]) -> list[dict]:
    entries: list[dict] = []
    section_start = 0
    for i, line in enumerate(lines):
        if re.search(r"Details\s+of\s+Tax\s*Payers", line, re.I):
            section_start = i + 1
            break
    expected_serial = 1
    header_tokens = ["Sr.", "NTN / CNIC", "Address", "/ NAM Code"]
    for i in range(section_start, len(lines)):
        line = lines[i]
        if any(t in line for t in header_tokens):
            continue
        serial_match = re.match(r"^(\d{1,4})\s+", line)
        if not serial_match:
            continue
        serial = int(serial_match.group(1))
        if serial != expected_serial:
            continue
        entry = extract_single_entry(lines, i, serial)
        if entry:
            entries.append(entry)
            expected_serial += 1
    return entries


async def extract_pdf_data(buffer: bytes) -> dict:
    """Extract data from a challan PDF. Returns dict with success, entries, etc."""
    try:
        lines = await extract_pdf_lines(buffer)
        full_text = "\n".join(lines)
        payment_code = extract_payment_code(full_text)
        generation_date = extract_generation_date(full_text)
        entries = extract_all_entries(lines)
        for e in entries:
            if not e.get("payment_code") and payment_code:
                e["payment_code"] = payment_code
        if not entries:
            return {
                "success": False,
                "error": "No taxpayer entries could be extracted from this PDF",
                "entries": [],
                "payment_code": payment_code,
                "generation_date": generation_date,
            }
        return {
            "success": True,
            "entries": entries,
            "payment_code": payment_code,
            "generation_date": generation_date,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "entries": [],
            "payment_code": None,
            "generation_date": None,
        }


# ── Formatting ────────────────────────────────────────────────────────────────


def format_ntn_cnic_for_storage(value: str | None) -> str:
    if not value:
        return ""
    value = str(value).strip()
    if "-" in value:
        parts = value.split("-")
        if len(parts) == 3:
            return "".join(parts)  # CNIC
        if len(parts) == 2:
            return parts[0]  # NTN
    return value


def make_session_id() -> str:
    return f"stmt_{int(datetime.utcnow().timestamp() * 1000)}_{uuid.uuid4().hex[:6]}"


# ── Excel Building ────────────────────────────────────────────────────────────


TEMPLATE_HEADERS = [
    "REGISTRATION NO",
    "IDENTIFICATION NO",
    "NAME",
    "TRANSACTION DATE",
    "CODE",
    "AMOUNT",
    "EXEMPTION CODE",
    "TAX COLLECTIBLE/DEDUCTIBLE",
]


def build_statement_workbook(records: list[dict]) -> bytes:
    """Build the FBR Withholding Tax Statement workbook (.xlsx)."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Data"

    # Column widths
    widths = [18, 16, 34, 16, 12, 15, 14, 20]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # Title row 1
    ws.merge_cells("A1:H1")
    title_cell = ws["A1"]
    title_cell.value = "WITHHOLDING TAX STATEMENT U/S 165 - INCOME TAX ORDINANCE 2001"
    title_cell.font = Font(bold=True, size=12, color="1F3B70")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 22

    # Subtitle row 2
    ws.merge_cells("A2:H2")
    sub_cell = ws["A2"]
    sub_cell.value = "Federal Board of Revenue - Pakistan"
    sub_cell.font = Font(size=10, color="44506B")
    sub_cell.alignment = Alignment(horizontal="center", vertical="center")

    # Header row 3
    header_fill = PatternFill(start_color="2B4C9B", end_color="2B4C9B", fill_type="solid")
    header_font = Font(bold=True, size=9, color="FFFFFF")
    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )
    for i, h in enumerate(TEMPLATE_HEADERS, 1):
        cell = ws.cell(row=3, column=i, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border
    ws.row_dimensions[3].height = 28

    # Data rows
    data_border = Border(
        left=Side(style="thin", color="D5DBE8"),
        right=Side(style="thin", color="D5DBE8"),
        top=Side(style="thin", color="D5DBE8"),
        bottom=Side(style="thin", color="D5DBE8"),
    )
    data_font = Font(size=9)
    for idx, r in enumerate(records, 4):
        values = [
            r.get("registration_no", ""),
            "",  # identification no (always empty)
            r.get("name", ""),
            r.get("transaction_date", ""),
            r.get("payment_code", ""),
            r.get("taxable_amount", 0),
            "",  # exemption code (always empty)
            r.get("tax_amount", 0),
        ]
        for i, v in enumerate(values, 1):
            cell = ws.cell(row=idx, column=i, value=v)
            cell.font = data_font
            cell.border = data_border
            if i in (6, 8):
                cell.number_format = '#,##0.00'
                cell.alignment = Alignment(horizontal="right")

    # Totals row
    if records:
        total_row = 4 + len(records)
        ws.cell(row=total_row, column=3, value="TOTAL").font = Font(bold=True, size=9)
        total_taxable = sum(r.get("taxable_amount", 0) for r in records)
        total_tax = sum(r.get("tax_amount", 0) for r in records)
        for c, val in [(6, total_taxable), (8, total_tax)]:
            cell = ws.cell(row=total_row, column=c, value=val)
            cell.font = Font(bold=True, size=9)
            cell.number_format = '#,##0.00'
            cell.alignment = Alignment(horizontal="right")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()


# ── Existing Statement Reading ────────────────────────────────────────────────


def read_existing_statement(buffer: bytes) -> list[dict]:
    """Read an existing statement sheet: headers row 3, data from row 4."""
    wb = openpyxl.load_workbook(io.BytesIO(buffer), data_only=True)
    ws = wb.active
    records: list[dict] = []
    for row in ws.iter_rows(min_row=4, values_only=True):
        reg_no = str(row[0] or "").strip()
        name = str(row[2] or "").strip()
        if not reg_no and not name:
            continue
        if name.upper() == "TOTAL":
            continue
        records.append({
            "registration_no": reg_no,
            "identification_no": str(row[1] or "").strip(),
            "name": name,
            "transaction_date": str(row[3] or "").strip(),
            "payment_code": str(row[4] or "").strip(),
            "taxable_amount": _parse_float(row[5]),
            "exemption_code": str(row[6] or "").strip(),
            "tax_amount": _parse_float(row[7]),
        })
    wb.close()
    return records


def read_abbottabad_excel(buffer: bytes) -> list[dict]:
    """Read Abbottabad-format import sheet (10 columns)."""
    wb = openpyxl.load_workbook(io.BytesIO(buffer), data_only=True)
    ws = wb.active
    payment_code_map = {"236H/2": "64150801", "236H": "64150801"}
    today = datetime.utcnow().strftime("%Y-%m-%d")
    out: list[dict] = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        section = str(row[0] or "").strip()
        ntn = str(row[1] or "").strip()
        cnic = str(row[2] or "").strip()
        name = str(row[3] or "").strip()
        business_name = str(row[7] or "").strip()
        taxable = _parse_float(row[8])
        tax = _parse_float(row[9])
        if not ntn and not cnic and not name:
            continue
        out.append({
            "ntn_cnic": ntn or cnic,
            "business_name": business_name or name,
            "generation_date": today,
            "payment_code": payment_code_map.get(section, "64150801"),
            "amount": taxable,
            "tax_amount": tax,
        })
    wb.close()
    return out


# ── Record Normalization ──────────────────────────────────────────────────────


def normalize_record(r: dict) -> dict:
    """Normalize a frontend record (with aliases) into the 8-column shape."""
    raw_id = (
        str(r.get("ntn_cnic") or "").strip()
        or str(r.get("cnic") or "").strip()
        or str(r.get("registration_no") or "").strip()
    )
    date_val = (
        str(r.get("generation_date") or "").strip()
        or str(r.get("date") or "").strip()
        or str(r.get("transaction_date") or "").strip()
        or datetime.utcnow().strftime("%Y-%m-%d")
    )
    return {
        "registration_no": format_ntn_cnic_for_storage(raw_id),
        "identification_no": "",
        "name": str(r.get("business_name") or r.get("name") or "").strip(),
        "transaction_date": date_val,
        "payment_code": str(r.get("paymentCode") or r.get("payment_code") or "").strip(),
        "taxable_amount": _parse_amount(r.get("taxableAmount", r.get("amount", r.get("taxable_amount", 0)))),
        "exemption_code": "",
        "tax_amount": _parse_amount(r.get("taxAmount", r.get("tax_amount", 0))),
    }


def _parse_float(v: Any) -> float:
    if v is None:
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    try:
        return float(str(v).replace(",", ""))
    except (ValueError, TypeError):
        return 0.0


def _parse_amount(v: Any) -> float:
    n = _parse_float(v)
    return n if n >= 0 else 0.0
