import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backupService } from '../services/backupService';
import type { Backup } from '../types/backup';

export function useBackups() {
  return useQuery<Backup[]>({
    queryKey: ['backups'],
    queryFn: async () => {
      const result = await backupService.getAll();
      return Array.isArray(result) ? result : [];
    },
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => backupService.create(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });
}

export function useRestoreBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backupService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });
}

export function useDeleteBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backupService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });
}