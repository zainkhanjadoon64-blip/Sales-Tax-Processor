import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, Bell, ChevronDown, Sun } from 'lucide-react'

interface HeaderProps {
  userName: string
  greeting: string
  taxYear: string
  notifications: number
  onTaxYearChange: (year: string) => void
}

const taxYears = ['2024-25', '2023-24', '2022-23']

export function Header({ userName, greeting, taxYear, notifications, onTaxYearChange }: HeaderProps) {
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowYearDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-wrap items-center justify-between gap-4 pt-6 pb-4"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-balance">
          {greeting}, {userName}!{' '}
          <motion.span
            className="inline-block text-amber-400"
            animate={{ rotate: [0, 10, -5, 10, 0], scale: [1, 1.15, 1, 1.15, 1] }}
            transition={{ duration: 1.4, delay: 0.6, repeat: Infinity, repeatDelay: 5 }}
            aria-hidden="true"
          >
            <Sun className="w-6 h-6 inline" />
          </motion.span>
        </h1>
        <p className="-mt-[6px] text-sm text-gray-500">
          Here&apos;s what&apos;s happening with your tax compliance today.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="relative hidden md:block">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search anything..."
            className="w-64 rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-14 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 xl:w-80"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
            {'\u2318 K'}
          </kbd>
        </label>

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          className="relative rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm"
          aria-label={`Notifications, ${notifications} unread`}
        >
          <Bell className="w-[18px] h-[18px] text-gray-500" />
          {notifications > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, delay: 0.8 }}
              className="absolute -right-1.5 -top-1.5 flex w-[18px] h-[18px] items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white"
            >
              {notifications}
            </motion.span>
          )}
        </motion.button>


        <div className="relative" ref={dropdownRef}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowYearDropdown(!showYearDropdown)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 py-2.5 pl-4 pr-3 text-sm font-semibold text-white shadow-md shadow-blue-200 outline-none transition hover:bg-blue-700"
          >
            Tax Year {taxYear}
            <motion.span
              animate={{ rotate: showYearDropdown ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.span>
          </motion.button>
          <AnimatePresence>
            {showYearDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 w-full min-w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-lg z-50"
              >
                {taxYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => { onTaxYearChange(y); setShowYearDropdown(false) }}
                    className={`w-full px-4 py-2 text-left text-sm transition hover:bg-blue-50 ${
                      y === taxYear ? 'font-semibold text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    Tax Year {y}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  )
}
