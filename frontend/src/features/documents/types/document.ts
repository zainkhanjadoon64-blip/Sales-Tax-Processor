// ============================================================================
// Document Module Types
// ============================================================================

// --- Enums ---

export type DocumentType = 'PDF' | 'Excel' | 'Image' | 'Word' | 'Other';

export type DocumentCategory =
  | 'Sales Tax Return'
  | '236H'
  | '153'
  | '165'
  | 'KPRA'
  | 'Income Tax Return'
  | 'Working File'
  | 'Notice'
  | 'Other';

export type FilingStatus =
  | 'Filed'
  | 'Pending'
  | 'Not Filed'
  | 'Overdue'
  | 'Missing'
  | 'Uploaded';

export type DocumentActivityType =
  | 'view'
  | 'download'
  | 'print'
  | 'preview'
  | 'upload'
  | 'delete'
  | 'rename'
  | 'move'
  | 'copy'
  | 'restore'
  | 'share';

export type ViewMode = 'grid' | 'list';

export type SortField = 'file_name' | 'upload_date' | 'file_size' | 'client_name' | 'doc_category' | 'filing_status';
export type SortOrder = 'asc' | 'desc';

// --- Core Types ---

export interface Document {
  id: string;
  client_id: string;
  file_name: string;
  original_file_name: string;
  file_extension: string;
  file_size: number;
  file_path: string;
  file_type: DocumentType;

  // Classification
  doc_category: DocumentCategory | null;
  classification_method: string | null;
  classification_confidence: number;

  // Tax Period
  tax_year: number | null;
  tax_month: number | null;

  // Compliance
  filing_status: FilingStatus | null;
  is_missing: boolean;

  // Dates
  document_date: string | null;
  expiry_date: string | null;
  upload_date: string;

  // Audit
  uploaded_by: string | null;
  deleted_at: string | null;
  is_deleted: boolean;

  // Version
  version: number;
  parent_document_id: string | null;

  // Metadata
  notes: string | null;
  tags: string[] | null;
  custom_metadata: Record<string, unknown>;

  // Batch
  batch_id: string | null;
  checksum: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Computed (from joins)
  client_name?: string;
  client_ntn?: string;
  client_cnic?: string;
  client_strn?: string;
  uploader_name?: string;
}

// --- API Responses ---

export interface DocumentListResponse {
  success: boolean;
  data: Document[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface DocumentStats {
  total_documents: number;
  total_pdf: number;
  total_excel: number;
  recent_uploads_24h: number;
  recent_uploads_7d: number;
  missing_documents: number;
  uploads_this_month: number;
  uploads_previous_month: number;
  monthly_trend: MonthlyTrend[];
  total_clients_with_gaps: number;
}

export interface MonthlyTrend {
  month: string;
  count: number;
}

export interface DocumentStatsResponse {
  success: boolean;
  data: DocumentStats;
}

// --- Folder Types ---

export interface FolderNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  document_count: number;
  children: FolderNode[];
  is_expanded?: boolean;
}

export interface FolderContentsResponse {
  success: boolean;
  data: Document[];
  folder_path: string;
  total: number;
  page: number;
  limit: number;
}

// --- Compliance Types ---

export interface ComplianceDocumentStatus {
  category: DocumentCategory;
  status: 'uploaded' | 'missing' | 'pending' | 'not_required';
  document_id: string | null;
  filing_status: FilingStatus | null;
}

export interface ComplianceMonthStatus {
  month: number;
  month_name: string;
  documents: ComplianceDocumentStatus[];
}

export interface ComplianceSummary {
  total_required: number;
  uploaded: number;
  missing: number;
  pending: number;
  compliance_percentage: number;
}

export interface ComplianceStatusResponse {
  success: boolean;
  data: {
    client: { id: string; name: string; ntn: string | null };
    year: number;
    compliance: ComplianceMonthStatus[];
    summary: ComplianceSummary;
  };
}

export interface MissingDocument {
  client_id: string
  client_name: string
  client_ntn: string | null
  required_type: DocumentCategory
  tax_year: number
  tax_month: number
  deadline: string
  days_overdue: number
  is_overdue: boolean
}

export interface MissingDocumentsResponse {
  success: boolean;
  data: MissingDocument[];
  total: number;
}

export interface MissingCountResponse {
  success: boolean;
  data: {
    total_missing: number;
    overdue: number;
    upcoming: number;
  };
}

// --- Activity Types ---

export interface DocumentActivity {
  id: string;
  document_id: string;
  user_id: string | null;
  activity_type: DocumentActivityType;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user_name?: string;
}

// --- Filter Types ---

export interface DocumentFilters {
  // Search
  q?: string;

  // Category filters
  doc_category?: DocumentCategory[];
  tax_year?: number;
  tax_month?: number[];
  client_id?: string[];
  filing_status?: FilingStatus | null;
  file_type?: DocumentType | null;

  // Date range
  upload_date_from?: string;
  upload_date_to?: string;

  // File size
  file_size_min?: number;
  file_size_max?: number;

  // Compliance
  is_missing?: boolean;

  // Sorting
  sort_by?: SortField;
  sort_order?: SortOrder;

  // Pagination
  page?: number;
  limit?: number;

  // Folder
  folder_path?: string;
}

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  filter_config: DocumentFilters;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

// --- Upload Types ---

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  result?: Document;
  error?: string;
}

export interface BulkUploadRequest {
  client_id: string;
  doc_category?: DocumentCategory;
  tax_year?: number;
  tax_month?: number;
  overwrite?: boolean;
}

export interface BulkUploadResult {
  success: Document[];
  errors: { file_name: string; error: string }[];
  skipped: { file_name: string; reason: string }[];
}

// --- Action Types ---

export interface RenameRequest {
  file_name: string;
}

export interface MoveRequest {
  client_id: string;
  folder_path: string;
}

export interface CopyRequest {
  client_id: string;
  folder_path: string;
}

// --- Document Type Utilities ---

export const DOCUMENT_CATEGORY_OPTIONS: { value: DocumentCategory; label: string; color: string }[] = [
  { value: 'Sales Tax Return', label: 'Sales Tax Return', color: 'bg-blue-100 text-blue-700' },
  { value: '236H', label: '236H', color: 'bg-purple-100 text-purple-700' },
  { value: '153', label: '153', color: 'bg-indigo-100 text-indigo-700' },
  { value: '165', label: '165', color: 'bg-rose-100 text-rose-700' },
  { value: 'KPRA', label: 'KPRA', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'Income Tax Return', label: 'Income Tax Return', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'Working File', label: 'Working File', color: 'bg-slate-100 text-slate-700' },
  { value: 'Notice', label: 'Notice', color: 'bg-amber-100 text-amber-700' },
  { value: 'Other', label: 'Other', color: 'bg-gray-100 text-gray-700' },
];

export const FILING_STATUS_OPTIONS: { value: FilingStatus; label: string; color: string }[] = [
  { value: 'Filed', label: 'Filed', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'Uploaded', label: 'Uploaded', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'Pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  { value: 'Not Filed', label: 'Not Filed', color: 'bg-slate-100 text-slate-700' },
  { value: 'Overdue', label: 'Overdue', color: 'bg-red-100 text-red-700' },
  { value: 'Missing', label: 'Missing', color: 'bg-red-100 text-red-700' },
];

export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

// Helper functions
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getFileTypeIcon(fileType: DocumentType): string {
  switch (fileType) {
    case 'PDF': return 'FileText';
    case 'Excel': return 'Sheet';
    case 'Image': return 'Image';
    case 'Word': return 'FileText';
    default: return 'File';
  }
}

export function getFileTypeColor(fileType: DocumentType): string {
  switch (fileType) {
    case 'PDF': return 'text-red-500';
    case 'Excel': return 'text-emerald-500';
    case 'Image': return 'text-blue-500';
    case 'Word': return 'text-blue-600';
    default: return 'text-slate-500';
  }
}

export function getFileTypeBgColor(fileType: DocumentType): string {
  switch (fileType) {
    case 'PDF': return 'bg-red-50';
    case 'Excel': return 'bg-emerald-50';
    case 'Image': return 'bg-blue-50';
    case 'Word': return 'bg-blue-50';
    default: return 'bg-slate-50';
  }
}