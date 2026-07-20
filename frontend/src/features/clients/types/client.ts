export interface Client {
  id: string;
  client_name: string;
  business_name: string | null;
  cnic: string | null;
  ntn: string | null;
  strn: string | null;
  contact_number: string | null;
  email: string | null;
  address: string | null;
  sales_tax_registered: boolean;
  withholding_registered: boolean;
  kpra_registered: boolean;
  is_active: boolean;
  notes: string | null;
  contact_person: string | null;
  contact_person_designation: string | null;
  contact_person_phone: string | null;
  contact_person_email: string | null;
  secondary_phone: string | null;
  city: string | null;
  province: string | null;
  business_type: string | null;
  client_type: string | null;
  registration_date: string | null;
  tax_period: string | null;
  fbr_office: string | null;
  sales_tax_material_status: 'MATERIAL' | 'NIL' | null;
  withholding_236_applied: boolean;
  withholding_236_prepared_by_us: boolean;
  withholding_153_applicable: boolean;
  withholding_153_prepared_by_us: boolean;
  withholding_filing_frequency: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientCreate {
  client_name: string;
  business_name?: string;
  cnic?: string;
  ntn?: string;
  strn?: string;
  contact_number?: string;
  email?: string;
  address?: string;
  client_password?: string;
  sales_tax_registered?: boolean;
  withholding_registered?: boolean;
  kpra_registered?: boolean;
  is_active?: boolean;
  notes?: string;
  contact_person?: string;
  contact_person_designation?: string;
  contact_person_phone?: string;
  contact_person_email?: string;
  secondary_phone?: string;
  city?: string;
  province?: string;
  business_type?: string;
  client_type?: string;
  registration_date?: string;
  tax_period?: string;
  fbr_office?: string;
  sales_tax_material_status?: 'MATERIAL' | 'NIL';
  withholding_236_applied?: boolean;
  withholding_236_prepared_by_us?: boolean;
  withholding_153_applicable?: boolean;
  withholding_153_prepared_by_us?: boolean;
  withholding_filing_frequency?: string;
}

export interface ClientUpdate {
  client_name?: string;
  business_name?: string;
  cnic?: string;
  ntn?: string;
  strn?: string;
  contact_number?: string;
  email?: string;
  address?: string;
  client_password?: string;
  sales_tax_registered?: boolean;
  withholding_registered?: boolean;
  kpra_registered?: boolean;
  is_active?: boolean;
  notes?: string;
  contact_person?: string;
  contact_person_designation?: string;
  contact_person_phone?: string;
  contact_person_email?: string;
  secondary_phone?: string;
  city?: string;
  province?: string;
  business_type?: string;
  client_type?: string;
  registration_date?: string;
  tax_period?: string;
  fbr_office?: string;
  sales_tax_material_status?: 'MATERIAL' | 'NIL';
  withholding_236_applied?: boolean;
  withholding_236_prepared_by_us?: boolean;
  withholding_153_applicable?: boolean;
  withholding_153_prepared_by_us?: boolean;
  withholding_filing_frequency?: string;
  id?: string;
}

export interface ClientListResponse {
  success: boolean;
  data: Client[];
  total: number;
  page: number;
  limit: number;
}

export interface ClientFilters {
  page?: number;
  limit?: number;
  search?: string;
  sales_tax_registered?: boolean;
  withholding_registered?: boolean;
  kpra_registered?: boolean;
  is_active?: boolean;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ClientActivity {
  id: string;
  client_id: string;
  action: string;
  action_type?: string;
  description?: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  performed_by: string;
  created_at: string;
}
