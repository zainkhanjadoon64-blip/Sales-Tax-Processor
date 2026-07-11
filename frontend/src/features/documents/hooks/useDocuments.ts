import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService } from '../services/documentService'
import { useDocumentStore } from '../stores/useDocumentStore'
import { useFilterStore } from '../stores/useFilterStore'
import type { DocumentFilters } from '../types/document'

// --- Hook to bridge filter store → service query ---

export function useDocuments() {
  const store = useDocumentStore()
  const filters = useFilterStore()

  // Build filter params from the filter store
  const buildFilters = useCallback((): DocumentFilters => {
    const f: DocumentFilters = {
      q: filters.searchQuery || undefined,
      doc_category: filters.docCategories.length > 0 ? filters.docCategories : undefined,
      tax_year: filters.taxYear ?? undefined,
      tax_month: filters.taxMonths.length > 0 ? filters.taxMonths : undefined,
      client_id: filters.clientIds.length > 0 ? filters.clientIds : undefined,
      filing_status: filters.filingStatus ?? undefined,
      file_type: filters.fileType ?? undefined,
      upload_date_from: filters.uploadDateFrom ?? undefined,
      upload_date_to: filters.uploadDateTo ?? undefined,
      is_missing: filters.isMissing || undefined,
      sort_by: filters.sortBy,
      sort_order: filters.sortOrder,
      page: store.currentPage,
      limit: store.pageSize,
      folder_path: filters.folderPath ?? undefined,
    }
    return f
  }, [filters, store.currentPage, store.pageSize])

  // Fetch documents
  const {
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['documents', buildFilters()],
    queryFn: async () => {
      store.setLoading(true)
      store.setError(null)
      try {
        const filters = buildFilters()
        console.log('[useDocuments] Fetching documents with filters:', filters)
        const result = await documentService.getDocuments(filters)
        console.log('[useDocuments] Received result:', result)
        store.setDocuments(result.data)
        store.setTotalCount(result.total)
        return result
      } catch (err: any) {
        console.error('[useDocuments] Error fetching documents:', err)
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to load documents'
        store.setError(errorMessage)
        throw err
      } finally {
        store.setLoading(false)
      }
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev, // Keep previous data while refetching
  })

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['document-stats'],
    queryFn: async () => {
      const result = await documentService.getStats()
      store.setStats({
        total_documents: result.data.total_documents,
        total_pdf: result.data.total_pdf,
        total_excel: result.data.total_excel,
        recent_uploads_24h: result.data.recent_uploads_24h,
        missing_documents: result.data.missing_documents,
        uploads_this_month: result.data.uploads_this_month,
      })
      return result
    },
    staleTime: 60_000,
  })

  return {
    documents: store.documents,
    total: store.totalCount,
    page: store.currentPage,
    pageSize: store.pageSize,
    isLoading,
    error: error?.message || store.error,
    stats: statsData?.data,
    refetch,
    setCurrentPage: store.setCurrentPage,
    setPageSize: store.setPageSize,
  }
}

// --- Delete mutation ---

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  const store = useDocumentStore()

  return useMutation({
    mutationFn: (id: string) => documentService.deleteDocument(id),
    onSuccess: (_data, id) => {
      store.removeDocument(id)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
    },
  })
}

// --- Batch move mutation ---

export function useBatchMoveDocuments() {
  const queryClient = useQueryClient()
  const store = useDocumentStore()

  return useMutation({
    mutationFn: ({ ids, clientId, folderPath }: { ids: string[]; clientId: string; folderPath: string }) =>
      documentService.batchMove(ids, clientId, folderPath),
    onSuccess: () => {
      store.deselectAll()
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

// --- Batch copy mutation ---

export function useBatchCopyDocuments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ids, clientId, folderPath }: { ids: string[]; clientId: string; folderPath: string }) =>
      documentService.batchCopy(ids, clientId, folderPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

// --- Batch delete mutation ---

export function useBatchDeleteDocuments() {
  const queryClient = useQueryClient()
  const store = useDocumentStore()

  return useMutation({
    mutationFn: (ids: string[]) => documentService.batchDelete(ids),
    onSuccess: (_data, ids) => {
      store.removeDocuments(ids)
      store.deselectAll()
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
    },
  })
}

// --- Rename mutation ---

export function useRenameDocument() {
  const queryClient = useQueryClient()
  const store = useDocumentStore()

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      documentService.renameDocument(id, { file_name: name }),
    onSuccess: (doc) => {
      store.updateDocument(doc.id, doc)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

// --- Move mutation ---

export function useMoveDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, clientId, folderPath }: { id: string; clientId: string; folderPath: string }) =>
      documentService.moveDocument(id, { client_id: clientId, folder_path: folderPath }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

// --- Copy mutation ---

export function useCopyDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, clientId, folderPath }: { id: string; clientId: string; folderPath: string }) =>
      documentService.copyDocument(id, { client_id: clientId, folder_path: folderPath }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

// --- Upload hook ---

export function useUploadDocument() {
  const queryClient = useQueryClient()
  const store = useDocumentStore()

  return useMutation({
    mutationFn: async ({
      file,
      clientId,
      options,
      onProgress,
    }: {
      file: File
      clientId: string
      options?: { doc_category?: string; tax_year?: number; tax_month?: number }
      onProgress?: (pct: number) => void
    }) => {
      return documentService.uploadDocument(file, clientId, options, onProgress)
    },
    onSuccess: (doc) => {
      store.addDocument(doc)
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
    },
  })
}

// --- Batch upload hook ---

export function useBatchUpload() {
  const queryClient = useQueryClient()
  const store = useDocumentStore()

  return useMutation({
    mutationFn: async ({
      files,
      clientId,
      options,
      onFileProgress,
    }: {
      files: File[]
      clientId: string
      options?: { doc_category?: string; tax_year?: number; tax_month?: number; overwrite?: boolean }
      onFileProgress?: (index: number, pct: number) => void
    }) => {
      store.setIsUploading(true)
      try {
        return await documentService.uploadBatch(files, clientId, options, onFileProgress)
      } finally {
        store.setIsUploading(false)
      }
    },
    onSuccess: () => {
      store.clearAllUploads()
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
    },
  })
}

// --- Folder tree hook ---

export function useFolderTree() {
  return useQuery({
    queryKey: ['folders', 'tree'],
    queryFn: () => documentService.getFolderTree(),
    staleTime: 60_000,
  })
}

// --- Compliance hooks ---

export function useMissingDocuments(filters?: { client_id?: string; status?: 'all' | 'overdue' | 'upcoming' }) {
  return useQuery({
    queryKey: ['compliance', 'missing', filters],
    queryFn: () => documentService.getMissingDocuments(filters),
    staleTime: 60_000,
  })
}

export function useMissingCount() {
  return useQuery({
    queryKey: ['compliance', 'missing-count'],
    queryFn: () => documentService.getMissingCount(),
    staleTime: 60_000,
  })
}

export function useComplianceStatus(clientId: string, year: number) {
  return useQuery({
    queryKey: ['compliance', 'status', clientId, year],
    queryFn: () => documentService.getComplianceStatus(clientId, year),
    enabled: !!clientId && year > 0,
    staleTime: 60_000,
  })
}

// --- Notes mutation ---

export function useUpdateNotes() {
  const queryClient = useQueryClient()
  const store = useDocumentStore()

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      documentService.updateNotes(id, notes),
    onSuccess: (doc) => {
      store.updateDocument(doc.id, { notes: doc.notes })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}