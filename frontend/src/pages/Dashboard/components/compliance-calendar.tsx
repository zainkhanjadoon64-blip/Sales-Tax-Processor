import { useState } from 'react'
import { motion } from 'motion/react'
import { FileText, ShieldCheck, AlertCircle } from 'lucide-react'
import type { ComplianceCalendar as CalendarType } from '@/features/dashboard/services/dashboardService'

const severityStyles = {
  info: { bg: 'bg-blue-100', text: 'text-blue-600', icon: FileText },
  warning: { bg: 'bg-sky-100', text: 'text-sky-600', icon: ShieldCheck },
  danger: { bg: 'bg-red-100', text: 'text-red-500', icon: AlertCircle },
} as const

export function ComplianceCalendar({ calendar }: { calendar: CalendarType }) {
  const [selected, setSelected] = useState(() => calendar.week.find((d) => d.isToday)?.date ?? calendar.week[0]?.date)

  return (
    <motion.section initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.65, ease: 'easeOut' }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" aria-label="Compliance calendar">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Compliance Calendar</h2>
        <button className="text-xs font-semibold text-blue-600 transition hover:text-blue-700">View Calendar</button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1" role="group" aria-label="Week view">
        {calendar.week.map((day, i) => {
          const isSelected = day.date === selected
          return (
            <motion.button key={day.date} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 + i * 0.05 }} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
              onClick={() => setSelected(day.date)}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 transition ${
                isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'hover:bg-gray-50'
              }`} aria-pressed={isSelected}>
              <span className={`text-[10px] font-semibold ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{day.dayName}</span>
              <span className="text-sm font-bold">{day.dayNumber}</span>
              {day.hasEvents && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600'}`} aria-label="Has events" />}
            </motion.button>
          )
        })}
      </div>
      <ul className="mt-4 space-y-3">
        {calendar.dueItems.map((item, i) => {
          const styles = severityStyles[item.severity]
          const Icon = styles.icon
          return (
            <motion.li key={item.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + i * 0.1 }}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-xs">
              <span className={`flex w-9 h-9 shrink-0 items-center justify-center rounded-xl ${styles.bg}`}>
                <Icon className={`w-4 h-4 ${styles.text}`} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500">{item.clients} clients</p>
              </div>
              <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-600">{item.dueTime}</span>
            </motion.li>
          )
        })}
      </ul>
    </motion.section>
  )
}
