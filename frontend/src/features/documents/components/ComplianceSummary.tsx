import { CheckCircle2, AlertTriangle, Clock, TrendingUp } from 'lucide-react'

interface ComplianceSummaryProps {
  summary: {
    total_required: number
    uploaded: number
    missing: number
    pending: number
    compliance_percentage: number
  }
}

export function ComplianceSummary({ summary }: ComplianceSummaryProps) {
  const { total_required, uploaded, missing, pending, compliance_percentage } = summary
  const circumference = 2 * Math.PI * 36
  const offset = circumference - (compliance_percentage / 100) * circumference

  const getPercentageColor = () => {
    if (compliance_percentage >= 80) return 'text-emerald-600'
    if (compliance_percentage >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  const getStrokeColor = () => {
    if (compliance_percentage >= 80) return '#059669'
    if (compliance_percentage >= 50) return '#d97706'
    return '#dc2626'
  }

  return (
    <div className="flex items-center gap-6">
      {/* Circular progress */}
      <div className="relative flex-shrink-0">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke={getStrokeColor()}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${getPercentageColor()}`}>
            {Math.round(compliance_percentage)}%
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm text-slate-600">Uploaded</span>
          <span className="text-sm font-semibold text-slate-900 ml-auto">{uploaded}</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-slate-600">Missing</span>
          <span className="text-sm font-semibold text-slate-900 ml-auto">{missing}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-slate-600">Pending</span>
          <span className="text-sm font-semibold text-slate-900 ml-auto">{pending}</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          <span className="text-sm text-slate-600">Required</span>
          <span className="text-sm font-semibold text-slate-900 ml-auto">{total_required}</span>
        </div>
      </div>
    </div>
  )
}