import { ArrowRight, ShieldCheck, Lock, ClipboardCheck } from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'
import { DEV_AUTH_DISABLED } from '@/config/auth'

const loginHref = DEV_AUTH_DISABLED ? '/dashboard' : '/login'

function CtaIllustration() {
  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-2xl bg-accent" aria-hidden="true">
      <span className="tf-float flex h-24 w-24 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
        <ShieldCheck className="h-12 w-12 text-primary-foreground" />
      </span>
      <span className="absolute -right-3 top-6 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-md">
        <ClipboardCheck className="h-5 w-5 text-primary" />
      </span>
      <span className="absolute -right-1 bottom-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md">
        <Lock className="h-5 w-5 text-primary-foreground" />
      </span>
      <span className="absolute -left-2 bottom-8 flex w-16 flex-col gap-1.5 rounded-lg border border-border bg-card p-2 shadow-sm">
        <span className="h-1 rounded bg-border" />
        <span className="h-1 w-3/4 rounded bg-border" />
        <span className="h-1 w-1/2 rounded bg-border" />
      </span>
    </div>
  )
}

export function Cta() {
  return (
    <section id="cta" className="bg-background py-16 lg:py-24">
      <div className="px-4 sm:px-6 lg:px-12 xl:px-16">
        <ScrollReveal>
          <div className="mx-auto grid max-w-7xl items-center gap-10 rounded-3xl bg-secondary/70 px-6 py-12 sm:px-10 lg:grid-cols-[auto_1fr_auto] lg:gap-14 lg:px-14">
            <CtaIllustration />

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Ready to Get Started?
              </p>
              <h2 className="mt-3 text-balance text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
                Join Thousands of Businesses Simplifying Their Tax Compliance
              </h2>
              <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
                Get started today and experience the easiest way to manage
                your tax compliance and filings.
              </p>
            </div>

            <div className="flex flex-col items-start gap-4 lg:items-center">
              <a href="/register">
                <button className="group inline-flex h-12 items-center justify-center rounded-lg bg-primary text-primary-foreground px-6 text-base font-semibold transition-all hover:bg-primary/90">
                  Get Started Now
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </button>
              </a>
              <a href={loginHref} className="text-sm font-semibold text-primary underline underline-offset-4 transition-colors hover:text-primary/80">
                Sign In
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
