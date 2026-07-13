import { useState } from 'react'
import { motion } from 'motion/react'
import { useDashboard } from '@/features/dashboard/hooks/useDashboard'
import { Header } from './components/header'
import { authService } from '@/services/authService'
import { StatCards } from './components/stat-cards'
import { ComplianceOverview } from './components/compliance-overview'
import { PendingTasks } from './components/pending-tasks'
import { ReturnsStatus } from './components/returns-status'
import { RecentActivities } from './components/recent-activities'
import { TopClients } from './components/top-clients'
import { ComplianceCalendar } from './components/compliance-calendar'
import { SystemNotice } from './components/system-notice'
import { CtaBanner } from './components/cta-banner'

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center py-20">
      <motion.div
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200"
        animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-4h6v4" />
          <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
        </svg>
      </motion.div>
    </div>
  )
}

export function Dashboard() {
  const [range, setRange] = useState('this-month')
  const [client, setClient] = useState('all')
  const [taxYear, setTaxYear] = useState('2024-25')

  const { data, isLoading } = useDashboard({ range, client, taxYear })

  if (isLoading || !data) return <LoadingScreen />

  return (
    <>
      <Header
        userName={authService.getUser()?.name || data.user.name}
        greeting={data.user.greeting}
        taxYear={taxYear}
        notifications={data.notifications}
        onTaxYearChange={setTaxYear}
      />

      <div className="flex flex-col gap-5">
        <StatCards stats={data.stats} />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-5 xl:col-span-2">
            <ComplianceOverview
              data={data.complianceOverview}
              score={data.complianceScore}
              range={range}
              client={client}
              onRangeChange={setRange}
              onClientChange={setClient}
            />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <RecentActivities activities={data.activities} />
              <TopClients clients={data.topClients} />
            </div>
            <CtaBanner />
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <PendingTasks tasks={data.pendingTasks} />
            <ReturnsStatus status={data.returnsStatus} />
            <ComplianceCalendar calendar={data.calendar} />
          </div>
        </div>

        <SystemNotice notice={data.notice} />
      </div>
    </>
  )
}
