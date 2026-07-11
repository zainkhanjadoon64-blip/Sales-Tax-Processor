import React, { useState, useCallback, useRef } from 'react'
import { X, Upload, FileText, Sheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useBatchUpload } from '../hooks/useDocuments'
import { useDocumentStore } from '../stores/useDocumentStore'
import type { DocumentCategory } from '../types/document'
import { DOCUMENT_CATEGORY_OPTIONS, MONTHS, formatFileSize } from '../types/document'

interface BulkUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  defaultClientId?: string
}

interface QueuedFile {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

export function BulkUploadDialog({ isOpen, onClose, defaultClientId }: BulkUploadDialogProps) {
  const [files, setFiles] = useState<QueuedFile[]>([])
  const [clientId] = useState(defaultClientId || '')
  const [docCategory, setDocCategory] = useState<DocumentCategory | ''>('')
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear())
  const [taxMonth, setTaxMonth] = useState<number>(new Date().getMonth() + 1)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchUpload = useBatchUpload()
  const isUploading = useDocumentStore((s) => s.isUploading)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const validExts = ['.pdf', '.xlsx', '.xls']
    const maxSize = 25 * 1024 * 1024

    const queued: QueuedFile[] = Array.from(newFiles)
      .filter((f) => {
        const ext = f.name.toLowerCase().substring(f.name.lastIndexOf('.'))
        return validExts.includes(ext)
      })
      .filter((f) => f.size <= maxSize)
      .map((file) => ({ file, status: 'pending' as const, progress: 0 }))

    setFiles((prev) => [...prev, ...queued])
  }, [])

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => setFiles([])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  const handleUpload = async () => {
    if (!clientId || files.length === 0) return

    const fileList = files.map((f) => f.file)
    await batchUpload.mutateAsync({
      files: fileList,
      clientId,
      options: {
        doc_category: docCategory || undefined,
        tax_year: taxYear,
        tax_month: taxMonth,
      },
    })
    onClose()
  }

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i)
  const pendingCount = files.filter((f) => f.status === 'pending').length
  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Upload Documents</h2>
            <p className="text-sm text-slate-500 mt-0.5">Drag & drop files or click to browse</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            mx-6 mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-primary-400 bg-primary-50' : 'border-slate-300 hover:border-primary-300 hover:bg-slate-50'}
          `}
        >
          <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700">
            Drop files here or <span className="text-primary-600">browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">PDF, XLSX, XLS up to 25MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* Metadata form */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value as DocumentCategory | '')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Auto-detect</option>
                {DOCUMENT_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Year</label>
              <select
                value={taxYear}
                onChange={(e) => setTaxYear(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Month</label>
              <select
                value={taxMonth}
                onChange={(e) => setTaxMonth(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0 max-h-64">
          {files.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No files added yet</p>
          ) : (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  {f.file.name.toLowerCase().endsWith('.pdf') ? (
                    <FileText className="h-5 w-5 text-red-400 flex-shrink-0" />
                  ) : (
                    <Sheet className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{f.file.name}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(f.file.size)}</p>
                  </div>
                  {f.status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {f.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {f.status === 'uploading' && <Loader2 className="h-4 w-4 text-primary-500 animate-spin" />}
                  <button onClick={() => removeFile(i)} className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <div className="text-sm text-slate-500">
            {files.length} files ({formatFileSize(totalSize)})
          </div>
          <div className="flex items-center gap-2">
            <button onClick={clearAll} className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900">
              Clear all
            </button>
            <button
              onClick={handleUpload}
              disabled={!clientId || files.length === 0 || isUploading}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload {pendingCount} files
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}