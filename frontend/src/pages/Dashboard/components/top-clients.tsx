import { motion } from 'motion/react'
import type { TopClient } from '@/features/dashboard/services/dashboardService'

const avatarColors = ['bg-blue-600', 'bg-sky-500', 'bg-indigo-500', 'bg-blue-400', 'bg-cyan-500']

export function TopClients({ clients }: { clients: TopClient[] }) {
  return (
    <motion.section initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" aria-label="Top clients by returns">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Top Clients by Returns</h2>
        <button className="text-xs font-semibold text-blue-600 transition hover:text-blue-700">View All</button>
      </div>
      <ul className="mt-4 space-y-4">
        {clients.map((client, i) => (
          <motion.li key={client.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.08 }} className="flex items-center gap-3">
            <span className={`flex w-9 h-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarColors[i % avatarColors.length]}`} aria-hidden="true">
              {client.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-gray-900">{client.name}</p>
                <span className="text-xs font-semibold text-gray-900">{client.score}%</span>
              </div>
              <p className="text-xs text-gray-500">{client.returns} returns</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100" role="presentation">
                <motion.div className="h-full rounded-full bg-blue-600"
                  initial={{ width: 0 }} animate={{ width: `${client.score}%` }}
                  transition={{ duration: 1, delay: 0.85 + i * 0.1, ease: 'easeOut' }} />
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  )
}
