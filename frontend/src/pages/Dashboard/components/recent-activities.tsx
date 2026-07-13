import { motion } from 'motion/react'
import type { Activity } from '@/features/dashboard/services/dashboardService'
import { getIcon, colorStyles } from './icon-map'

export function RecentActivities({ activities }: { activities: Activity[] }) {
  return (
    <motion.section initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.55, ease: 'easeOut' }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" aria-label="Recent activities">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Recent Activities</h2>
        <button className="text-xs font-semibold text-blue-600 transition hover:text-blue-700">View All</button>
      </div>
      <ul className="mt-4 space-y-4">
        {activities.map((activity, i) => {
          const Icon = getIcon(activity.icon)
          const styles = colorStyles[activity.color] ?? colorStyles.blue
          return (
            <motion.li key={activity.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 + i * 0.08 }} className="flex items-start gap-3">
              <span className={`mt-0.5 flex w-9 h-9 shrink-0 items-center justify-center rounded-xl ${styles.bg}`}>
                <Icon className={`w-4 h-4 ${styles.text}`} aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{activity.title}</p>
                  <p className="truncate text-xs text-gray-500">{activity.reference}</p>
                </div>
                <span className="whitespace-nowrap text-[11px] font-medium text-green-600">{activity.time}</span>
              </div>
            </motion.li>
          )
        })}
      </ul>
    </motion.section>
  )
}
