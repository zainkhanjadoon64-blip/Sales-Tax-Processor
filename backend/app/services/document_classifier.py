"""
Document Classifier Service
Automatically categorizes uploaded documents based on file name patterns,
content analysis, and client context.
"""
import re
from dataclasses import dataclass
from typing import Optional
from app.models.document import DocumentCategory


@dataclass
class ClassificationResult:
    category: DocumentCategory
    confidence: float  # 0.0 - 1.0
    method: str  # 'pattern', 'content', 'client_context', 'manual', 'fallback'


# Pattern-based classification rules
# Each category maps to list of keywords/patterns to match against file name
PATTERN_RULES: dict[DocumentCategory, list[str]] = {
    DocumentCategory.SALES_TAX_RETURN: [
        'sales.tax', 'sales tax return', 'str_', '_str_', 'sales_tax',
        'st.return', 'st return', 'salestax',
    ],
    DocumentCategory.SECTION_236H: [
        '236h', '236-h', 'section_236', 'sec.236', 'sec 236',
        'withholding_236', 'wht_236',
    ],
    DocumentCategory.SECTION_153: [
        '153', 'section_153', 'sec.153', 'sec 153',
        'withholding_153', 'wht_153', 'whts',
    ],
    DocumentCategory.SECTION_165: [
        '165', 'section_165', 'sec.165', 'sec 165',
        'whts_165', 'wht_165', 'withholding_165',
        'non_resident', 'non-resident', 'nonresident',
    ],
    DocumentCategory.KPRA: [
        'kpra', 'k.p.r.a', 'punjab_revenue', 'punjab revenue',
        'kp_revenue',
    ],
    DocumentCategory.INCOME_TAX_RETURN: [
        'income.tax', 'income tax return', 'it_return', 'itr_',
        'annual_return', 'tax_return',
    ],
    DocumentCategory.WORKING_FILE: [
        'working', 'work_paper', 'workpaper', 'wp_', '_wp',
        'working_file', 'calculation', 'working_paper',
    ],
    DocumentCategory.NOTICE: [
        'notice', 'show_cause', 'scn', 'demand_notice',
        'tax_notice', 'compliance_notice',
    ],
}


def classify_by_filename(file_name: str) -> ClassificationResult:
    """
    Classify a document based on its file name patterns.
    """
    name_lower = file_name.lower().replace('-', '_').replace(' ', '_')

    # Try each category's patterns
    for category, patterns in PATTERN_RULES.items():
        for pattern in patterns:
            # Normalize pattern for comparison
            pattern_normalized = pattern.lower().replace('-', '_').replace(' ', '_')
            if pattern_normalized in name_lower:
                return ClassificationResult(
                    category=category,
                    confidence=0.8,
                    method='pattern',
                )

    # Try regex-based matching for numeric patterns
    # Section 236H patterns: 236h, 236-H
    if re.search(r'236\s*h', name_lower):
        return ClassificationResult(
            category=DocumentCategory.SECTION_236H,
            confidence=0.85,
            method='pattern',
        )

    # Section 153: standalone "153" in context of withholding
    if re.search(r'\b153\b', name_lower) and ('wht' in name_lower or 'withhold' in name_lower or 'statement' in name_lower):
        return ClassificationResult(
            category=DocumentCategory.SECTION_153,
            confidence=0.8,
            method='pattern',
        )

    # Section 165: standalone "165" in context of withholding or non-resident
    if re.search(r'\b165\b', name_lower) and ('wht' in name_lower or 'withhold' in name_lower or 'statement' in name_lower or 'non.resident' in name_lower or 'nonresident' in name_lower):
        return ClassificationResult(
            category=DocumentCategory.SECTION_165,
            confidence=0.8,
            method='pattern',
        )

    # File extension-based fallback
    if name_lower.endswith('.pdf'):
        return ClassificationResult(
            category=DocumentCategory.OTHER,
            confidence=0.3,
            method='fallback',
        )

    if name_lower.endswith(('.xlsx', '.xls')):
        return ClassificationResult(
            category=DocumentCategory.WORKING_FILE,
            confidence=0.4,
            method='fallback',
        )

    return ClassificationResult(
        category=DocumentCategory.OTHER,
        confidence=0.2,
        method='fallback',
    )


def classify_by_folder_context(folder_path: Optional[str]) -> Optional[ClassificationResult]:
    """
    Classify based on the folder path where the document is being uploaded.
    """
    if not folder_path:
        return None

    path_lower = folder_path.lower()

    folder_category_map = {
        'salestax': DocumentCategory.SALES_TAX_RETURN,
        'sales_tax': DocumentCategory.SALES_TAX_RETURN,
        '236h': DocumentCategory.SECTION_236H,
        '153': DocumentCategory.SECTION_153,
        '165': DocumentCategory.SECTION_165,
        '165': DocumentCategory.SECTION_165,
        'kpra': DocumentCategory.KPRA,
        'income_tax': DocumentCategory.INCOME_TAX_RETURN,
        'incometax': DocumentCategory.INCOME_TAX_RETURN,
        'working': DocumentCategory.WORKING_FILE,
        'notice': DocumentCategory.NOTICE,
    }

    for key, category in folder_category_map.items():
        if key in path_lower:
            return ClassificationResult(
                category=category,
                confidence=0.6,
                method='client_context',
            )

    return None


def classify_document(
    file_name: str,
    folder_path: Optional[str] = None,
    manual_category: Optional[str] = None,
) -> ClassificationResult:
    """
    Main classification entry point. Tries multiple strategies in order:
    1. Manual override (if provided)
    2. Filename pattern matching
    3. Folder context
    4. Fallback
    """
    # If user manually specified a category, use it
    if manual_category:
        try:
            category = DocumentCategory(manual_category)
            return ClassificationResult(
                category=category,
                confidence=1.0,
                method='manual',
            )
        except ValueError:
            pass

    # Try filename pattern matching
    filename_result = classify_by_filename(file_name)
    if filename_result.confidence >= 0.6:
        return filename_result

    # Try folder context
    folder_result = classify_by_folder_context(folder_path)
    if folder_result and folder_result.confidence >= filename_result.confidence:
        return folder_result

    # Return best result
    if folder_result and folder_result.confidence > filename_result.confidence:
        return folder_result

    return filename_result


def generate_standardized_filename(
    client_name: str,
    ntn: Optional[str],
    category: DocumentCategory,
    tax_year: Optional[int],
    tax_month: Optional[int],
    original_ext: str,
) -> str:
    """
    Generate a standardized file name for a document.
    
    Pattern: {CLIENT}_{NTN}_{CATEGORY}_{YEAR}_{MONTH}{ext}
    """
    import calendar

    safe_name = client_name.replace(" ", "_").replace("/", "_").replace("\\", "_").upper()
    ntn_part = ntn.replace("-", "").replace(" ", "") if ntn else "NONTN"

    # Category abbreviation
    category_abbrevs = {
        DocumentCategory.SALES_TAX_RETURN: "SALES_TAX",
        DocumentCategory.SECTION_236H: "236H",
        DocumentCategory.SECTION_153: "153",
        DocumentCategory.SECTION_165: "165",
        DocumentCategory.KPRA: "KPRA",
        DocumentCategory.INCOME_TAX_RETURN: "IT_RETURN",
        DocumentCategory.WORKING_FILE: "WORKING",
        DocumentCategory.NOTICE: "NOTICE",
        DocumentCategory.OTHER: "DOC",
    }

    cat_part = category_abbrevs.get(category, "DOC")

    # Year and month parts
    year_part = str(tax_year) if tax_year else "YYYY"
    if tax_month and 1 <= tax_month <= 12:
        month_name = calendar.month_abbr[tax_month].upper()
    else:
        month_name = "XX"

    return f"{safe_name}_{ntn_part}_{cat_part}_{year_part}_{month_name}{original_ext}"