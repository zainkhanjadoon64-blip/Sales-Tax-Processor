import { useState, useEffect } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { Logo } from './logo'
import { cn } from '@/lib/utils'
import { DEV_AUTH_DISABLED } from '@/config/auth'

// In dev mode the Login button goes straight to the dashboard
const loginHref = DEV_AUTH_DISABLED ? '/dashboard' : '/login'

const navLinks = [
  { label: 'Home', id: 'home' },
  { label: 'Resources', id: 'footer', chevron: true },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    const ids = navLinks.map((l) => l.id)
    const observers: IntersectionObserver[] = []

    for (const id of ids) {
      const el = document.getElementById(id)
      if (!el) continue
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveSection(id)
            }
          }
        },
        { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' },
      )
      observer.observe(el)
      observers.push(observer)
    }

    return () => {
      for (const obs of observers) obs.disconnect()
    }
  }, [])

  const scrollTo = (id: string) => {
    setActiveSection(id)
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <nav
        className="flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-12 xl:px-16"
        aria-label="Main navigation"
      >
        <Logo />

        <ul className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              <button
                type="button"
                onClick={() => scrollTo(link.id)}
                className={cn(
                  'flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary',
                  activeSection === link.id ? 'text-primary' : 'text-foreground/80',
                )}
              >
                {link.label}
                {link.chevron && (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-6 lg:flex">
          <button
            type="button"
            onClick={() => scrollTo('footer')}
            className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Contact Us
          </button>
          <a
            href={loginHref}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary text-primary-foreground px-7 text-sm font-semibold transition-all hover:bg-primary/90"
          >
            Login
          </a>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary lg:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      <div
        className={cn(
          'grid overflow-hidden border-border bg-background transition-all duration-300 ease-in-out lg:hidden',
          open ? 'grid-rows-[1fr] border-b' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="flex flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <li key={link.label}>
                <button
                  type="button"
                  onClick={() => {
                    scrollTo(link.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-left transition-colors hover:bg-secondary',
                    activeSection === link.id ? 'text-primary' : 'text-foreground/80',
                  )}
                >
                  {link.label}
                  {link.chevron && (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
            <li className="mt-2 flex flex-col gap-2 px-3 pb-2">
              <button
                type="button"
                onClick={() => {
                  scrollTo('footer')
                  setOpen(false)
                }}
                className="py-2 text-sm font-semibold text-primary text-left"
              >
                Contact Us
              </button>
              <a href={loginHref} className="w-full" onClick={() => setOpen(false)}>
                <button className="w-full rounded-lg bg-primary text-primary-foreground h-9 px-7 text-sm font-semibold">
                  Login
                </button>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  )
}
