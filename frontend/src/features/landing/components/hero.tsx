import { Sparkles } from 'lucide-react'
import { DashboardMockup } from './dashboard-mockup'
import { DEV_AUTH_DISABLED } from '@/config/auth'

const loginHref = DEV_AUTH_DISABLED ? '/dashboard' : '/login'

const avatars = [
  { src: '/images/avatar-1.png', alt: 'Business owner portrait' },
  { src: '/images/avatar-2.png', alt: 'Company administrator portrait' },
  { src: '/images/avatar-3.png', alt: 'Finance professional portrait' },
]

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-0 h-[520px] w-[520px] rounded-full bg-accent blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 right-1/4 h-[420px] w-[560px] rounded-[50%] bg-accent/80 blur-2xl"
      />

      <div className="grid items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[3fr_2fr] lg:gap-10 lg:px-12 lg:pt-10 lg:pb-28 xl:px-16">
        <div className="max-w-3xl">
          <h1
            className="tf-hero-enter text-balance text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem] lg:leading-[1.15]"
            style={{ animationDelay: '0ms' }}
          >
            Simplify Tax Compliance,{' '}
            <span className="text-primary">Maximize Efficiency</span>
          </h1>

          <p
            className="tf-hero-enter mt-6 max-w-md text-pretty leading-relaxed text-muted-foreground"
            style={{ animationDelay: '120ms' }}
          >
            An all-in-one platform designed to help businesses and
            professionals manage tax compliance, filings, and withholding
            statements with ease.
          </p>

          <div
            className="tf-hero-enter mt-8 flex flex-col gap-4 sm:flex-row"
            style={{ animationDelay: '240ms' }}
          >
            <a href="/register">
              <button className="group inline-flex h-12 items-center justify-center rounded-lg bg-primary text-primary-foreground px-7 text-base font-semibold transition-all hover:bg-primary/90">
                Get Started
                <Sparkles className="ml-1 h-4 w-4 transition-transform group-hover:scale-110" aria-hidden="true" />
              </button>
            </a>
            <a href={loginHref}>
              <button className="group inline-flex h-12 items-center justify-center rounded-lg border border-primary/30 bg-transparent px-7 text-base font-semibold text-primary transition-all hover:bg-accent hover:text-primary">
                Sign In
              </button>
            </a>
          </div>

          <div
            className="tf-hero-enter mt-10 flex items-center gap-4"
            style={{ animationDelay: '360ms' }}
          >
            <div className="flex -space-x-3">
              {avatars.map((a) => (
                <img
                  key={a.src}
                  src={a.src}
                  alt={a.alt}
                  className="h-11 w-11 rounded-full border-2 border-background object-cover"
                />
              ))}
              <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-bold text-primary-foreground">
                +2K
              </span>
            </div>
            <p className="max-w-[180px] text-sm leading-snug text-muted-foreground">
              Trusted by 2,000+ businesses across Pakistan
            </p>
          </div>
        </div>

        <div className="tf-hero-enter relative" style={{ animationDelay: '200ms' }}>
          <div
            aria-hidden="true"
            className="absolute -left-3 top-8 hidden h-[85%] w-16 rounded-l-2xl bg-primary/70 blur-[1px] lg:block"
          />
          <div className="tf-float">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
