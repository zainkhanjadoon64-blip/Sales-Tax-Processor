import { motion } from 'motion/react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Info, ChevronDown } from 'lucide-react'
import type { CompliancePoint, ComplianceScore } from '@/features/dashboard/services/dashboardService'
import { AnimatedNumber } from './animated-number'

const series = [
  { key: 'salesTaxReturns', label: 'Sales Tax Returns', color: '#2563eb' },
  { key: 'withholdingChallans', label: 'Withholding Challans', color: '#7dd3fc' },
  { key: 'overdueReturns', label: 'Overdue Returns', color: '#ef4444' },
] as const

interface ComplianceOverviewProps {
  data: CompliancePoint[]
  score: ComplianceScore
  range: string
  client: string
  onRangeChange: (v: string) => void
  onClientChange: (v: string) => void
}

function ScoreGauge({ score }: { score: ComplianceScore }) {
  const radius = 56
  const circumference = 2 * Math.PI * radius
  const arc = circumference * 0.78
  const filled = arc * (score.overall / 100)

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm font-semibold text-gray-900">Overall Compliance Score</p>
      <div className="relative mt-2 w-36 h-36">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-[130deg]">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10"
            strokeDasharray={`${arc} ${circumference}`} strokeLinecap="round" />
          <motion.circle cx="70" cy="70" r={radius} fill="none" stroke="#2563eb" strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${filled} ${circumference}` }}
            transition={{ duration: 1.4, delay: 0.5, ease: 'easeOut' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">
            <AnimatedNumber value={score.overall} suffix="%" />
          </span>
          <span className="text-xs font-semibold text-blue-600">{score.label}</span>
        </div>
      </div>
      <ul className="mt-2 w-full space-y-2">
        {score.breakdown.map((item, i) => (
          <motion.li key={item.name} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.1 }}
            className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-gray-500">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              {item.name}
            </span>
            <span className="font-semibold text-gray-900">{item.value}%</span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function SelectPill({ value, options, onChange, label }: {
  value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; label: string
}) {
  return (
    <div className="relative">
      <label className="sr-only">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-gray-900 shadow-sm outline-none transition hover:bg-gray-50">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 w-3.5 h-3.5 -translate-y-1/2 text-gray-500" />
    </div>
  )
}

export function ComplianceOverview({ data, score, range, client, onRangeChange, onClientChange }: ComplianceOverviewProps) {
  return (
    <motion.section initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" aria-label="Compliance overview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-base font-bold">
          Compliance Overview
          <Info className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
        </h2>
        <div className="flex items-center gap-2">
          <SelectPill label="Date range" value={range} onChange={onRangeChange} options={[
            { value: 'this-month', label: 'This Month' }, { value: 'last-month', label: 'Last Month' },
            { value: 'this-quarter', label: 'This Quarter' }, { value: 'this-year', label: 'This Year' },
          ]} />
          <SelectPill label="Client filter" value={client} onChange={onClientChange} options={[
            { value: 'all', label: 'All Clients' }, { value: 'top-10', label: 'Top 10 Clients' },
            { value: 'corporate', label: 'Corporate Only' },
          ]} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
            {s.label}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-6 xl:flex-row">
        <div className="h-72 min-w-0 xl:flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
              <defs>
                {series.map((s) => (
                  <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} interval={1} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(v: number) => v >= 1000 ? `${v / 1000}K` : String(v)} />
              <Tooltip cursor={{ stroke: '#2563eb', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px -8px rgba(15,23,42,0.15)', fontSize: 12 }}
                formatter={(value, name) => [Number(value).toLocaleString(), series.find((s) => s.key === name)?.label ?? String(name)]}
                labelFormatter={(label: string) => `Day ${label}`} />
              {series.map((s, i) => (
                <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2.5}
                  fill={`url(#grad-${s.key})`} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  isAnimationActive animationDuration={1400} animationBegin={400 + i * 200} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full shrink-0 xl:w-56">
          <ScoreGauge score={score} />
        </div>
      </div>
    </motion.section>
  )
}
