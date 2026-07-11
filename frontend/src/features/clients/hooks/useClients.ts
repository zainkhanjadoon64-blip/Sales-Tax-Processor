import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../services/clientService';
import type { ClientCreate, ClientUpdate, ClientFilters, ClientListResponse, ClientActivity } from '../types/client';

interface DuplicateFieldError {
  field: string;
  message: string;
}

function extractDuplicateError(error: unknown): DuplicateFieldError | null {
  const err = error as any;
  if (err?.response?.status === 409) {
    const detail = err.response.data?.detail;
    if (detail && typeof detail === 'object' && detail.field) {
      return detail as DuplicateFieldError;
    }
  }
  return null;
}

export function useClients(filters?: ClientFilters) {
  return useQuery<ClientListResponse>({
    queryKey: ['clients', filters],
    queryFn: () => clientService.getAll(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: () => clientService.getById(id),
    enabled: !!id,
  });
}

export function useCreateClient(onError?: (field: string, message: string) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClientCreate) => clientService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error: unknown) => {
      const dup = extractDuplicateError(error);
      if (dup && onError) {
        onError(dup.field, dup.message);
      }
    },
  });
}

export function useUpdateClient(onError?: (field: string, message: string) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientUpdate }) => clientService.update(id, data),
    onSuccess: async (_, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
        queryClient.invalidateQueries({ queryKey: ['client', id] }),
        queryClient.invalidateQueries({ queryKey: ['withholdingRecords'] }),
      ]);
    },
    onError: (error: unknown) => {
      const dup = extractDuplicateError(error);
      if (dup && onError) {
        onError(dup.field, dup.message);
      }
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useExportClients() {
  return useMutation({
    mutationFn: (filters?: ClientFilters) => clientService.exportCsv(filters),
  });
}

export function useClientActivity(clientId: string) {
  return useQuery<ClientActivity[]>({
    queryKey: ['client-activity', clientId],
    queryFn: async () => {
      const result = await clientService.getActivity(clientId);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}
