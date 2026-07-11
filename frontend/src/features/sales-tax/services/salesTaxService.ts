import { apiClient } from '@/services/apiClient';
import type { SalesTaxRecord, SalesTaxRecordCreate, SalesTaxRecordUpdate, SalesTaxListResponse, SalesTaxFilters } from '../types/salesTax';

export const salesTaxService = {
  async getAll(filters?: SalesTaxFilters): Promise<SalesTaxListResponse> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.client_id) params.append('client_id', filters.client_id);
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.sales_tax_registered_only !== undefined) params.append('sales_tax_registered_only', filters.sales_tax_registered_only.toString());
    
    return apiClient.get<SalesTaxListResponse>(`/sales-tax/?${params.toString()}`);
  },

  async getById(id: string): Promise<SalesTaxRecord> {
    return apiClient.get<SalesTaxRecord>(`/sales-tax/${id}`);
  },

  async create(data: SalesTaxRecordCreate & { file?: File | null }): Promise<SalesTaxRecord> {
    // If file is provided, use multipart/form-data
    if (data.file) {
      const formData = new FormData();
      formData.append('client_id', data.client_id);
      formData.append('filing_year', data.filing_year.toString());
      formData.append('filing_month', data.filing_month.toString());
      formData.append('status', data.status ?? '');
      if (data.filing_date !== null && data.filing_date !== undefined) {
        formData.append('filing_date', data.filing_date);
      }
      if (data.remarks !== null && data.remarks !== undefined) {
        formData.append('remarks', data.remarks);
      }
      formData.append('file', data.file);

      return apiClient.post<SalesTaxRecord>('/sales-tax/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    
    // Otherwise, send as JSON
    const { file, ...recordData } = data;
    return apiClient.post<SalesTaxRecord>('/sales-tax/', recordData);
  },

  async update(id: string, data: SalesTaxRecordUpdate): Promise<SalesTaxRecord> {
    return apiClient.put<SalesTaxRecord>(`/sales-tax/${id}`, data);
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/sales-tax/${id}`);
  },

  async bulkCreate(records: SalesTaxRecordCreate[]): Promise<SalesTaxRecord[]> {
    return apiClient.post<SalesTaxRecord[]>('/sales-tax/bulk', records);
  },
};