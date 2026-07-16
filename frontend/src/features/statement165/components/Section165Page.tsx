import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Eye, Edit, Download, Shield, Trash2, Database, Cloud, Loader2,
  X, ChevronRight, List, RefreshCw, FileWarning, Upload, Merge,
} from 'lucide-react'
import type { WhtEntry } from '../types'
import AnimatedList from './AnimatedList'
import { formatPkr } from '../types'
import * as api from '../services/statement165Service'

type Step = 'input' | 'draft' | 'final'

type UploadError = {
  file: File
  message: string
}

const ALLOWED_EXTENSIONS = ['.pdf', '.xlsx', '.xlsm']
const MAX_FILE_SIZE_MB = 10

function getFileExtension(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

function validateFile(file: File): string | null {
  const ext = getFileExtension(file.name)
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Unsupported file type "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit`
  }
  return null
}

export function Section165Page() {
  const [activeStep, setActiveStep] = useState<Step>('input')
  const [entries, setEntries] = useState<WhtEntry[]>([])
  const [sessionStatus, setSessionStatus] = useState({ status: 'ready', autoSave: 'completed', lastBackup: '10 min ago', lastSaved: '30 seconds ago', version: '2.0.0' })
  const [savedSessions, setSavedSessions] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [processingFiles, setProcessingFiles] = useState<string[]>([])
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const processInputRef = useRef<HTMLInputElement>(null)

  const [showAppendModal, setShowAppendModal] = useState(false)
  const [existingFile, setExistingFile] = useState<File | null>(null)
  const [existingEntries, setExistingEntries] = useState<WhtEntry[]>([])
  const [appendLoading, setAppendLoading] = useState(false)
  const appendInputRef = useRef<HTMLInputElement>(null)

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  useEffect(() => {
    api.getSystemStatus().then((r: any) => {
      if (r?.status) setSessionStatus(r.status)
    }).catch(() => {})
    api.listSessions().then((r: any) => {
      if (r?.sessions) setSavedSessions(r.sessions)
    }).catch(() => {})
    const hb = setInterval(() => api.ping().catch(() => {}), 300000)
    return () => clearInterval(hb)
  }, [])

  const totals = useMemo(() => ({
    taxable: entries.reduce((s, e) => s + e.taxable, 0),
    tax: entries.reduce((s, e) => s + e.tax, 0),
  }), [entries])

  const clearUploadErrors = () => setUploadErrors([])

  const removeEntry = (ids: string | string[]) => {
    const idList = Array.isArray(ids) ? ids : [ids]
    setDeletingIds(prev => new Set([...prev, ...idList]))
    setTimeout(() => {
      setEntries(prev => prev.filter(e => !idList.includes(e.id)))
      setDeletingIds(prev => {
        const next = new Set(prev)
        idList.forEach(id => next.delete(id))
        return next
      })
    }, 300)
  }

  const handleUpload = async (file: File): Promise<{ successCount: number; errorCount: number }> => {
    const fileError = validateFile(file)
    if (fileError) {
      setUploadErrors(prev => [...prev, { file, message: fileError }])
      return { successCount: 0, errorCount: 1 }
    }
    try {
      const result: any = await api.uploadStatementFile(file)
      const errors: { file: string; error: string }[] = result.errors || []
      const entries = result.entries || []

      if (entries.length > 0) {
        setEntries(prev => [...prev, ...entries])
      }

      if (errors.length > 0) {
        setUploadErrors(prev => [...prev, ...errors.map((e: any) => ({ file, message: e.error || 'Unknown error' }))])
      }

      return { successCount: entries.length, errorCount: errors.length }
    } catch (err: any) {
      const message = err?.message || err?.statusText || 'Upload failed'
      setUploadErrors(prev => [...prev, { file, message }])
      return { successCount: 0, errorCount: 1 }
    }
  }

  const handleUploadMultiple = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setLoading(true)
    setUploadErrors([])
    const fileList = Array.from(files)
    setProcessingFiles(fileList.map(f => f.name))
    let totalSuccess = 0
    let totalErrors = 0
    for (const file of fileList) {
      const result = await handleUpload(file)
      totalSuccess += result.successCount
      totalErrors += result.errorCount
      setProcessingFiles(prev => prev.filter(n => n !== file.name))
    }
    setProcessingFiles([])
    setLoading(false)

    if (totalErrors > 0 && totalSuccess > 0) {
      notify('error', `Imported ${totalSuccess} entries, ${totalErrors} file(s) had errors`)
    } else if (totalErrors > 0) {
      notify('error', `${totalErrors} file(s) failed to import`)
    } else if (totalSuccess > 0) {
      notify('success', `Successfully imported ${totalSuccess} entries`)
    }
  }

  const retryUpload = async (uploadError: UploadError) => {
    setUploadErrors(prev => prev.filter(e => e.file !== uploadError.file))
    setProcessingFiles(prev => [...prev, uploadError.file.name])
    const result = await handleUpload(uploadError.file)
    setProcessingFiles(prev => prev.filter(n => n !== uploadError.file.name))
    if (result.successCount > 0) {
      notify('success', `Retry successful: ${result.successCount} entries imported`)
    }
  }

  const handleProcess = async () => {
    if (entries.length === 0) return
    setActiveStep('final')
    setLoading(true)
    try {
      const blob = await api.processStatement(entries)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `165_Statement_${Date.now()}.xlsm`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to process statement. Check backend connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleAppendExisting = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAppendLoading(true)
    setExistingFile(file)
    try {
      const result: any = await api.uploadExistingStatement(file)
      if (result.entries) {
        setExistingEntries(result.entries)
      }
      notify('success', `Found ${result.count || 0} entries in existing file`)
    } catch {
      notify('error', 'Failed to read existing file')
      setExistingFile(null)
      setExistingEntries([])
    } finally {
      setAppendLoading(false)
    }
  }

  const handleMergeAndDownload = async () => {
    if (!existingFile || entries.length === 0) return
    setAppendLoading(true)
    try {
      const blob = await api.appendToExistingStatement(existingFile, entries)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `165_Statement_Merged_${Date.now()}.xlsm`
      a.click()
      URL.revokeObjectURL(url)
      setShowAppendModal(false)
      setExistingFile(null)
      setExistingEntries([])
      notify('success', `Merged ${entries.length} entries into existing file`)
    } catch {
      notify('error', 'Failed to merge. Check backend connection.')
    } finally {
      setAppendLoading(false)
    }
  }

  const handleDownload = async (sessionId: string) => {
    try {
      const resp = await fetch(`/api/v1/withholding/statement-165/export/${sessionId}`)
      if (!resp.ok) throw new Error('Download failed')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const cd = resp.headers.get('Content-Disposition') || ''
      const match = cd.match(/filename="?(.+?)"?$/)
      const filename = match?.[1] || `165_Statement_${sessionId}.xlsx`
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }

  const getStatusDot = (stat: string) => {
    if (stat === 'ready' || stat === 'completed') return 'bg-green-500'
    if (stat === 'processing') return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <style>{`@keyframes slide-right{to{opacity:0;transform:translateX(40px)}} .del{animation:slide-right .3s ease forwards}`}</style>
      {/* Top Bar — Header + Stepper */}
      <div className="flex items-center bg-white px-6 pt-4 pb-12">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Section 165 Statement</h1>
          <p className="text-sm text-slate-500">Dashboard</p>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="flex items-start">
            {[
              { key: 'input' as Step, label: 'Input Data', num: 1 },
              { key: 'draft' as Step, label: 'Draft Preview', num: 2 },
              { key: 'final' as Step, label: 'Final Statement', num: 3 },
            ].map((step, idx) => {
              const isActive = activeStep === step.key
              const isCompleted = entries.length > 0 && (step.key === 'input' || (step.key === 'draft' && activeStep !== 'input'))
              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <button type="button" onClick={() => setActiveStep(step.key)}>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                        isActive || isCompleted ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isCompleted && step.key !== activeStep ? '✓' : step.num}
                      </div>
                    </button>
                    <p className={`mt-1.5 text-sm font-semibold whitespace-nowrap ${isActive ? 'text-blue-600' : 'text-slate-600'}`}>{step.label}</p>
                  </div>
                  {idx < 2 && <div className="mx-2 w-20 self-start mt-[19px]" style={{ height: '2px', background: 'repeating-linear-gradient(to right, #cbd5e1 0px, #cbd5e1 2px, transparent 2px, transparent 8px)' }} />}
                </div>
              )
            })}
          </div>
        </div>
        <div className="flex-1 flex justify-end">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            <Database className="h-3.5 w-3.5" />
            History
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-4 overflow-auto p-4 lg:grid lg:grid-cols-[1.2fr_1.6fr_1.2fr]">
        {/* Left Column - Input Section */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Input Section</h2>
                <p className="text-xs text-slate-400">Add or import taxpayer data</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <Cloud className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-xs text-slate-500">Drag & drop your files here</p>
              <p className="my-1.5 text-xs text-slate-400">or</p>
              <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Uploading...' : 'Choose Files'}
                <input ref={inputRef} type="file" className="hidden" multiple accept=".pdf,.xlsx,.xlsm" disabled={loading} onChange={e => { handleUploadMultiple(e.target.files); e.target.value = '' }} />
              </label>
              <p className="mt-1.5 text-xs text-slate-400">Supports: .pdf, .xlsx, .xlsm (multiple, max {MAX_FILE_SIZE_MB}MB each)</p>
            </div>

            {/* Upload Progress */}
            {processingFiles.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {processingFiles.map(fileName => (
                  <div key={fileName} className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    <span className="truncate text-xs text-blue-700">{fileName}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Errors */}
            {uploadErrors.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-red-700">{uploadErrors.length} file(s) failed</p>
                  <button onClick={clearUploadErrors} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
                </div>
                {uploadErrors.map(err => (
                  <div key={`${err.file.name}-${err.message}`} className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <FileWarning className="h-3.5 w-3.5 shrink-0 text-red-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-red-700">{err.file.name}</p>
                      <p className="truncate text-xs text-red-500">{err.message}</p>
                    </div>
                    {!loading && (
                      <button onClick={() => retryUpload(err)} className="flex shrink-0 items-center gap-1 rounded bg-white px-2 py-1 text-xs font-medium text-blue-600 shadow-sm hover:bg-blue-50">
                        <RefreshCw className="h-3 w-3" /> Retry
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Entries */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 overflow-hidden w-full">
            {notification && (
              <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                notification.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {notification.message}
              </div>
            )}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Recent Entries</h3>
                <span className="flex h-5 items-center rounded-full bg-blue-100 px-2 text-xs font-bold text-blue-700">{entries.length}</span>
              </div>
              <div className="flex items-center gap-2">
                {entries.length > 0 && (
                  <button onClick={() => removeEntry(entries.map(e => e.id))} className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}

              </div>
            </div>
            <div className="w-full">
              {entries.length === 0 && !loading ? (
                <p className="py-4 text-center text-xs text-slate-400">No entries yet. Add taxpayer data to begin.</p>
              ) : (
                <>
                  {loading && entries.length === 0 && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    </div>
                  )}
                  {entries.length > 0 && (
                    <AnimatedList
                      items={entries}
                      showGradients={true}
                      enableArrowNavigation={false}
                      displayScrollbar={true}
                      renderItem={(entry: WhtEntry) => (
                        <div
                          className={`grid items-center gap-2 rounded-lg border px-3 py-2 ${deletingIds.has(entry.id) ? 'del' : ''} ${entry.error ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'}`}
                          style={{ gridTemplateColumns: '1fr auto' }}
                          title={entry.error || undefined}
                        >
                          <div className="min-w-0">
                            <p className={`truncate text-xs font-semibold ${entry.error ? 'text-red-700' : 'text-slate-800'}`}>{entry.name}</p>
                            {entry.error ? (
                              <p className="truncate text-xs text-red-500">{entry.error}</p>
                            ) : (
                              <p className="truncate text-xs text-slate-400">{entry.cnicNtn || '—'} · Rs. {formatPkr(entry.tax)}</p>
                            )}
                          </div>
                          <button onClick={() => removeEntry(entry.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center Column - Draft Section */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Draft Section</h2>
                <p className="text-xs text-slate-400">Review and edit draft statement</p>
              </div>
            </div>

            {/* Stats bar */}
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Statement Period</p>
                <p className="text-sm font-bold text-slate-800">{entries.length > 0 ? 'Current Session' : '—'}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Total Entries</p>
                <p className="text-sm font-bold text-slate-800">{entries.length}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Tax Amount</p>
                <p className="text-sm font-bold text-blue-700">Rs. {formatPkr(totals.tax)}</p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-2 font-semibold">S.No</th>
                    <th className="py-2 pr-2 font-semibold">Name of T-Payee</th>
                    <th className="py-2 pr-2 font-semibold">CNIC/NTN</th>
                    <th className="py-2 pr-2 font-semibold text-right">Taxable</th>
                    <th className="py-2 pr-2 font-semibold text-right">Tax</th>
                    <th className="py-2 font-semibold">Code</th>
                    <th className="py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400">No entries in draft. Add data from the Input Section.</td></tr>
                  ) : (
                    entries.map((entry, idx) => (
                      <tr key={entry.id} className={`border-b border-slate-100 hover:bg-slate-50 ${deletingIds.has(entry.id) ? 'del' : ''}`}>
                        <td className="py-2 pr-2 text-slate-500">{idx + 1}</td>
                        <td className="py-2 pr-2 font-medium text-slate-800">{entry.name}</td>
                        <td className="py-2 pr-2 text-slate-500">{entry.cnicNtn || '—'}</td>
                        <td className="py-2 pr-2 text-right text-slate-600">{formatPkr(entry.taxable)}</td>
                        <td className="py-2 pr-2 text-right text-slate-600">{formatPkr(entry.tax)}</td>
                        <td className="py-2 pr-2 text-slate-500">{entry.code || '—'}</td>
                        <td className="py-2">
                          <button onClick={() => removeEntry(entry.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {entries.length > 0 && (
              <p className="mt-2 text-xs text-slate-400">
                Showing {entries.length} of {entries.length} entries.
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button onClick={() => setActiveStep('input')} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
              <button onClick={() => setActiveStep('input')} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                <Edit className="h-3.5 w-3.5" /> Edit Draft
              </button>
            </div>
          </div>

        </div>

        {/* Right Column - Process Section */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 pb-24">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Process Section</h2>
                <p className="text-xs text-slate-400">Generate and export final statement</p>
              </div>
            </div>

            {/* Drag & Drop */}
            <div className="mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 py-14 text-center">
              <Cloud className="mb-2 h-8 w-8 text-blue-400" />
              <p className="text-xs font-medium text-slate-600">Drag & Drop your files here</p>
              <p className="my-1.5 text-xs text-slate-400">or</p>
              <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Uploading...' : 'Choose Files'}
                <input ref={processInputRef} type="file" className="hidden" multiple accept=".pdf,.xlsx,.xlsm" disabled={loading} onChange={e => { handleUploadMultiple(e.target.files); e.target.value = '' }} />
              </label>
              <p className="mt-1.5 text-xs text-slate-400">Supports: .pdf, .xlsx, .xlsm (multiple, max {MAX_FILE_SIZE_MB}MB each)</p>
            </div>

            {processingFiles.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {processingFiles.map(fileName => (
                  <div key={fileName} className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    <span className="truncate text-xs text-blue-700">{fileName}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Process Button */}
            <button
              onClick={handleProcess}
              disabled={entries.length === 0}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" /> Process Statement
            </button>

            {/* Already Have a Sheet */}
            <button
              onClick={() => setShowAppendModal(true)}
              className="mb-4 w-full rounded-lg border border-slate-100 bg-slate-50 p-3 text-left hover:bg-slate-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Already Have a Sheet?</p>
                  <p className="text-xs text-slate-400">Upload existing file to append data</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </button>

            {/* System Status */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <h3 className="mb-3 text-xs font-bold text-slate-700">System Status</h3>
              <div className="space-y-2">
                {[
                  { label: 'System Ready', value: sessionStatus.status, dot: getStatusDot(sessionStatus.status), time: '2 min ago' },
                  { label: 'Auto-save Completed', value: sessionStatus.autoSave, dot: getStatusDot(sessionStatus.autoSave), time: '5 min ago' },
                  { label: 'Last Backup', value: sessionStatus.lastBackup, dot: 'bg-green-500', time: sessionStatus.lastBackup },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                      <span className="text-xs text-slate-600">{item.label}</span>
                    </div>
                    <span className="text-xs text-slate-400">{item.time}</span>
                  </div>
                ))}
              </div>
              <button className="mt-2 text-xs font-semibold text-blue-600 hover:underline">View all logs →</button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Shield className="h-3.5 w-3.5 text-green-500" />
          Your data is secure and encrypted
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Last saved: {sessionStatus.lastSaved}</span>
          <span>Version {sessionStatus.version}</span>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Statement History</h2>
              <button onClick={() => setShowHistory(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            {savedSessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No saved sessions found.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2 pr-2 font-semibold">File</th>
                    <th className="pb-2 pr-2 font-semibold">Entries</th>
                    <th className="pb-2 pr-2 font-semibold text-right">Tax</th>
                    <th className="pb-2 pr-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Date</th>
                    <th className="pb-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {savedSessions.map(s => (
                    <tr key={s.id} className="border-b border-slate-100">
                      <td className="py-2 pr-2 font-medium text-slate-800">{s.fileName || 'N/A'}</td>
                      <td className="py-2 pr-2 text-slate-500">{s.entryCount || 0}</td>
                      <td className="py-2 pr-2 text-right text-slate-600">Rs. {formatPkr(s.taxTotal || 0)}</td>
                      <td className="py-2 pr-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.status === 'completed' ? 'bg-green-100 text-green-700' :
                          s.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{s.status}</span>
                      </td>
                      <td className="py-2 pr-2 text-xs text-slate-400">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="py-2">
                        <button onClick={() => handleDownload(s.sessionId)} className="rounded p-1 text-blue-600 hover:bg-blue-50">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Append Modal */}
      {showAppendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Append to Existing Sheet</h2>
              <button onClick={() => { setShowAppendModal(false); setExistingFile(null); setExistingEntries([]) }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <p className="mb-4 text-sm text-slate-500">Upload an existing .xlsm statement, then merge new entries into it.</p>

            {/* Upload existing file */}
            <div className="mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <Upload className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-xs text-slate-500">Upload existing .xlsm or .xlsx file</p>
              <p className="my-1.5 text-xs text-slate-400">or</p>
              <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {appendLoading ? 'Reading...' : 'Choose File'}
                <input ref={appendInputRef} type="file" className="hidden" accept=".xlsm,.xlsx" disabled={appendLoading} onChange={handleAppendExisting} />
              </label>
            </div>

            {/* Existing entries */}
            {existingEntries.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-bold text-slate-700">Existing Entries ({existingEntries.length})</h3>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50">
                      <tr className="text-slate-500">
                        <th className="px-2 py-1 font-semibold">Name</th>
                        <th className="px-2 py-1 font-semibold">CNIC/NTN</th>
                        <th className="px-2 py-1 font-semibold text-right">Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingEntries.map((e) => (
                        <tr key={e.id} className="border-t border-slate-100">
                          <td className="px-2 py-1 text-slate-700">{e.name}</td>
                          <td className="px-2 py-1 text-slate-500">{e.cnicNtn || '—'}</td>
                          <td className="px-2 py-1 text-right text-slate-600">Rs. {formatPkr(e.tax)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Merge info */}
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-sm">
                <Merge className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700">
                  {entries.length > 0
                    ? `${entries.length} new entr${entries.length > 1 ? 'ies' : 'y'} will be appended after existing ${existingEntries.length > 0 ? existingEntries.length : '...'}`
                    : 'Add entries from Step 1 first, then merge them into an existing file.'}
                </span>
              </div>
            </div>

            {/* Merge button */}
            <button
              onClick={handleMergeAndDownload}
              disabled={!existingFile || entries.length === 0 || appendLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {appendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {appendLoading ? 'Merging...' : 'Merge & Download'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Input Field Sub-component ── */


