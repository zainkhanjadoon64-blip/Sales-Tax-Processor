import { useState, useEffect, useMemo } from 'react'
import {
  Eye, Edit, Download, Shield, Trash2, Database, Cloud, Loader2,
  X, ChevronRight, List,
} from 'lucide-react'
import type { WhtEntry } from '../types'
import AnimatedList from './AnimatedList'
import { formatPkr } from '../types'
import * as api from '../services/statement165Service'

type Step = 'input' | 'draft' | 'final'

export function Section165Page() {
  const [activeStep, setActiveStep] = useState<Step>('input')
  const [entries, setEntries] = useState<WhtEntry[]>([])
  const [sessionStatus, setSessionStatus] = useState({ status: 'ready', autoSave: 'completed', lastBackup: '10 min ago', lastSaved: '30 seconds ago', version: '2.0.0' })
  const [savedSessions, setSavedSessions] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

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

  const removeEntry = (ids: string | string[]) => {
    const idList = Array.isArray(ids) ? ids : [ids]
    setDeletingIds(prev => new Set([...prev, ...idList]))
    setTimeout(() => {
      setEntries(prev => prev.filter(e => !idList.includes(e.id)))
      idList.forEach(id => api.deleteEntry(id).catch(() => {}))
      setDeletingIds(prev => {
        const next = new Set(prev)
        idList.forEach(id => next.delete(id))
        return next
      })
    }, 300)
  }

  const handleUpload = async (file: File): Promise<{ successCount: number; errorCount: number }> => {
    try {
      const result: any = await api.uploadStatementFile(file)
      const errors: { file: string; error: string }[] = result.errors || []
      const entries = result.entries || []

      if (entries.length > 0) {
        const marked = entries.map((e: any) => ({
          ...e,
          error: undefined,
        }))
        setEntries(prev => [...prev, ...marked])
      }

      if (errors.length > 0) {
        const errorEntries = errors.map((err: any) => ({
          id: crypto.randomUUID(),
          name: err.file,
          cnicNtn: '',
          date: '',
          code: '',
          taxable: 0,
          tax: 0,
          error: err.error,
        }))
        setEntries(prev => [...prev, ...errorEntries])
      }

      return { successCount: entries.length, errorCount: errors.length }
    } catch {
      return { successCount: 0, errorCount: 1 }
    }
  }

  const handleUploadMultiple = async (files: FileList | null) => {
    if (!files) return
    setLoading(true)
    const results = await Promise.all(Array.from(files).map(file => handleUpload(file)))
    setLoading(false)
    const totalSuccess = results.reduce((s, r) => s + r.successCount, 0)
    const totalErrors = results.reduce((s, r) => s + r.errorCount, 0)

    if (totalErrors > 0) {
      notify('error', `Error Importing Files`)
    } else if (totalSuccess > 0) {
      notify('success', 'Import Successful')
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
      a.download = `165_Statement_${Date.now()}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to process statement. Check backend connection.')
    } finally {
      setLoading(false)
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
              <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                Choose Files
                <input type="file" className="hidden" multiple accept=".pdf,.xlsx,.xlsm" onChange={e => { handleUploadMultiple(e.target.files); e.target.value = '' }} />
              </label>
              <p className="mt-1.5 text-xs text-slate-400">Supports: .pdf, .xlsx, .xlsm (multiple)</p>
            </div>
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
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                </div>
              ) : entries.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">No entries yet. Add taxpayer data to begin.</p>
              ) : (
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
                  {loading ? (
                    <tr><td colSpan={7} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-600" /></td></tr>
                  ) : entries.length === 0 ? (
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
              <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                Choose Files
                <input type="file" className="hidden" multiple accept=".pdf,.xlsx,.xlsm" onChange={e => { handleUploadMultiple(e.target.files); e.target.value = '' }} />
              </label>
              <p className="mt-1.5 text-xs text-slate-400">Supports: .pdf, .xlsx, .xlsm (multiple)</p>
            </div>

            {/* Process Button */}
            <button
              onClick={handleProcess}
              disabled={entries.length === 0}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" /> Process Statement
            </button>

            {/* Already Have a Sheet */}
            <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Already Have a Sheet?</p>
                  <p className="text-xs text-slate-400">Upload existing file to append data</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </div>

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
    </div>
  )
}

/* ── Input Field Sub-component ── */


