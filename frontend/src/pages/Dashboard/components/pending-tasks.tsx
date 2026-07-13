import { motion } from 'motion/react'
import type { PendingTask } from '@/features/dashboard/services/dashboardService'
import { getIcon, colorStyles } from './icon-map'

export function PendingTasks({ tasks }: { tasks: PendingTask[] }) {
  return (
    <motion.section initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" aria-label="Pending tasks">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Pending Tasks</h2>
        <button className="text-xs font-semibold text-blue-600 transition hover:text-blue-700">View All</button>
      </div>
      <ul className="mt-4 space-y-3">
        {tasks.map((task, i) => {
          const Icon = getIcon(task.icon)
          const styles = colorStyles[task.color] ?? colorStyles.blue
          return (
            <motion.li key={task.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.09, ease: 'easeOut' }} whileHover={{ x: 4 }}>
              <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-gray-50">
                <span className={`flex w-10 h-10 shrink-0 items-center justify-center rounded-xl ${styles.bg}`}>
                  <Icon className={`w-[18px] h-[18px] ${styles.text}`} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-900">{task.title}</span>
                  <span className="block text-xs text-gray-500">{task.subtitle}</span>
                </span>
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, delay: 0.7 + i * 0.09 }}
                  className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${styles.badge}`}>
                  {task.count}
                </motion.span>
              </button>
            </motion.li>
          )
        })}
      </ul>
    </motion.section>
  )
}
