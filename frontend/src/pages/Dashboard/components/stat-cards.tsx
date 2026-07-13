import { motion } from 'motion/react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { ArrowUp, ArrowDown, Users, FileText, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react'
import type { StatCardData } from '@/features/dashboard/services/dashboardService'
import { AnimatedNumber } from './animated-number'

const cardMeta: Record<string, { icon: typeof Users; iconBg: string; iconColor: string; sparkColor: string }> = {
  'total-clients': { icon: Users, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', sparkColor: '#2563eb' },
  'sales-tax-returns': { icon: FileText, iconBg: 'bg-sky-100', iconColor: 'text-sky-600', sparkColor: '#2563eb' },
  'withholding-challans': { icon: ShieldCheck, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', sparkColor: '#2563eb' },
  'pending-tasks': { icon: ShieldAlert, iconBg: 'bg-amber-100', iconColor: 'text-amber-500', sparkColor: '#f59e0b' },
  'overdue-returns': { icon: AlertTriangle, iconBg: 'bg-red-100', iconColor: 'text-red-500', sparkColor: '#ef4444' },
}

function StatCard({ stat, index }: { stat: StatCardData; index: number }) {
  const meta = cardMeta[stat.id] ?? cardMeta['total-clients']
  const Icon = meta.icon
  const sparkData = stat.spark.map((v, i) => ({ i, v }))
  const isPercent = stat.change % 1 !== 0 || stat.change > 10

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + index * 0.08, ease: 'easeOut' }}
      whileHover={{ y: -4, boxShadow: '0 12px 32px -8px rgba(37,99,235,0.18)' }}
      className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <motion.div
          className={`flex w-11 h-11 items-center justify-center rounded-xl ${meta.iconBg}`}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Icon className={`w-5 h-5 ${meta.iconColor}`} aria-hidden="true" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-500">{stat.label}</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight">
            <AnimatedNumber value={stat.value} />
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <p className="flex items-center gap-1 text-xs">
          <span className={`flex items-center gap-0.5 font-semibold ${
            stat.positive ? 'text-green-600' : stat.trend === 'down' ? 'text-red-500' : 'text-amber-600'
          }`}>
            {stat.trend === 'up' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            {isPercent ? `${stat.change}%` : stat.change}
          </span>
          <span className="text-gray-500">{stat.changeLabel}</span>
        </p>
        <div className="h-10 w-24 shrink-0" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${stat.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={meta.sparkColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={meta.sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone" dataKey="v"
                stroke={meta.sparkColor} strokeWidth={2}
                fill={`url(#spark-${stat.id})`}
                isAnimationActive animationDuration={1200} animationBegin={300 + index * 120}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.article>
  )
}

export function StatCards({ stats }: { stats: StatCardData[] }) {
  return (
    <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat, i) => <StatCard key={stat.id} stat={stat} index={i} />)}
    </section>
  )
}
