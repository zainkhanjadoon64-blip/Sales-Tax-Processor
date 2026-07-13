import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '@/services/authService'
import { DEV_AUTH_DISABLED } from '@/config/auth'
import BorderGlow from '@/components/ui/BorderGlow'
import {
  Shield,
  Users,
  FileText,
  BarChart3,
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Headphones,
  Phone,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Secure & Reliable',
    desc: 'Bank-level security with end-to-end data protection.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Insights',
    desc: 'Get real-time updates and actionable insights at your fingertips.',
  },
  {
    icon: Zap,
    title: 'Smart Automation',
    desc: 'Automate workflows and save valuable time.',
  },
]

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // DEV MODE: skip all auth checks and go straight to dashboard
    if (DEV_AUTH_DISABLED) {
      navigate('/dashboard', { replace: true })
      return
    }

    try {
      const response = await authService.login({ username: email, password })
      if (response.success) {
        // Redirect admin users to admin portal, normal users to dashboard
        const user = authService.getUser()
        if (user?.role === 'admin' || user?.username === 'admin@admin') {
          navigate('/admin', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      } else {
        setError((response as any).message || 'Invalid credentials')
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel: Blue Branding ── */}
        <div className="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] rounded-full border border-white/10" />
          <div className="absolute top-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full border border-white/10" />
          <div className="absolute bottom-[-100px] left-[-100px] w-[350px] h-[350px] rounded-full border border-white/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02]" />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />

          <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-14">
            {/* Top: Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/icon.png" alt="Tax Suite" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">TAX SUITE</h2>
                <p className="text-blue-200 text-[11px] tracking-wide">Compliance Hub</p>
              </div>
            </div>

            {/* Middle content */}
            <div className="flex-1 flex flex-col justify-start max-w-lg mt-6">
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-[1.15] mb-5">
                Simplify <span className="text-blue-200">Compliance.</span>
                <br />
                Drive <span className="text-blue-200">Growth.</span>
              </h1>
              <p className="text-blue-200/80 text-base leading-relaxed mb-8">
                The all-in-one platform for tax management, reporting, and compliance automation.
              </p>

              <div className="space-y-4">
                {features.map((f) => (
                  <div key={f.title} className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
                      <f.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">{f.title}</h3>
                      <p className="text-blue-200/70 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 pl-4 border-l-2 border-blue-400/50">
                <p className="text-blue-100/80 text-sm italic leading-relaxed">
                  "Excellence in compliance today, sustainable growth tomorrow."
                </p>
              </div>

              {/* Motion graphics */}
              <div className="mt-auto pt-8 relative flex-1 min-h-0 overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-32">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute bottom-0 rounded-t-lg opacity-25"
                      style={{
                        left: `${8 + i * 17}%`,
                        width: '10px',
                        height: `${20 + Math.sin(i * 1.2) * 30 + 20}px`,
                        background: 'rgba(255,255,255,0.3)',
                        animation: `barRise ${2 + i * 0.3}s ease-in-out infinite alternate`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                  <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-4">
                    <svg className="w-full h-20 opacity-20" viewBox="0 0 200 60" preserveAspectRatio="none">
                      <path d="M0,60 Q25,35 50,40 T100,20 T150,30 T200,10 L200,60 Z" fill="rgba(255,255,255,0.2)">
                        <animate attributeName="d" dur="4s" repeatCount="indefinite"
                          values="M0,60 Q25,35 50,40 T100,20 T150,30 T200,10 L200,60 Z;
                                  M0,60 Q25,45 50,30 T100,40 T150,15 T200,25 L200,60 Z;
                                  M0,60 Q25,35 50,40 T100,20 T150,30 T200,10 L200,60 Z" />
                      </path>
                    </svg>
                  </div>
                  <style>{`
                    @keyframes barRise {
                      0% { height: ${10 + Math.random() * 15}px; }
                      100% { height: ${35 + Math.random() * 30}px; }
                    }
                    @keyframes drift {
                      0%, 100% { transform: translate(0, 0); }
                      25% { transform: translate(10px, -8px); }
                      50% { transform: translate(-5px, -15px); }
                      75% { transform: translate(8px, -5px); }
                    }
                  `}</style>
                </div>
                {/* Floating dots */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full bg-white/15"
                    style={{
                      width: `${4 + (i % 3) * 3}px`,
                      height: `${4 + (i % 3) * 3}px`,
                      left: `${10 + i * 11}%`,
                      top: `${10 + (i * 7) % 60}%`,
                      animation: `drift ${3 + (i % 4) * 2}s ease-in-out infinite`,
                      animationDelay: `${i * 0.4}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Building illustration */}
            <div className="absolute bottom-20 right-10 xl:right-20 opacity-20">
              <svg width="280" height="320" viewBox="0 0 280 320" fill="none">
                <rect x="40" y="80" width="120" height="240" rx="4" fill="white" opacity="0.15" />
                <rect x="55" y="95" width="20" height="20" rx="2" fill="white" opacity="0.2" />
                <rect x="85" y="95" width="20" height="20" rx="2" fill="white" opacity="0.2" />
                <rect x="115" y="95" width="20" height="20" rx="2" fill="white" opacity="0.15" />
                <rect x="55" y="130" width="20" height="20" rx="2" fill="white" opacity="0.15" />
                <rect x="85" y="130" width="20" height="20" rx="2" fill="white" opacity="0.2" />
                <rect x="115" y="130" width="20" height="20" rx="2" fill="white" opacity="0.2" />
                <rect x="55" y="165" width="20" height="20" rx="2" fill="white" opacity="0.2" />
                <rect x="85" y="165" width="20" height="20" rx="2" fill="white" opacity="0.15" />
                <rect x="115" y="165" width="20" height="20" rx="2" fill="white" opacity="0.2" />
                <rect x="55" y="200" width="20" height="20" rx="2" fill="white" opacity="0.15" />
                <rect x="85" y="200" width="20" height="20" rx="2" fill="white" opacity="0.2" />
                <rect x="115" y="200" width="20" height="20" rx="2" fill="white" opacity="0.15" />
                <rect x="80" y="270" width="40" height="50" rx="3" fill="white" opacity="0.25" />
                {/* Second tower */}
                <rect x="170" y="140" width="90" height="180" rx="4" fill="white" opacity="0.1" />
                <rect x="182" y="155" width="16" height="16" rx="2" fill="white" opacity="0.15" />
                <rect x="206" y="155" width="16" height="16" rx="2" fill="white" opacity="0.15" />
                <rect x="230" y="155" width="16" height="16" rx="2" fill="white" opacity="0.12" />
                <rect x="182" y="185" width="16" height="16" rx="2" fill="white" opacity="0.12" />
                <rect x="206" y="185" width="16" height="16" rx="2" fill="white" opacity="0.15" />
                <rect x="230" y="185" width="16" height="16" rx="2" fill="white" opacity="0.15" />
                <rect x="182" y="215" width="16" height="16" rx="2" fill="white" opacity="0.15" />
                <rect x="206" y="215" width="16" height="16" rx="2" fill="white" opacity="0.12" />
                <rect x="230" y="215" width="16" height="16" rx="2" fill="white" opacity="0.15" />
                {/* Antenna */}
                <rect x="98" y="60" width="4" height="20" fill="white" opacity="0.2" />
                <circle cx="100" cy="57" r="5" fill="white" opacity="0.15" />
              </svg>
            </div>
          </div>

          {/* Floating stat cards */}
          <div className="absolute top-32 right-16 xl:right-24 space-y-4">
            {/* Compliance Score */}
            <div className="bg-white rounded-2xl p-5 shadow-xl shadow-black/10 w-48">
              <p className="text-[11px] text-gray-400 font-medium mb-3">Compliance Score</p>
              <div className="flex items-center justify-center">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#2563eb" strokeWidth="6"
                      strokeDasharray={`${0.92 * 213.6} ${213.6}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-slate-900">92%</span>
                  </div>
                </div>
              </div>
              <p className="text-center text-[10px] text-blue-600 font-medium mt-2">Excellent</p>
            </div>

            {/* Total Clients */}
            <div className="bg-white rounded-2xl p-4 shadow-xl shadow-black/10 w-48">
              <p className="text-[11px] text-gray-400 font-medium mb-2">Total Clients</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xl font-bold text-slate-900">1,248</span>
                </div>
                <div className="flex items-center gap-1 text-green-500 text-xs font-medium">
                  <TrendingUp className="w-3 h-3" />
                  <span>12.5%</span>
                </div>
              </div>
            </div>

            {/* Returns Filed */}
            <div className="bg-white rounded-2xl p-4 shadow-xl shadow-black/10 w-48">
              <p className="text-[11px] text-gray-400 font-medium mb-2">Returns Filed</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xl font-bold text-slate-900">3,456</span>
              </div>
              {/* Mini sparkline */}
              <svg className="w-full h-6 mt-2" viewBox="0 0 120 24">
                <polyline
                  points="0,18 15,14 30,16 45,10 60,12 75,6 90,8 105,4 120,2"
                  fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Login Form ── */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white relative">
          {/* Dot pattern */}
          <div className="absolute top-0 right-0 w-40 h-40 opacity-[0.04]" style={{
            backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }} />

          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <BorderGlow
                backgroundColor="transparent"
                borderRadius={16}
                glowRadius={20}
                glowIntensity={1.5}
                edgeSensitivity={20}
                coneSpread={20}
                animated
                glowColor="217 91% 60%"
                colors={['#3b82f6', '#6366f1', '#8b5cf6']}
                fillOpacity={0}
              >
                <div className="w-16 h-16 flex items-center justify-center">
                  <img src="/icon.png" alt="Tax Suite" className="w-full h-full object-contain" />
                </div>
              </BorderGlow>
            </div>

            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
              <p className="text-sm text-gray-500 mt-1.5">Sign in to your account to continue</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <span className="text-red-500 text-xs font-bold">!</span>
                </div>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4.5 h-4.5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="w-4.5 h-4.5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-12 pl-11 pr-12 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded border border-gray-300 bg-white peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                      {rememberMe && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                </label>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  Forgot Password?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or continue with</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-3">
              <button className="h-11 rounded-xl border border-gray-200 bg-white text-sm font-medium text-slate-700 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-all">
                <Shield className="w-4 h-4 text-blue-600" />
                SSO Login
              </button>
              <button className="h-11 rounded-xl border border-gray-200 bg-white text-sm font-medium text-slate-700 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
            </div>

            {/* Register */}
            <p className="text-center text-sm text-gray-500 mt-7">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom Trust Bar ── */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Trust indicators */}
          <div className="flex items-center gap-6 sm:gap-10 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">99.9%</p>
                <p className="text-[10px] text-gray-400 -mt-0.5">System Uptime</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Lock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">256-bit</p>
                <p className="text-[10px] text-gray-400 -mt-0.5">SSL Encryption</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">24/7</p>
                <p className="text-[10px] text-gray-400 -mt-0.5">System Monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Shield className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">ISO 27001</p>
                <p className="text-[10px] text-gray-400 -mt-0.5">Certified Security</p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Headphones className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Need Help?</p>
                <p className="text-[10px] text-gray-400">Our support team is available 24/7</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
              <a href="mailto:support@taxsuite.com" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                <Mail className="w-3.5 h-3.5" />
                support@taxsuite.com
              </a>
              <a href="tel:+923001234567" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                <Phone className="w-3.5 h-3.5" />
                +92 300 1234567
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
