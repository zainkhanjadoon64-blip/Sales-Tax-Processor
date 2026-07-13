import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  FolderOpen,
  Shield,
  Receipt,
  CheckSquare,
  BarChart3,
  Settings,
  HardDrive,
  LogOut,
  ChevronDown,
  FileSearch,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Sales Tax', href: '/sales-tax', icon: FileText },
  { name: 'Documents', href: '/documents', icon: FolderOpen },
  { name: 'Compliance', href: '/compliance', icon: Shield },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Backups', href: '/backups', icon: HardDrive },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const withholdingSections = [
  { name: 'Section 236H', href: '/withholding?section=236H', icon: FileSearch },
  { name: 'Section 165', href: '/whts-165', icon: Receipt },
]

const sectionsWithHref = ['/whts-165', '/withholding?section=236H']

type SidebarProps = {
  collapsed: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Auto-open dropdown if any sub-section is active
  const isSubActive = sectionsWithHref.some((h) => {
    if (h.includes('?')) {
      const [path, qs] = h.split('?')
      return location.pathname === path && location.search === `?${qs}`
    }
    return location.pathname === h
  })

  useEffect(() => {
    if (isSubActive) setDropdownOpen(true)
  }, [isSubActive])

  // Determine which sub-section is active (for line positioning)
  const activeSubIndex = withholdingSections.findIndex((s) => {
    if (s.href.includes('?')) {
      const [path, qs] = s.href.split('?')
      return location.pathname === path && location.search === `?${qs}`
    }
    return location.pathname === s.href
  })
  const hasActiveSub = activeSubIndex >= 0

  return (
    <aside
      className="bg-white text-slate-800 flex flex-col h-screen relative transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 overflow-hidden"
      style={{ width: collapsed ? 0 : 306, minWidth: collapsed ? 0 : 306 }}
    >

      {/* Sidebar content — hidden when collapsed */}
      <div className="flex flex-col h-full min-w-64" style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.25s ease' }}>
        <div className="px-6 pt-[14px] pb-0 border-b border-slate-200">
          <div className="relative flex items-center justify-center">
            <img src="/logo.svg" alt="Tax Compliance" className="h-20 w-auto ml-[20px]" />
            <img src="/icon.png" alt="Tax Suite" className="absolute top-[15px] -left-2 h-[53px] w-[53px] rounded-lg object-contain" />
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.slice(0, 5).map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setDropdownOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium transition-all duration-300 group/sidebar-item ${
                  isActive
                    ? 'bg-primary-500 text-white font-bold shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <span className="relative inline-flex items-center justify-center">
                <item.icon
                  className="h-5 w-5 relative z-10 transition-all duration-300
                             group-hover/sidebar-item:scale-110 group-hover/sidebar-item:drop-shadow-[0_0_6px_rgba(0,0,0,0.1)]
                             group-[:has(.active)]/sidebar-item:drop-shadow-[0_0_10px_rgba(0,0,0,0.15)]"
                  aria-hidden="true"
                />
                <span className="absolute inset-0 rounded-full overflow-hidden opacity-0 group-hover/sidebar-item:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <span className="absolute -inset-[100%] -translate-x-full group-hover/sidebar-item:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-black/5 to-transparent skew-x-[-20deg]" />
                </span>
              </span>
              {item.name}
            </NavLink>
          ))}

          {/* ── Withholding Tax Dropdown ── */}
          <div className="pt-1">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-base font-medium transition-all duration-300 group/sidebar-item ${
                isSubActive
                  ? 'bg-primary-500 text-white font-bold shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="relative">
                  <DollarSign
                    className="h-5 w-5 relative z-10 transition-all duration-300
                               group-hover/sidebar-item:scale-110 group-hover/sidebar-item:drop-shadow-[0_0_6px_rgba(0,0,0,0.1)]"
                    aria-hidden="true"
                  />
                </span>
                Withholding Tax
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${
                  dropdownOpen ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            <div className={`relative overflow-hidden transition-all duration-300 ${
              dropdownOpen ? 'max-h-48 opacity-100 mt-1' : 'max-h-0 opacity-0'
            }`}>
              <div
                className="absolute left-[19px] top-0 w-[1.5px] bg-slate-200 transition-all duration-500"
                style={{
                  height: hasActiveSub && activeSubIndex < withholdingSections.length - 1
                    ? `${activeSubIndex * 40 + 20}px`
                    : `${(withholdingSections.length - 1) * 40 + 10}px`,
                }}
              />
              {hasActiveSub && (
                <div
                  className="absolute left-[19px] top-0 w-[1.5px] bg-primary-400/80 transition-all duration-500 shadow-[0_0_6px_rgba(96,165,250,0.3)]"
                  style={{
                    height: activeSubIndex === 0 ? '5px' : `${activeSubIndex * 40 + 5}px`,
                  }}
                />
              )}
              <div className="flex flex-col">
                {withholdingSections.map((section, idx) => {
                  const isActive = idx === activeSubIndex
                  return (
                    <NavLink
                      key={section.name}
                      to={section.href}
                      className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium transition-all duration-300 group/sub-item ${
                        isActive
                          ? 'bg-primary-400 text-white font-bold shadow-md'
                          : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      style={{ paddingLeft: '42px' }}
                    >
                      <span className="absolute left-[11px] top-1/2 -translate-y-1/2 z-10 transition-all duration-300">
                        <section.icon
                          className={`h-[18px] w-[18px] transition-all duration-300 ${
                            isActive
                              ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                              : 'text-slate-400 group-hover/sub-item:text-slate-900'
                          }`}
                          aria-hidden="true"
                        />
                      </span>
                      {section.name}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Remaining nav items */}
          {navigation.slice(5).map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setDropdownOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-base font-medium transition-all duration-300 group/sidebar-item ${
                  isActive
                    ? 'bg-primary-500 text-white font-bold shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <span className="relative inline-flex items-center justify-center">
                <item.icon
                  className="h-5 w-5 relative z-10 transition-all duration-300
                             group-hover/sidebar-item:scale-110 group-hover/sidebar-item:drop-shadow-[0_0_6px_rgba(0,0,0,0.1)]
                             group-[:has(.active)]/sidebar-item:drop-shadow-[0_0_10px_rgba(0,0,0,0.15)]"
                  aria-hidden="true"
                />
                <span className="absolute inset-0 rounded-full overflow-hidden opacity-0 group-hover/sidebar-item:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <span className="absolute -inset-[100%] -translate-x-full group-hover/sidebar-item:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-black/5 to-transparent skew-x-[-20deg]" />
                </span>
              </span>
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-base font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}
