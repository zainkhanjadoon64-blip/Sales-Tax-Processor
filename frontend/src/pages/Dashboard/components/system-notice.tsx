import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ShieldCheck, ExternalLink, X } from 'lucide-react'
import type { SystemNotice as NoticeType } from '@/features/dashboard/services/dashboardService'

export function SystemNotice({ notice }: { notice: NoticeType }) {
  const [visible, setVisible] = useState(true)

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.4, delay: 0.8 }}
          className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3.5" role="status">
          <ShieldCheck className="w-[18px] h-[18px] shrink-0 text-blue-600" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm text-gray-900">
            <span className="font-bold text-blue-600">System Notice:</span> {notice.message}
          </p>
          {notice.link && (
            <a href={notice.link} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-700">
              Learn More <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          )}
          <button onClick={() => setVisible(false)} className="shrink-0 rounded-lg p-1 text-gray-500 transition hover:bg-blue-100" aria-label="Dismiss notice">
            <X className="w-4 h-4" />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
