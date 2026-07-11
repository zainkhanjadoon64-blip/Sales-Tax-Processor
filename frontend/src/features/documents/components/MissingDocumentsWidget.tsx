import { AlertTriangle, ExternalLink } from 'lucide-react'
import { useMissingDocuments } from '../hooks/useDocuments'
import { MONTHS } from '../types/document'
import { useNavigate } from 'react-router-dom'

export function MissingDocumentsWidget() {
  const { data, isLoading } = useMissingDocuments({ status: 'all' })
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-5 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-40 animate-pulse" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const items = data?.data || []
  const total = data?.total || 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="text-sm font-semibold text-slate-900">
            Missing Documents
            {total > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">
                {total}
              </span>
            )}
          </h3>
        </div>
        <button
          onClick={() => navigate('/compliance')}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
        >
          View all <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">All caught up!</p>
          <p className="text-xs text-slate-500 mt-0.5">No missing compliance documents</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.slice(0, 8).map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{item.client_name}</p>
                <p className="text-xs text-slate-500">
                  {item.required_type} — {MONTHS[item.tax_month - 1]?.label} {item.tax_year}
                </p>
              </div>
              {item.is_overdue && (
                <span className="flex-shrink-0 text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                  {item.days_overdue}d overdue
                </span>
              )}
            </div>
          ))}
          {items.length > 8 && (
            <p className="text-xs text-slate-400 text-center pt-1">
              +{items.length - 8} more
            </p>
          )}
        </div>
      )}
    </div>
  )
}