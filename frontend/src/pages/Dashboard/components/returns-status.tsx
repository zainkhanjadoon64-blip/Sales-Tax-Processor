import { motion } from 'motion/react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChevronDown } from 'lucide-react'
import type { ReturnsStatus as ReturnsStatusType } from '@/features/dashboard/services/dashboardService'
import { AnimatedNumber } from './animated-number'

export function ReturnsStatus({ status }: { status: ReturnsStatusType }) {
  return (
    <motion.section initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" aria-label="Returns status">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Returns Status</h2>
        <div className="relative">
          <label className="sr-only">Period</label>
          <select className="appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium shadow-sm outline-none transition hover:bg-gray-50">
            <option>This Month</option><option>Last Month</option><option>This Year</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 w-3.5 h-3.5 -translate-y-1/2 text-gray-500" />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4">
        <div className="relative h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 8px 24px -8px rgba(15,23,42,0.15)' }}
                formatter={(value, name) => [Number(value).toLocaleString(), String(name)]} />
              <Pie data={status.segments} dataKey="value" nameKey="name" innerRadius={52} outerRadius={74}
                paddingAngle={2} cornerRadius={4} startAngle={90} endAngle={-270}
                isAnimationActive animationDuration={1300} animationBegin={500}>
                {status.segments.map((seg) => <Cell key={seg.name} fill={seg.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-gray-500">Total</span>
            <span className="text-xl font-bold"><AnimatedNumber value={status.total} /></span>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-3">
          {status.segments.map((seg, i) => (
            <motion.li key={seg.name} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.12 }} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 text-gray-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} aria-hidden="true" />
                {seg.name}
              </span>
              <span className="whitespace-nowrap font-semibold text-gray-900">
                {seg.value.toLocaleString()}{' '}
                <span className="font-normal text-gray-500">({seg.percent}%)</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.section>
  )
}
