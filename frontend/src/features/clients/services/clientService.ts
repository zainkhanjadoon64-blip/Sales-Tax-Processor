import { apiClient } from '@/services/apiClient';
import type { Client, ClientCreate, ClientUpdate, ClientListResponse, ClientFilters, ClientActivity } from '../types/client';

export const clientService = {
  async getAll(filters?: ClientFilters): Promise<ClientListResponse> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sales_tax_registered !== undefined) params.append('sales_tax_registered', filters.sales_tax_registered.toString());
    if (filters?.withholding_registered !== undefined) params.append('withholding_registered', filters.withholding_registered.toString());
    if (filters?.kpra_registered !== undefined) params.append('kpra_registered', filters.kpra_registered.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.sort_order) params.append('sort_order', filters.sort_order);

    return apiClient.get<ClientListResponse>(`/clients/?${params.toString()}`);
  },

  async getById(id: string): Promise<Client> {
    return apiClient.get<Client>(`/clients/${id}`);
  },

  async create(data: ClientCreate): Promise<Client> {
    return apiClient.post<Client>('/clients/', data);
  },

  async update(id: string, data: ClientUpdate): Promise<Client> {
    return apiClient.put<Client>(`/clients/${id}`, data);
  },

  async delete(id: string, confirm?: boolean): Promise<{ success: boolean; message: string }> {
    const query = confirm ? '?confirm=true' : '';
    return apiClient.delete<{ success: boolean; message: string }>(`/clients/${id}${query}`);
  },

  async exportCsv(filters?: ClientFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.sales_tax_registered !== undefined) params.append('sales_tax_registered', filters.sales_tax_registered.toString());
    if (filters?.withholding_registered !== undefined) params.append('withholding_registered', filters.withholding_registered.toString());
    if (filters?.kpra_registered !== undefined) params.append('kpra_registered', filters.kpra_registered.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    return apiClient.getBlob(`/clients/export/csv?${params.toString()}`);
  },

  async getActivity(clientId: string): Promise<ClientActivity[]> {
    return apiClient.get<ClientActivity[]>(`/clients/${clientId}/activity`);
  },
};
