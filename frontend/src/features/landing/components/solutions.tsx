import { ArrowRight, FileText, ScanLine, UserRound, BadgeCheck, Globe } from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'

function StatementIllustration() {
  return (
    <div className="relative flex h-32 items-center justify-center" aria-hidden="true">
      <div className="absolute left-1/2 top-1 h-24 w-20 -translate-x-[70%] rotate-[-6deg] rounded-lg border border-border bg-secondary shadow-sm">
        <FileText className="mx-auto mt-3 h-7 w-7 text-primary/50" />
        <div className="mx-3 mt-2 h-1.5 rounded bg-border" />
        <div className="mx-3 mt-1.5 h-1.5 w-2/3 rounded bg-border" />
      </div>
      <div className="absolute left-1/2 top-4 flex h-24 w-24 -translate-x-[15%] rotate-[4deg] flex-col rounded-lg border border-border bg-card p-3 shadow-md">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-primary" />
          <div className="h-1.5 flex-1 rounded bg-accent" />
        </div>
        <div className="mt-2 h-1.5 rounded bg-secondary" />
        <div className="mt-1.5 h-1.5 rounded bg-secondary" />
        <div className="mt-1.5 h-1.5 w-3/4 rounded bg-secondary" />
        <div className="mt-1.5 h-1.5 w-1/2 rounded bg-secondary" />
      </div>
    </div>
  )
}

function TaxpayerIllustration() {
  return (
    <div className="relative flex h-32 items-center justify-center" aria-hidden="true">
      <div className="relative flex h-24 w-24 flex-col items-center justify-center rounded-2xl bg-accent">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <UserRound className="h-8 w-8" />
        </span>
        <span className="absolute -right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground">
          <BadgeCheck className="h-4 w-4" />
        </span>
        <div className="mt-2 h-1.5 w-12 rounded bg-primary/30" />
      </div>
    </div>
  )
}

function ReportsIllustration() {
  return (
    <div className="relative flex h-32 items-center justify-center" aria-hidden="true">
      <Globe className="h-24 w-24 text-primary" strokeWidth={1.2} />
      <span className="absolute right-8 top-4 h-3 w-3 rounded-full bg-accent" />
      <span className="absolute bottom-4 left-8 h-2 w-2 rounded-full bg-primary/40" />
    </div>
  )
}

const solutions = [
  {
    title: 'Withholding Statements',
    description: 'Manage and file Section 165, 153 and other withholding statements effortlessly.',
    illustration: StatementIllustration,
  },
  {
    title: 'Taxpayer Management',
    description: 'Maintain taxpayer profiles, track history, and stay compliant with ease.',
    illustration: TaxpayerIllustration,
  },
  {
    title: 'Reports & Analytics',
    description: 'Generate detailed reports and visualize your tax data with powerful analytics.',
    illustration: ReportsIllustration,
  },
]

export function Solutions() {
  return (
    <section id="solutions" className="bg-primary py-16 lg:py-24">
      <div className="grid gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10 lg:px-12 xl:px-16">
        <ScrollReveal className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/70">
            Our Solutions
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight text-primary-foreground sm:text-4xl">
            Solutions Built for Every Business Need
          </h2>
          <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-primary-foreground/80">
            From small businesses to large enterprises, our solutions are
            designed to scale with your needs.
          </p>
          <a href="/dashboard">
            <button className="group mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-card px-6 text-base font-semibold text-primary transition-all hover:bg-card/90">
              View All Products
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
          </a>
        </ScrollReveal>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {solutions.map((solution, i) => (
            <ScrollReveal key={solution.title} delay={i * 120}>
              <div className="group flex h-full flex-col rounded-2xl bg-card p-6 transition-transform duration-300 hover:-translate-y-1.5">
                <h3 className="text-lg font-bold text-card-foreground">
                  {solution.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {solution.description}
                </p>
                <div className="mt-auto pt-4">
                  <solution.illustration />
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    aria-label={`Learn more about ${solution.title}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 group-hover:scale-110"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
