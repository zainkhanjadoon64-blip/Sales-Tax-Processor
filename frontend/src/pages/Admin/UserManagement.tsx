import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Users,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
} from 'lucide-react'
import { apiClient } from '@/services/apiClient'

interface AdminUser {
  id: string
  full_name: string
  username: string
  email: string | null
  is_active: boolean
  is_approved: boolean
  role: string
  banned_until: string | null
  created_at: string
  updated_at: string
}

interface UsersResponse {
  users: AdminUser[]
  total: number
}

type UserFilter = 'all' | 'pending' | 'active' | 'banned' | 'disabled'

function getStatusBadges(user: AdminUser): { label: string; className: string }[] {
  const badges: { label: string; className: string }[] = []

  if (user.banned_until) {
    const bannedUntil = new Date(user.banned_until)
    const isBanned = bannedUntil > new Date()
    if (isBanned) {
      badges.push({
        label: `Banned`,
        className: 'bg-red-900/50 text-red-400 border border-red-800',
      })
    }
  }

  if (user.is_approved) {
    badges.push({
      label: 'Approved',
      className: 'bg-green-900/50 text-green-400 border border-green-800',
    })
  } else {
    badges.push({
      label: 'Pending',
      className: 'bg-amber-900/50 text-amber-400 border border-amber-800',
    })
  }

  if (user.is_active) {
    badges.push({
      label: 'Active',
      className: 'bg-emerald-900/50 text-emerald-400 border border-emerald-800',
    })
  } else {
    badges.push({
      label: 'Disabled',
      className: 'bg-gray-700 text-gray-400 border border-gray-600',
    })
  }

  return badges
}

function getRoleBadge(role: string): { label: string; className: string } {
  switch (role) {
    case 'admin':
      return {
        label: 'Admin',
        className: 'bg-purple-900/50 text-purple-400 border border-purple-800',
      }
    case 'user':
      return {
        label: 'User',
        className: 'bg-blue-900/50 text-blue-400 border border-blue-800',
      }
    default:
      return {
        label: role || 'User',
        className: 'bg-gray-700 text-gray-300 border border-gray-600',
      }
  }
}

export function UserManagement() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<UserFilter>('all')
  const [confirmAction, setConfirmAction] = useState<{ action: 'ban' | 'delete'; userId: string; userName: string } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Set filter from URL on mount
  useEffect(() => {
    const filter = searchParams.get('filter')
    if (filter === 'pending') setActiveFilter('pending')
  }, [searchParams])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Fetch all users
  const { data: usersResponse, isLoading, isError, error } = useQuery<UsersResponse>({
    queryKey: ['admin-users'],
    queryFn: () => apiClient.get<UsersResponse>('/admin/users/all'),
    staleTime: 1000 * 60 * 1,
  })

  // Confirmation handler
  const handleConfirm = useCallback(async () => {
    if (!confirmAction) return
    try {
      if (confirmAction.action === 'ban') {
        await apiClient.put(`/admin/users/${confirmAction.userId}/ban`)
        showToast('User banned successfully', 'success')
      } else {
        await apiClient.delete(`/admin/users/${confirmAction.userId}`)
        showToast('User deleted successfully', 'success')
      }
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed'
      showToast(message, 'error')
    } finally {
      setConfirmAction(null)
    }
  }, [confirmAction, queryClient])

  // Quick actions
  const quickAction = useCallback(async (action: string, userId: string) => {
    const endpointMap: Record<string, string> = {
      approve: `admin/users/${userId}/approve`,
      reject: `admin/users/${userId}/reject`,
      disable: `admin/users/${userId}/disable`,
      enable: `admin/users/${userId}/enable`,
    }
    const actionLabels: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      disable: 'disabled',
      enable: 'enabled',
    }
    try {
      await apiClient.put(endpointMap[action])
      showToast(`User ${actionLabels[action]} successfully`, 'success')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Failed to ${action} user`
      showToast(message, 'error')
    }
  }, [queryClient])

  // Filtered users
  const users = usersResponse?.users ?? []
  const filteredUsers = useMemo(() => {
    let filtered = users
    switch (activeFilter) {
      case 'pending':
        filtered = users.filter((u) => !u.is_approved && u.role === 'user')
        break
      case 'active':
        filtered = users.filter((u) => u.is_active && u.is_approved && !u.banned_until)
        break
      case 'banned':
        filtered = users.filter((u) => {
          if (!u.banned_until) return false
          return new Date(u.banned_until) > new Date()
        })
        break
      case 'disabled':
        filtered = users.filter((u) => !u.is_active)
        break
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q))
      )
    }
    return filtered
  }, [users, activeFilter, searchQuery])

  const counts = useMemo(() => ({
    all: users.length,
    pending: users.filter((u) => !u.is_approved).length,
    active: users.filter((u) => u.is_active && u.is_approved && !u.banned_until).length,
    banned: users.filter((u) => {
      if (!u.banned_until) return false
      return new Date(u.banned_until) > new Date()
    }).length,
    disabled: users.filter((u) => !u.is_active).length,
  }), [users])

  const filterTabs: { key: UserFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'pending', label: 'Pending Approval', count: counts.pending },
    { key: 'active', label: 'Active', count: counts.active },
    { key: 'banned', label: 'Banned', count: counts.banned },
    { key: 'disabled', label: 'Disabled', count: counts.disabled },
  ]

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-900/90 text-green-200 border border-green-700' : 'bg-red-900/90 text-red-200 border border-red-700'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm text-gray-400 mt-1">Manage system users, approvals, and access</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="ml-3 text-gray-400">Loading users...</span>
        </div>
      )}

      {isError && !isLoading && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <p className="text-lg font-medium text-gray-200">Unable to load users</p>
          <p className="text-sm text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Check that the backend server is running and try again.'}
          </p>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap gap-1">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeFilter === tab.key
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-transparent'
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                      activeFilter === tab.key ? 'bg-indigo-600/30 text-indigo-300' : 'bg-gray-800 text-gray-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p className="text-lg font-medium text-gray-400">No users found</p>
                <p className="text-sm text-gray-600 mt-1">
                  {searchQuery ? 'Try adjusting your search query' : activeFilter !== 'all' ? `No users match the "${activeFilter}" filter` : 'No users have been created yet'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Username / Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredUsers.map((user) => {
                    const roleBadge = getRoleBadge(user.role)
                    const statusBadges = getStatusBadges(user)

                    return (
                      <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center">
                              <span className="text-sm font-semibold text-indigo-400">
                                {user.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-200">{user.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-400">{user.email || user.username}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge.className}`}>
                            {roleBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {statusBadges.map((badge, idx) => (
                              <span key={idx} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {!user.is_approved && (
                              <>
                                <button onClick={() => quickAction('approve', user.id)} className="p-2 rounded-lg text-green-500 hover:bg-green-900/30 transition-colors" title="Approve user">
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => quickAction('reject', user.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-900/30 transition-colors" title="Reject user">
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {user.is_active ? (
                              <button onClick={() => quickAction('disable', user.id)} className="p-2 rounded-lg text-amber-400 hover:bg-amber-900/30 transition-colors" title="Disable user">
                                <ToggleLeft className="h-4 w-4" />
                              </button>
                            ) : (
                              <button onClick={() => quickAction('enable', user.id)} className="p-2 rounded-lg text-green-500 hover:bg-green-900/30 transition-colors" title="Enable user">
                                <ToggleRight className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => setConfirmAction({ action: 'ban', userId: user.id, userName: user.full_name })} className="p-2 rounded-lg text-red-500 hover:bg-red-900/30 transition-colors" title="Ban user">
                              <Ban className="h-4 w-4" />
                            </button>
                            <button onClick={() => setConfirmAction({ action: 'delete', userId: user.id, userName: user.full_name })} className="p-2 rounded-lg text-red-700 hover:bg-red-900/30 transition-colors" title="Delete user">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-800 bg-gray-900/50">
            <p className="text-xs text-gray-500">
              Showing {filteredUsers.length} of {usersResponse?.total ?? 0} user{filteredUsers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-900/50">
                {confirmAction.action === 'ban' ? <Ban className="h-5 w-5 text-red-400" /> : <Trash2 className="h-5 w-5 text-red-400" />}
              </div>
              <h3 className="text-lg font-semibold text-gray-100">
                {confirmAction.action === 'ban' ? 'Ban User' : 'Delete User'}
              </h3>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              {confirmAction.action === 'ban'
                ? `Are you sure you want to ban "${confirmAction.userName}"? They will be unable to access the system.`
                : `Are you sure you want to permanently delete "${confirmAction.userName}"? This action cannot be undone.`}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-800 rounded-lg hover:text-gray-200 hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 transition-colors">
                {confirmAction.action === 'ban' ? 'Ban User' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
