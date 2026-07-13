import { useNavigate } from 'react-router-dom'
import { Users, Shield, UserCheck, UserX, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/apiClient'

interface AdminStats {
  total_users: number
  pending_approvals: number
  active_users: number
  banned_users: number
}

interface AdminStatsResponse {
  success: boolean
  data: AdminStats
}

export function AdminDashboard() {
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery<AdminStatsResponse>({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient.get<AdminStatsResponse>('/admin/stats'),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  })

  const stats = data?.data
    ? [
        {
          name: 'Total Users',
          value: String(data.data.total_users ?? 0),
          icon: Users,
          color: 'text-blue-600 bg-blue-100',
        },
        {
          name: 'Pending Approvals',
          value: String(data.data.pending_approvals ?? 0),
          icon: Shield,
          color: 'text-amber-600 bg-amber-100',
        },
        {
          name: 'Active Users',
          value: String(data.data.active_users ?? 0),
          icon: UserCheck,
          color: 'text-green-600 bg-green-100',
        },
        {
          name: 'Banned Users',
          value: String(data.data.banned_users ?? 0),
          icon: UserX,
          color: 'text-red-600 bg-red-100',
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">System administration and user management</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="ml-3 text-gray-400">Loading admin data...</span>
        </div>
      )}

      {isError && !isLoading && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <p className="text-lg font-medium text-gray-200">Unable to load admin dashboard</p>
          <p className="text-sm text-gray-500 mt-1">Check that the backend server is running and try again.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.name} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">{stat.name}</p>
                    <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/admin/users')}
                  className="flex items-center justify-between p-6 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors border border-gray-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-indigo-600/20 text-indigo-400">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-gray-200 block">Manage Users</span>
                      <span className="text-sm text-gray-500">View, approve, and manage system users</span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-600" />
                </button>
                <button
                  onClick={() => navigate('/admin/users?filter=pending')}
                  className="flex items-center justify-between p-6 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors border border-gray-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-amber-600/20 text-amber-400">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-gray-200 block">Pending Approvals</span>
                      <span className="text-sm text-gray-500">Review users awaiting approval</span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
