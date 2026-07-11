import React, { useState } from 'react'
import { Shield, ChevronLeft, ChevronRight, Upload, Search, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useComplianceStatus, useMissingDocuments } from '../hooks/useDocuments'
import { ComplianceSummary } from '../components/ComplianceSummary'
import { MONTHS } from '../types/document'
import type { DocumentCategory } from '../types/document'

const COMPLIANCE_CATEGORIES: DocumentCategory[] = [
  'Sales Tax Return',
  '236H',
  '153',
  'KPRA',
  'Income Tax Return',
  'Working File',
  'Notice',
]

function StatusIcon({ status }: { status: string }) {
  if (status === 'uploaded' || status === 'pending') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
  }
  if (status === 'missing') {
    return <AlertTriangle className="h-4 w-4 text-red-400" />
  }
  return <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
}

export function ComplianceViewPage() {
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [year, setYear] = useState(new Date().getFullYear())

  const { data: complianceData } = useComplianceStatus(
    selectedClientId || 'placeholder',
    year
  )

  const { data: missingData } = useMissingDocuments({
    client_id: selectedClientId || undefined,
  })

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i)

  // Summary for the overview (no client selected)
  const summary = complianceData?.data?.summary

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Shield className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Compliance Center</h1>
              <p className="text-sm text-slate-500">Track filing compliance across all clients</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Client:</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 min-w-[200px]"
            >
              <option value="">All Clients</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Year:</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setYear(year - 1)}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={() => setYear(year + 1)}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Summary card */}
        {summary && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <ComplianceSummary summary={summary} />
          </div>
        )}

        {/* Missing documents alert */}
        {missingData && missingData.total > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="text-sm font-semibold text-red-800">
                {missingData.total} missing document(s) detected
              </h3>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {missingData.data.slice(0, 10).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-red-700">
                  <span>{item.client_name} — {item.required_type} ({MONTHS[item.tax_month - 1]?.label} {item.tax_year})</span>
                  {item.is_overdue && (
                    <span className="text-red-500 font-medium">{item.days_overdue}d overdue</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance Grid */}
        {selectedClientId && complianceData?.data?.compliance ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[160px]">
                      Category
                    </th>
                    {MONTHS.map((m) => (
                      <th key={m.value} className="px-2 py-3 text-center text-xs font-semibold text-slate-600 uppercase min-w-[80px]">
                        {m.label.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COMPLIANCE_CATEGORIES.map((category) => {
                    const hasAnyData = complianceData.data.compliance.some(
                      (month) => month.documents.some((d) => d.category === category)
                    )
                    if (!hasAnyData) return null

                    return (
                      <tr key={category} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800 text-xs">
                          {category}
                        </td>
                        {MONTHS.map((m) => {
                          const monthData = complianceData.data.compliance.find(
                            (cm) => cm.month === m.value
                          )
                          const docStatus = monthData?.documents.find(
                            (d) => d.category === category
                          )

                          if (!docStatus) {
                            return (
                              <td key={m.value} className="px-2 py-3 text-center">
                                <div className="h-4 w-4 rounded-full border-2 border-slate-200 mx-auto" />
                              </td>
                            )
                          }

                          return (
                            <td key={m.value} className="px-2 py-3 text-center">
                              <div
                                className="inline-flex items-center justify-center"
                                title={`${category} — ${m.label}: ${docStatus.status}`}
                              >
                                <StatusIcon status={docStatus.status} />
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
            <Shield className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Select a Client</h3>
            <p className="text-sm text-slate-500 text-center max-w-sm">
              Choose a client from the dropdown above to view their compliance status for {year}.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}