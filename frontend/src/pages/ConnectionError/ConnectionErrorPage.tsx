import { ShieldCheck, Globe, Server, Clock, Home, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const statusItems = [
  {
    icon: Globe,
    title: 'Network Issue',
    description: 'Please check your internet connection.',
  },
  {
    icon: Server,
    title: 'Server Unreachable',
    description: 'Our servers might be down or busy.',
  },
  {
    icon: Clock,
    title: 'Try Again Later',
    description: 'This is usually temporary. Please try again soon.',
  },
]

export function ConnectionErrorPage() {
  const navigate = useNavigate()
  const [retrying, setRetrying] = useState(false)

  const handleRetry = () => {
    setRetrying(true)
    setTimeout(() => window.location.reload(), 600)
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center overflow-hidden bg-white">
      {/* Decorative dots */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute left-[12%] top-[18%] size-2 rounded-full bg-blue-500/60" />
        <span className="absolute right-[14%] top-[26%] size-2 rounded-full bg-blue-500/50" />
        <span className="absolute left-[22%] top-[34%] size-1.5 rounded-full bg-blue-500/40" />
        <span className="absolute left-[10%] top-[24%] text-blue-500/40 text-2xl">&times;</span>
        <span className="absolute right-[20%] top-[12%] text-blue-500/40 text-2xl">&times;</span>
        <span className="absolute left-[26%] top-[8%] text-blue-500/30 text-2xl">&times;</span>
        <span className="absolute right-[10%] top-[36%] text-blue-500/30 text-2xl">&times;</span>
      </div>

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8 px-6 pb-24 pt-14 sm:pt-20">
        {/* Illustration */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-8 rounded-full border border-blue-500/15 sm:-inset-12" />
          <div className="flex size-64 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm sm:size-80">
            <img
              src="/images/connection-error.png"
              alt="Illustration of a cloud server with a disconnected power cable"
              className="size-full object-cover"
            />
          </div>
        </div>

        {/* Heading */}
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-blue-600">
            <span className="size-2 rounded-full bg-blue-600" aria-hidden="true" />
            Connection Error
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 text-balance sm:text-5xl">
            We can&apos;t connect to our servers
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-slate-500 text-pretty">
            Looks like we&apos;re having trouble reaching our servers. This is
            usually temporary. Please try again in a few moments.
          </p>
        </div>

        {/* Status Cards */}
        <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-sm">
          <ul className="grid grid-cols-1 divide-y divide-gray-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {statusItems.map((item) => (
              <li key={item.title} className="flex flex-col items-center gap-3 px-6 py-8 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-slate-100">
                  <item.icon className="size-6 text-blue-600" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
                  <p className="text-sm leading-relaxed text-slate-500 text-pretty">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-70 cursor-pointer"
          >
            {retrying ? 'Retrying...' : 'Try Again'}
            <RefreshCw className={`size-5 ${retrying ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-blue-600 bg-white px-6 py-3.5 text-base font-semibold text-blue-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 cursor-pointer"
          >
            Refresh Page
            <RefreshCw className="size-5" aria-hidden="true" />
          </button>
          <button
            onClick={() => navigate('/')}
            className="mt-1 flex items-center gap-2 text-base font-medium text-blue-600 transition-colors hover:text-blue-800 cursor-pointer"
          >
            <Home className="size-5" aria-hidden="true" />
            Go to Homepage
          </button>
        </div>
      </div>

      {/* Wave footer */}
      <div className="relative z-10 mt-auto w-full">
        <svg className="block w-full text-blue-100" viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 60 C 240 110, 480 10, 720 60 C 960 110, 1200 10, 1440 60 L 1440 120 L 0 120 Z" fill="currentColor" fillOpacity="0.5" />
          <path d="M0 80 C 260 30, 500 120, 720 80 C 940 40, 1180 120, 1440 80" stroke="currentColor" strokeWidth="2" strokeDasharray="6 8" />
          <circle cx="720" cy="80" r="7" className="fill-blue-600" />
          <circle cx="160" cy="70" r="4" className="fill-blue-600/60" />
          <circle cx="1280" cy="86" r="4" className="fill-blue-600/60" />
        </svg>
        <footer className="bg-blue-50 px-6 py-6">
          <p className="mx-auto flex max-w-3xl items-center justify-center gap-2 text-center text-sm text-slate-500 sm:text-base">
            <ShieldCheck className="size-5 text-blue-600" aria-hidden="true" />
            <span>
              If the problem persists, please{' '}
              <a href="mailto:support@example.com" className="font-semibold text-blue-600 hover:underline">
                contact support
              </a>
              .
            </span>
          </p>
        </footer>
      </div>
    </main>
  )
}
