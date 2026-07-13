import { useQuery } from '@tanstack/react-query'
import { dashboardService, type DashboardData } from '../services/dashboardService'

interface DashboardQuery {
  range?: string
  client?: string
  taxYear?: string
}

export function useDashboard(query?: DashboardQuery) {
  return useQuery<DashboardData>({
    queryKey: ['dashboard-stats', query?.range, query?.client, query?.taxYear],
    queryFn: () => dashboardService.getStats(query),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  })
}
