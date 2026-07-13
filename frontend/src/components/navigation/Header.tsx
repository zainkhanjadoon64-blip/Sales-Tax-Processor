import { Search, Bell, Settings, Menu, X, PanelLeft, PanelLeftClose } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '../../features/notifications/hooks/useNotifications'
import { apiClient } from '../../services/apiClient'
import { format } from 'date-fns'
import { clsx } from 'clsx'

interface SearchResult {
  clients: Array<{ id: string; client_name: string; ntn: string; cnic: string; strn: string }>
  documents: Array<{ id: string; file_name: string; original_file_name: string; client_id: string; file_type: string }>
  withholding: Array<{ id: string; client_id: string; section_type: string; period: string; challan_number: string; amount: number }>
  tasks: Array<{ id: string; title: string; client_id: string | null; status: string; priority: string }>
  sales_tax: Array<{ id: string; client_id: string; year: number; month: number; status: string }>
}

type HeaderProps = {
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

export function Header({ sidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()
  const searchRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  const { data: notificationList, isLoading: notifsLoading } = useNotifications(10)
  const { data: unreadCountData } = useUnreadCount()
  const markAsReadMutation = useMarkAsRead()
  const markAllAsReadMutation = useMarkAllAsRead()

  const unreadCount = unreadCountData?.count || 0

  // Global search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null)
      setShowSearchResults(false)
      return
    }

    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await apiClient.get<SearchResult>(`/search/?q=${encodeURIComponent(searchQuery)}`)
        setSearchResults(results)
        setShowSearchResults(true)
      } catch (err) {
        console.error('Search failed:', err)
        setSearchResults(null)
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => clearTimeout(searchTimeout.current)
  }, [searchQuery])

  // Close search results on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchSelect = (type: string, id: string) => {
    setShowSearchResults(false)
    setSearchQuery('')
    const routes: Record<string, string> = {
      clients: `/clients/${id}`,
      documents: '/documents',
      withholding: '/withholding',
      tasks: `/tasks`,
      sales_tax: '/sales-tax',
    }
    navigate(routes[type] || '/')
  }

  const handleNotificationClick = (notif: any) => {
    if (!notif.is_read) {
      markAsReadMutation.mutate(notif.id)
    }
    if (notif.link) {
      navigate(notif.link)
    }
    setShowNotifications(false)
  }

  const totalResults = searchResults
    ? (searchResults.clients?.length ?? 0) +
      (searchResults.documents?.length ?? 0) +
      (searchResults.withholding?.length ?? 0) +
      (searchResults.tasks?.length ?? 0) +
      (searchResults.sales_tax?.length ?? 0)
    : 0

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_due': return '🔔'
      case 'filing_reminder': return '📋'
      case 'payment_due': return '💰'
      case 'deadline': return '⏰'
      default: return '📌'
    }
  }

  return (
    <header className="h-16 bg-white flex items-center justify-between px-6">
      <div className="flex items-center flex-1 max-w-xl" ref={searchRef}>
        {/* Sidebar toggle button */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer shrink-0"
          aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
          style={{
            marginRight: sidebarCollapsed ? 50 : 16,
          }}
        >
          <div className="relative w-5 h-5">
            <span
              className="absolute inset-0 flex items-center justify-center transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                opacity: sidebarCollapsed ? 0 : 1,
                transform: sidebarCollapsed ? 'rotate(90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
              }}
            >
              <PanelLeftClose className="w-5 h-5 text-gray-600" />
            </span>
            <span
              className="absolute inset-0 flex items-center justify-center transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                opacity: sidebarCollapsed ? 1 : 0,
                transform: sidebarCollapsed ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.5)',
              }}
            >
              <PanelLeft className="w-5 h-5 text-gray-600" />
            </span>
          </div>
        </button>
        <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 mr-4">
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => {
              // Dismiss keyboard on mobile
              if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
              }
              // Trigger search if there's a query
              if (searchQuery.length >= 2) {
                setShowSearchResults(true)
              } else {
                // Focus the input instead
                const input = document.getElementById('global-search-input')
                input?.focus()
              }
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg z-10
                       text-gray-400 hover:text-primary-600 hover:bg-primary-50
                       transition-all duration-300 group/search-btn
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Search"
          >
            <Search className="h-4 w-4 relative z-10 transition-transform duration-300 group-hover/search-btn:scale-110" />
            {/* Shining overlay */}
            <span className="absolute inset-0 rounded-lg overflow-hidden opacity-0 group-hover/search-btn:opacity-100 transition-opacity duration-500">
              <span className="absolute -inset-[100%] -translate-x-full group-hover/search-btn:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]" />
            </span>
          </button>
          <input
            id="global-search-input"
            type="text"
            placeholder="Search clients, documents, challans..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (e.target.value.length < 2) setShowSearchResults(false)
            }}
            onFocus={() => { if (searchResults) setShowSearchResults(true) }}
            className="w-full pl-12 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults(null); setShowSearchResults(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
              {isSearching ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                </div>
              ) : totalResults === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">No results found</div>
              ) : (
                <div className="py-2">
                  {(searchResults?.clients?.length ?? 0) > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clients</div>
                      {searchResults!.clients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => handleSearchSelect('clients', client.id)}
                          className="w-full px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span className="text-sm font-medium text-gray-900">{client.client_name}</span>
                          <span className="text-xs text-gray-500">{client.ntn || client.cnic}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {(searchResults?.sales_tax?.length ?? 0) > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">Sales Tax</div>
                      {searchResults!.sales_tax.map((st) => (
                        <button
                          key={st.id}
                          onClick={() => handleSearchSelect('sales_tax', st.id)}
                          className="w-full px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-900">Year {st.year} - Month {st.month}</span>
                          <span className={clsx('text-xs font-medium', st.status === 'Filed' ? 'text-green-600' : 'text-amber-600')}>{st.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {(searchResults?.withholding?.length ?? 0) > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">Withholding</div>
                      {searchResults!.withholding.map((w) => (
                        <button
                          key={w.id}
                          onClick={() => handleSearchSelect('withholding', w.id)}
                          className="w-full px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-900">{w.challan_number} - {w.period}</span>
                          <span className="text-xs text-gray-500">{w.amount.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {(searchResults?.tasks?.length ?? 0) > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">Tasks</div>
                      {searchResults!.tasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleSearchSelect('tasks', t.id)}
                          className="w-full px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-900">{t.title}</span>
                          <span className={clsx('text-xs font-medium', t.status === 'completed' ? 'text-green-600' : 'text-amber-600')}>{t.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {(searchResults?.documents?.length ?? 0) > 0 && (
                    <div>
                      <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">Documents</div>
                      {searchResults!.documents.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => handleSearchSelect('documents', d.id)}
                          className="w-full px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-900">{d.original_file_name}</span>
                          <span className="text-xs text-gray-500">{d.file_type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-danger-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsReadMutation.mutate()}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifsLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
                  </div>
                ) : !notificationList || notificationList.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-500">No notifications</div>
                ) : (
                  notificationList.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={clsx(
                        'w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-start gap-3',
                        !notif.is_read && 'bg-primary-50/50'
                      )}
                    >
                      <span className="text-lg">{getNotificationIcon(notif.notification_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-sm', !notif.is_read ? 'font-semibold text-gray-900' : 'text-gray-700')}>{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{format(new Date(notif.created_at), 'MMM d, h:mm a')}</p>
                      </div>
                      {!notif.is_read && <span className="h-2 w-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900">Admin User</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Settings className="h-5 w-5 text-gray-600" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
            A
          </div>
        </div>
      </div>
    </header>
  )
}