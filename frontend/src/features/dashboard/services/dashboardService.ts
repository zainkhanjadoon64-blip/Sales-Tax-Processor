import { apiClient } from '@/services/apiClient'

export interface StatCardData {
  id: string
  label: string
  value: number
  change: number
  changeLabel: string
  trend: 'up' | 'down'
  positive: boolean
  spark: number[]
}

export interface CompliancePoint {
  day: string
  salesTaxReturns: number
  withholdingChallans: number
  overdueReturns: number
}

export interface ComplianceScore {
  overall: number
  label: string
  breakdown: { name: string; value: number; color: string }[]
}

export interface PendingTask {
  id: string
  title: string
  subtitle: string
  count: number
  icon: string
  color: string
}

export interface ReturnsStatus {
  total: number
  segments: { name: string; value: number; percent: number; color: string }[]
}

export interface Activity {
  id: string
  title: string
  reference: string
  time: string
  icon: string
  color: string
}

export interface TopClient {
  id: string
  name: string
  initials: string
  returns: number
  score: number
}

export interface CalendarDay {
  date: string
  dayName: string
  dayNumber: number
  isToday: boolean
  hasEvents: boolean
}

export interface CalendarDueItem {
  id: string
  title: string
  clients: number
  dueTime: string
  severity: 'info' | 'warning' | 'danger'
}

export interface ComplianceCalendar {
  week: CalendarDay[]
  dueItems: CalendarDueItem[]
}

export interface SystemNotice {
  id: string
  message: string
  link?: string
}

export interface DashboardData {
  user: { name: string; greeting: string }
  taxYear: string
  stats: StatCardData[]
  complianceOverview: CompliancePoint[]
  complianceScore: ComplianceScore
  pendingTasks: PendingTask[]
  returnsStatus: ReturnsStatus
  activities: Activity[]
  topClients: TopClient[]
  calendar: ComplianceCalendar
  notice: SystemNotice
  notifications: number
  messages: number
}

export const dashboardService = {
  async getStats(params?: { range?: string; client?: string; taxYear?: string }): Promise<DashboardData> {
    const queryParams = new URLSearchParams()
    if (params?.range) queryParams.set('range', params.range)
    if (params?.client) queryParams.set('client', params.client)
    if (params?.taxYear) queryParams.set('taxYear', params.taxYear)
    const qs = queryParams.toString()
    return apiClient.get<DashboardData>(`/dashboard/stats${qs ? `?${qs}` : ''}`)
  },
}
