import { Zap, Activity, KeyRound, GitBranch } from 'lucide-react'
import { ScrollReveal } from './scroll-reveal'

const features = [
  {
    icon: Zap,
    title: 'Automated Filings',
    description: 'File tax forms and statements automatically with accuracy.',
  },
  {
    icon: Activity,
    title: 'Real-time Analytics',
    description: 'Get instant insights and track your tax data in real-time.',
  },
  {
    icon: KeyRound,
    title: 'Secure & Compliant',
    description: 'Your data is protected with enterprise-grade security.',
  },
  {
    icon: GitBranch,
    title: 'Multi-User Access',
    description: 'Collaborate with your team and manage roles efficiently.',
  },
]

export function Features() {
  return (
    <section id="features" className="bg-secondary/60 py-16 lg:py-24">
      <div className="grid gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] lg:gap-10 lg:px-12 xl:px-16">
        <ScrollReveal className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Why Choose Us
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            Everything You Need for Seamless Compliance
          </h2>
          <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
            Our platform automates workflows, reduces errors, and ensures you
            stay compliant with the latest tax regulations.
          </p>
        </ScrollReveal>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, i) => (
            <ScrollReveal key={feature.title} delay={i * 100}>
              <div className="group h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-base font-bold text-card-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
