import { Heart, ExternalLink } from 'lucide-react'
import { Logo } from './logo'

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
    </svg>
  )
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 5.92a8.2 8.2 0 0 1-2.36.65 4.1 4.1 0 0 0 1.8-2.27 8.2 8.2 0 0 1-2.6 1 4.1 4.1 0 0 0-7 3.74A11.65 11.65 0 0 1 3.4 4.75a4.1 4.1 0 0 0 1.27 5.48A4.07 4.07 0 0 1 2.8 9.7v.05a4.1 4.1 0 0 0 3.29 4.03 4.1 4.1 0 0 1-1.85.07 4.11 4.11 0 0 0 3.83 2.85A8.23 8.23 0 0 1 2 18.4a11.62 11.62 0 0 0 6.29 1.84c7.55 0 11.68-6.25 11.68-11.67v-.53A8.35 8.35 0 0 0 22 5.92z" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  )
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.5 6.51a2.99 2.99 0 0 0-2.1-2.12C19.53 3.88 12 3.88 12 3.88s-7.53 0-9.4.51A2.99 2.99 0 0 0 .5 6.51 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.49 2.99 2.99 0 0 0 2.1 2.12c1.87.51 9.4.51 9.4.51s7.53 0 9.4-.51a2.99 2.99 0 0 0 2.1-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.49zM9.6 15.6V8.4l6.27 3.6L9.6 15.6z" />
    </svg>
  )
}

const columns = [
  {
    heading: 'Products',
    links: [
      { label: 'Withholding Statements', href: '/withholding' },
      { label: 'Taxpayer Management', href: '/clients' },
      { label: 'Reports & Analytics', href: '/reports' },
      { label: 'Sales Tax', href: '/sales-tax' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', href: '#home' },
      { label: 'Contact Us', href: '#footer' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Help Center', href: '#footer' },
      { label: 'Login', href: '/login' },
      { label: 'Register', href: '/register' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#footer' },
      { label: 'Terms of Service', href: '#footer' },
    ],
  },
]

const socials = [
  { icon: FacebookIcon, label: 'Facebook' },
  { icon: TwitterIcon, label: 'Twitter' },
  { icon: LinkedinIcon, label: 'LinkedIn' },
  { icon: YoutubeIcon, label: 'YouTube' },
]

export function Footer() {
  return (
    <footer id="footer" className="border-t border-border bg-secondary/50">
      <div className="px-4 py-14 sm:px-6 lg:px-12 xl:px-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Tax Suite is an all-in-one tax compliance platform built to help
              businesses and professionals stay compliant, save time, and grow
              with confidence.
            </p>
            <div className="mt-5 flex gap-3">
              {socials.map((social) => (
                <button
                  key={social.label}
                  type="button"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90"
                >
                  <social.icon className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="text-sm font-bold text-foreground">
                {col.heading}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('#') ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (link.href === '#home') {
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }
                        }}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                        {link.href.startsWith('http') && <ExternalLink className="h-3 w-3" />}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="flex flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-12 xl:px-16">
          <p>&copy; 2026 Tax Suite. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Made with{' '}
            <Heart className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />{' '}
            for a better compliance experience.
          </p>
        </div>
      </div>
    </footer>
  )
}
