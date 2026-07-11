import { create } from 'zustand'
import type { Document, ViewMode, UploadProgress } from '../types/document'

interface DocumentSelection {
  selectedIds: Set<string>
  lastSelectedId: string | null
}

interface DocumentState {
  // Documents data
  documents: Document[]
  totalCount: number
  currentPage: number
  pageSize: number
  isLoading: boolean
  error: string | null

  // View
  viewMode: ViewMode

  // Selection
  selection: DocumentSelection

  // Upload
  uploads: UploadProgress[]
  isUploading: boolean

  // Stats
  totalDocuments: number
  totalPdf: number
  totalExcel: number
  recentUploads24h: number
  missingDocuments: number
  uploadsThisMonth: number

  // Actions: data
  setDocuments: (docs: Document[]) => void
  setTotalCount: (count: number) => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  removeDocument: (id: string) => void
  removeDocuments: (ids: string[]) => void
  addDocument: (doc: Document) => void

  // Actions: view
  setViewMode: (mode: ViewMode) => void

  // Actions: selection
  toggleSelection: (id: string, shiftKey?: boolean) => void
  selectAll: () => void
  deselectAll: () => void
  isSelected: (id: string) => boolean
  getSelectedIds: () => string[]
  getSelectedCount: () => number

  // Actions: upload
  addUpload: (upload: UploadProgress) => void
  updateUploadProgress: (index: number, progress: number) => void
  updateUploadStatus: (index: number, status: UploadProgress['status'], result?: Document, error?: string) => void
  clearCompletedUploads: () => void
  clearAllUploads: () => void
  setIsUploading: (uploading: boolean) => void

  // Actions: stats
  setStats: (stats: {
    total_documents: number
    total_pdf: number
    total_excel: number
    recent_uploads_24h: number
    missing_documents: number
    uploads_this_month: number
  }) => void
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  // Initial state
  documents: [],
  totalCount: 0,
  currentPage: 1,
  pageSize: 25,
  isLoading: false,
  error: null,
  viewMode: (localStorage.getItem('documentViewMode') as ViewMode) || 'list',
  selection: {
    selectedIds: new Set<string>(),
    lastSelectedId: null,
  },
  uploads: [],
  isUploading: false,
  totalDocuments: 0,
  totalPdf: 0,
  totalExcel: 0,
  recentUploads24h: 0,
  missingDocuments: 0,
  uploadsThisMonth: 0,

  // Data actions
  setDocuments: (docs) => set({ documents: docs ?? [] }),
  setTotalCount: (count) => set({ totalCount: count }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === id ? { ...doc, ...updates } : doc
      ),
    })),
  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== id),
      totalCount: state.totalCount - 1,
      selection: {
        ...state.selection,
        selectedIds: new Set(
          [...state.selection.selectedIds].filter((sid) => sid !== id)
        ),
      },
    })),
  removeDocuments: (ids) =>
    set((state) => {
      const idSet = new Set(ids)
      return {
        documents: state.documents.filter((doc) => !idSet.has(doc.id)),
        totalCount: state.totalCount - ids.length,
        selection: {
          selectedIds: new Set(
            [...state.selection.selectedIds].filter((sid) => !idSet.has(sid))
          ),
          lastSelectedId: null,
        },
      }
    }),
  addDocument: (doc) =>
    set((state) => ({
      documents: [doc, ...state.documents],
      totalCount: state.totalCount + 1,
    })),

  // View actions
  setViewMode: (mode) => {
    localStorage.setItem('documentViewMode', mode)
    set({ viewMode: mode })
  },

  // Selection actions
  toggleSelection: (id, shiftKey = false) =>
    set((state) => {
      const newSelected = new Set(state.selection.selectedIds)
      const lastId = state.selection.lastSelectedId

      if (shiftKey && lastId && lastId !== id) {
        // Range selection
        const docs = state.documents
        const startIdx = docs.findIndex((d) => d.id === lastId)
        const endIdx = docs.findIndex((d) => d.id === id)
        if (startIdx !== -1 && endIdx !== -1) {
          const minIdx = Math.min(startIdx, endIdx)
          const maxIdx = Math.max(startIdx, endIdx)
          for (let i = minIdx; i <= maxIdx; i++) {
            newSelected.add(docs[i].id)
          }
        }
      } else {
        if (newSelected.has(id)) {
          newSelected.delete(id)
        } else {
          newSelected.add(id)
        }
      }

      return {
        selection: {
          selectedIds: newSelected,
          lastSelectedId: id,
        },
      }
    }),

  selectAll: () =>
    set((state) => ({
      selection: {
        selectedIds: new Set(state.documents.map((d) => d.id)),
        lastSelectedId: null,
      },
    })),

  deselectAll: () =>
    set({
      selection: {
        selectedIds: new Set<string>(),
        lastSelectedId: null,
      },
    }),

  isSelected: (id) => get().selection.selectedIds.has(id),
  getSelectedIds: () => [...get().selection.selectedIds],
  getSelectedCount: () => get().selection.selectedIds.size,

  // Upload actions
  addUpload: (upload) =>
    set((state) => ({
      uploads: [...state.uploads, upload],
    })),
  updateUploadProgress: (index, progress) =>
    set((state) => ({
      uploads: state.uploads.map((u, i) =>
        i === index ? { ...u, progress } : u
      ),
    })),
  updateUploadStatus: (index, status, result, error) =>
    set((state) => ({
      uploads: state.uploads.map((u, i) =>
        i === index ? { ...u, status, result, error } : u
      ),
    })),
  clearCompletedUploads: () =>
    set((state) => ({
      uploads: state.uploads.filter((u) => u.status !== 'success' && u.status !== 'error'),
    })),
  clearAllUploads: () => set({ uploads: [] }),
  setIsUploading: (uploading) => set({ isUploading: uploading }),

  // Stats actions
  setStats: (stats) =>
    set({
      totalDocuments: stats.total_documents,
      totalPdf: stats.total_pdf,
      totalExcel: stats.total_excel,
      recentUploads24h: stats.recent_uploads_24h,
      missingDocuments: stats.missing_documents,
      uploadsThisMonth: stats.uploads_this_month,
    }),
}))