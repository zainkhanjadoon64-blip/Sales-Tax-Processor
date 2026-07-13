import {
  Bell,
  ChevronDown,
  FileText,
  LayoutGrid,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
} from 'lucide-react'

const stats = [
  { label: 'Total Statements', value: '1,248', change: '+8.2%', up: true },
  { label: 'Active Taxpayers', value: '842', change: '+5.1%', up: true },
  { label: 'Pending Submissions', value: '24', change: '-2.4%', up: false },
]

export function DashboardMockup() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-card shadow-2xl shadow-primary/15 ring-1 ring-border">
      <div className="flex">
        <aside
          className="flex w-11 shrink-0 flex-col items-center gap-5 rounded-l-2xl bg-primary py-4 sm:w-14"
          aria-hidden="true"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground text-primary">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/20 text-primary-foreground">
            <LayoutGrid className="h-4 w-4" />
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground/60">
            <FileText className="h-4 w-4" />
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground/60">
            <BarChart3 className="h-4 w-4" />
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground/60">
            <Users className="h-4 w-4" />
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground/60">
            <Settings className="h-4 w-4" />
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground/60">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
            <span className="text-sm font-semibold text-card-foreground sm:text-base">
              Overview
            </span>
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <img
                  src="/images/avatar-2.png"
                  alt="Ahmad Raza"
                  className="h-7 w-7 rounded-full object-cover"
                />
                <div className="hidden flex-col leading-tight sm:flex">
                  <span className="text-[11px] font-semibold text-card-foreground">Ahmad Raza</span>
                  <span className="text-[9px] text-muted-foreground">Administrator</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] text-muted-foreground">Total Withholding (2024)</p>
                <p className="mt-1 text-xl font-bold text-card-foreground sm:text-2xl">PKR 45,120,000</p>
                <p className="mt-1 flex items-center gap-1 text-[11px]">
                  <span className="font-semibold text-chart-4">+12.5%</span>
                  <span className="text-muted-foreground">from last month</span>
                </p>
              </div>
              <span className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground">
                This Month
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              </span>
            </div>

            <div className="relative mt-3">
              <div className="absolute -top-2 right-2 z-10 rounded-md bg-foreground px-2 py-1 text-[9px] font-semibold text-background shadow-md">
                PKR 45.12M
              </div>
              <svg viewBox="0 0 480 160" className="h-auto w-full" role="img" aria-label="Withholding trend line chart">
                <defs>
                  <linearGradient id="tfArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[{ y: 20, label: '50M' }, { y: 55, label: '40M' }, { y: 90, label: '30M' }, { y: 125, label: '10M' }].map((g) => (
                  <g key={g.y}>
                    <line x1="30" x2="480" y1={g.y} y2={g.y} stroke="var(--border)" strokeWidth="1" />
                    <text x="0" y={g.y + 3} fontSize="9" fill="var(--muted-foreground)">{g.label}</text>
                  </g>
                ))}
                <path className="tf-chart-area" d="M30 128 L60 118 L90 122 L120 105 L150 110 L180 92 L210 98 L240 78 L270 85 L300 66 L330 72 L360 55 L390 62 L420 44 L455 28 L455 140 L30 140 Z" fill="url(#tfArea)" />
                <path className="tf-chart-line" d="M30 128 L60 118 L90 122 L120 105 L150 110 L180 92 L210 98 L240 78 L270 85 L300 66 L330 72 L360 55 L390 62 L420 44 L455 28" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle className="tf-pulse-dot" cx="455" cy="28" r="5" fill="var(--primary)" stroke="var(--card)" strokeWidth="2" />
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => (
                  <text key={m} x={45 + i * 82} y="155" fontSize="9" fill="var(--muted-foreground)">{m}</text>
                ))}
              </svg>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-2.5 sm:p-3">
                  <p className="truncate text-[9px] text-muted-foreground sm:text-[10px]">{s.label}</p>
                  <p className="mt-1 text-base font-bold text-card-foreground sm:text-lg">{s.value}</p>
                  <p className={`mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold ${s.up ? 'text-chart-4' : 'text-chart-5'}`}>
                    {s.up ? <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" /> : <TrendingDown className="h-2.5 w-2.5" aria-hidden="true" />}
                    {s.change}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
