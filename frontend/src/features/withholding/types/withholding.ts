export type WithholdingType = '236H' | '153' | '165';

export interface WithholdingDocumentInfo {
  id: string;
  file_name: string;
  original_file_name?: string | null;
  file_path?: string | null;
  file_size?: number | null;
}

export interface WithholdingRecord {
  id: string;
  client_id: string;
  client_name?: string;
  section_type: WithholdingType;
  period: string;
  challan_number: string | null;
  amount: number | null;
  payment_date: string | null;
  payment_section?: string | null;
  payment_description?: string | null;
  payment_section_code?: string | null;
  remarks: string | null;
  document_id: string | null;
  document?: WithholdingDocumentInfo | null;
  created_at: string;
  updated_at: string;
}

export interface WithholdingRecordCreate {
  client_id: string;
  section_type: WithholdingType;
  period: string;
  challan_number?: string | null;
  amount?: number | null;
  payment_date?: string | null;
  remarks?: string | null;
}

export interface WithholdingRecordUpdate {
  section_type?: WithholdingType;
  period?: string;
  challan_number?: string | null;
  amount?: number | null;
  payment_date?: string | null;
  remarks?: string | null;
}

export interface WithholdingListResponse {
  success: boolean;
  data: WithholdingRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface WithholdingFilters {
  page?: number;
  limit?: number;
  client_id?: string;
  section_type?: WithholdingType;
  period?: string;
  withholding_registered_only?: boolean;
}

// --------------- Import Types ---------------

export interface ImportFileInfo {
  saved_path: string;
  file_name: string;
}

export interface ImportClientInfo {
  id: string;
  client_name: string;
  created: boolean;
}

export interface ImportRecordInfo {
  id: string;
  section_type: string;
  period: string;
  amount: number;
  payment_section?: string | null;
  payment_description?: string | null;
  payment_section_code?: string | null;
  document_id?: string | null;
}

export interface ImportChallanResponse {
  success: boolean;
  client: ImportClientInfo;
  records: ImportRecordInfo[];
  file: ImportFileInfo;
  warnings: string[];
}

export interface ImportStatementResponse {
  success: boolean;
  rows_processed: number;
  rows_failed: number;
  clients: ImportClientInfo[];
  records: ImportRecordInfo[];
  errors: string[];
  warnings: string[];
}

export interface ImportPreviewChallanFields {
  section_type: string;
  client_name: string;
  ntn: string | null;
  cnic: string | null;
  period: string;
  challan_number: string | null;
  amount: string | null;
  payment_date: string | null;
  payment_section?: string | null;
  payment_description?: string | null;
  payment_section_code?: string | null;
}

export interface ImportPreviewRow {
  line_number: number;
  ntn: string | null;
  client_name: string | null;
  section_type: string | null;
  period: string | null;
  challan_number: string | null;
  amount: string | null;
  warnings: string[];
}

export interface ImportPreviewResponse {
  success: boolean;
  detected_type: 'challan' | 'statement';
  fields?: ImportPreviewChallanFields;
  rows?: ImportPreviewRow[];
  total_rows?: number;
  parsed_rows?: number;
  errors?: string[];
  confidence?: Record<string, boolean>;
  pending_clients?: PendingClient[];
}

export interface PendingClient {
  client_name: string;
  ntn?: string | null;
  cnic?: string | null;
}

export const WITHHOLDING_TYPES: { value: WithholdingType; label: string }[] = [
  { value: '236H', label: '236H' },
  { value: '153', label: '153' },
  { value: '165', label: '165' },
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