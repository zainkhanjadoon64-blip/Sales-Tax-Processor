import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import DOMPurify from 'dompurify'
import { Loader2, AlertCircle, Table, ChevronLeft, ChevronRight } from 'lucide-react'
import { documentService } from '../services/documentService'

interface ExcelPreviewProps {
  documentId: string
}

export function ExcelPreview({ documentId }: ExcelPreviewProps) {
  const [sheets, setSheets] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const workbookRef = useRef<XLSX.WorkBook | null>(null)

  const documentIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const docChanged = documentIdRef.current !== documentId

    async function loadExcel() {
      try {
        setLoading(true)
        setError(null)
        if (docChanged || !workbookRef.current) {
          const buffer = await documentService.getFileAsArrayBuffer(documentId)
          if (cancelled) return
          workbookRef.current = XLSX.read(buffer, { type: 'array' })
          documentIdRef.current = documentId
        }
        if (cancelled) return

        const wb = workbookRef.current
        setSheets(wb.SheetNames)
        const firstSheet = wb.SheetNames[0]
        if (firstSheet) {
          const raw = XLSX.utils.sheet_to_html(wb.Sheets[firstSheet], { id: 'excel-preview-table' })
          setHtmlContent(DOMPurify.sanitize(raw))
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load Excel file')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadExcel()
    return () => { cancelled = true }
  }, [documentId])

  const switchSheet = useCallback((index: number) => {
    if (index < 0 || index >= sheets.length) return
    const wb = workbookRef.current
    if (!wb) return
    setActiveSheet(index)
    const raw = XLSX.utils.sheet_to_html(wb.Sheets[sheets[index]], { id: 'excel-preview-table' })
    setHtmlContent(DOMPurify.sanitize(raw))
  }, [sheets])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading Excel preview...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 mb-1">Preview not available</p>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {sheets.length > 1 && (
        <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => switchSheet(activeSheet - 1)}
            disabled={activeSheet === 0}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {sheets.map((name, i) => (
            <button
              key={name}
              onClick={() => switchSheet(i)}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                i === activeSheet
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Table className="h-3 w-3 inline mr-1" />
              {name}
            </button>
          ))}
          <button
            onClick={() => switchSheet(activeSheet + 1)}
            disabled={activeSheet === sheets.length - 1}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4 bg-white">
        <div
          className="excel-preview-wrapper"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  )
}
