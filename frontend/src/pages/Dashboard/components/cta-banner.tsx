import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function FloatingIcon({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 3, delay, repeat: Infinity, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function Shield3D() {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative"
      style={{ perspective: '600px' }}
    >
      <motion.div
        animate={{ rotateY: [0, 5, 0, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Shield body */}
        <div className="relative h-32 w-28">
          {/* Shadow */}
          <div className="absolute -bottom-3 left-1/2 h-6 w-20 -translate-x-1/2 rounded-full bg-blue-300/30 blur-md" />
          {/* Main shield */}
          <div className="absolute inset-0 rounded-t-3xl rounded-b-[2rem] bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 shadow-[0_8px_32px_rgba(37,99,235,0.4),inset_0_2px_0_rgba(255,255,255,0.3)]">
            {/* Inner highlight */}
            <div className="absolute inset-0 rounded-t-3xl rounded-b-[2rem] bg-gradient-to-b from-white/20 to-transparent" />
            {/* Checkmark */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="h-14 w-14 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          </div>
          {/* Side edge (3D depth) */}
          <div className="absolute -right-1 top-2 h-[calc(100%-8px)] w-2 rounded-r-sm bg-gradient-to-b from-blue-600 to-blue-700 shadow-inner" />
        </div>
      </motion.div>
    </motion.div>
  )
}

function Laptop3D() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      style={{ perspective: '800px' }}
    >
      <motion.div
        animate={{ rotateX: [0, 2, 0, -2, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ transformStyle: 'preserve-3d', transform: 'rotateX(8deg) rotateY(-5deg)' }}
      >
        <div className="relative h-24 w-32">
          {/* Screen */}
          <div className="absolute top-0 left-2 h-[70%] w-[calc(100%-4px)] rounded-t-lg border border-blue-200 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            {/* Screen content - bar chart */}
            <div className="flex h-full items-end gap-1 p-2 pt-3">
              <div className="w-2 rounded-t bg-blue-400" style={{ height: '40%' }} />
              <div className="w-2 rounded-t bg-blue-500" style={{ height: '65%' }} />
              <div className="w-2 rounded-t bg-blue-400" style={{ height: '35%' }} />
              <div className="w-2 rounded-t bg-blue-300" style={{ height: '80%' }} />
              <div className="w-2 rounded-t bg-blue-500" style={{ height: '55%' }} />
              <div className="w-2 rounded-t bg-blue-400" style={{ height: '70%' }} />
              <div className="w-2 rounded-t bg-blue-300" style={{ height: '45%' }} />
              <div className="w-2 rounded-t bg-blue-500" style={{ height: '90%' }} />
            </div>
            {/* Screen glare */}
            <div className="absolute inset-0 rounded-t-lg bg-gradient-to-br from-white/10 to-transparent" />
          </div>
          {/* Base */}
          <div className="absolute bottom-0 left-0 h-[30%] w-full rounded-b-lg bg-gradient-to-b from-slate-300 to-slate-400 shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
            <div className="absolute top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-slate-500/50" />
          </div>
          {/* Side edge */}
          <div className="absolute -right-0.5 top-1 h-[calc(100%-4px)] w-1.5 rounded-r-sm bg-gradient-to-b from-slate-400 to-slate-500" />
        </div>
      </motion.div>
    </motion.div>
  )
}

function BarChart3D() {
  const bars = [
    { h: '45%', color: 'from-blue-300 to-blue-400', delay: 0 },
    { h: '70%', color: 'from-blue-400 to-blue-500', delay: 0.1 },
    { h: '35%', color: 'from-blue-300 to-blue-400', delay: 0.2 },
    { h: '85%', color: 'from-blue-500 to-blue-600', delay: 0.15 },
    { h: '55%', color: 'from-blue-400 to-blue-500', delay: 0.25 },
  ]

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      style={{ perspective: '600px' }}
    >
      <div
        className="flex items-end gap-1.5 rounded-xl border border-blue-100 bg-white/80 p-3 shadow-[0_8px_24px_rgba(37,99,235,0.12)] backdrop-blur-sm"
        style={{ transform: 'rotateY(8deg) rotateX(-3deg)', transformStyle: 'preserve-3d' }}
      >
        {bars.map((bar, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: bar.h }}
            transition={{ duration: 0.8, delay: 0.6 + bar.delay, ease: 'easeOut' }}
            className={`w-3 rounded-t bg-gradient-to-t ${bar.color} shadow-[2px_0_4px_rgba(0,0,0,0.1)]`}
            style={{ transformStyle: 'preserve-3d' }}
          />
        ))}
      </div>
    </motion.div>
  )
}

function Calculator3D() {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      style={{ perspective: '500px' }}
    >
      <motion.div
        animate={{ rotateZ: [0, 2, 0, -2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{ transform: 'rotateX(10deg) rotateY(-5deg)', transformStyle: 'preserve-3d' }}
      >
        <div className="relative h-20 w-16 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200 shadow-[0_6px_16px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">
          {/* Display */}
          <div className="mx-2 mt-2 h-5 rounded bg-gradient-to-r from-green-800 to-green-900 shadow-inner">
            <div className="flex h-full items-center justify-end px-1.5 font-mono text-[8px] text-green-300">1,234</div>
          </div>
          {/* Buttons */}
          <div className="mt-1.5 grid grid-cols-4 gap-0.5 px-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-2 rounded-sm bg-gradient-to-b from-slate-200 to-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.1)]" />
            ))}
          </div>
          {/* Side edge */}
          <div className="absolute -right-0.5 top-2 h-[calc(100%-8px)] w-1 rounded-r-sm bg-gradient-to-b from-slate-300 to-slate-400" />
        </div>
      </motion.div>
    </motion.div>
  )
}

function FloatingCube({ className = '', size = 8, color = 'bg-blue-400', delay = 0 }: { className?: string; size?: number; color?: string; delay?: number }) {
  return (
    <motion.div
      animate={{ y: [0, -12, 0], rotateX: [0, 180, 360], rotateY: [0, 90, 180] }}
      transition={{ duration: 4, delay, repeat: Infinity, ease: 'easeInOut' }}
      className={`absolute ${className}`}
      style={{ perspective: '400px' }}
    >
      <div
        className={`${color} shadow-lg`}
        style={{ width: size, height: size, transformStyle: 'preserve-3d' }}
      />
    </motion.div>
  )
}

export function CtaBanner() {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3 }}
      className="relative overflow-hidden rounded-3xl border border-blue-100/60 bg-gradient-to-br from-blue-50 via-blue-50/60 to-white shadow-[0_8px_40px_rgba(37,99,235,0.08)]"
    >
      {/* Background decoration */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-blue-50 blur-2xl" />

      {/* Floating cubes */}
      <FloatingCube className="right-[15%] top-[20%]" size={6} color="bg-blue-300" delay={0} />
      <FloatingCube className="right-[25%] top-[60%]" size={4} color="bg-blue-400" delay={1} />
      <FloatingCube className="right-[8%] top-[45%]" size={5} color="bg-blue-200" delay={2} />

      <div className="relative flex flex-col items-start justify-between gap-8 p-8 md:flex-row md:items-center md:p-12">
        {/* Left content */}
        <div className="max-w-md">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl lg:text-4xl"
          >
            Streamline Your{' '}
            <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              Tax Compliance
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-4 text-sm leading-relaxed text-slate-500 md:text-base"
          >
            Stay ahead with automated tracking, real-time insights and smart compliance management.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            whileHover={{ scale: 1.03, boxShadow: '0 8px 30px rgba(37,99,235,0.3)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/reports')}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all"
          >
            Explore Insights
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>

        {/* Right 3D illustration cluster */}
        <div className="relative hidden h-56 w-96 md:block" style={{ perspective: '1000px' }}>
          <div className="relative h-full w-full" style={{ transformStyle: 'preserve-3d', transform: 'rotateY(-5deg)' }}>
            {/* Shield - center */}
            <FloatingIcon delay={0} className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <Shield3D />
            </FloatingIcon>

            {/* Laptop - right */}
            <FloatingIcon delay={0.5} className="absolute right-4 top-0">
              <Laptop3D />
            </FloatingIcon>

            {/* Bar chart - bottom right */}
            <FloatingIcon delay={1} className="absolute bottom-2 right-0">
              <BarChart3D />
            </FloatingIcon>

            {/* Calculator - bottom left */}
            <FloatingIcon delay={1.5} className="absolute bottom-4 left-0">
              <Calculator3D />
            </FloatingIcon>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
