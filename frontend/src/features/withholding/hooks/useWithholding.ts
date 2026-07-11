import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { withholdingService } from '../services/withholdingService';
import type { WithholdingRecordCreate, WithholdingRecordUpdate, WithholdingFilters, WithholdingListResponse } from '../types/withholding';

export function useWithholdingRecords(filters?: WithholdingFilters) {
  return useQuery<WithholdingListResponse>({
    queryKey: ['withholdingRecords', filters],
    queryFn: () => withholdingService.getAll(filters),
  });
}

export function useWithholdingByClient(clientId: string) {
  return useQuery<WithholdingListResponse>({
    queryKey: ['withholdingRecords', { client_id: clientId }],
    queryFn: () => withholdingService.getAll({ client_id: clientId, limit: 50 }),
    enabled: !!clientId,
  });
}

export function useWithholdingRecord(id: string) {
  return useQuery({
    queryKey: ['withholdingRecord', id],
    queryFn: () => withholdingService.getById(id),
    enabled: !!id,
  });
}

export function useCreateWithholdingRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WithholdingRecordCreate) => withholdingService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['withholdingRecords'] }),
  });
}

export function useUpdateWithholdingRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WithholdingRecordUpdate }) =>
      withholdingService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['withholdingRecords'] }),
  });
}

export function useDeleteWithholdingRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => withholdingService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['withholdingRecords'] }),
  });
}

// ---- Import Hooks ----

export function useImportChallan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, sectionType }: { file: File; sectionType?: string }) =>
      withholdingService.importChallan(file, sectionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withholdingRecords'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useImportStatement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => withholdingService.importStatement(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withholdingRecords'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useImportPreview() {
  return useMutation({
    mutationFn: (file: File) => withholdingService.importPreview(file),
  });
}
