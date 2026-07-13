'use client'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react'
import { Rocket, ChevronDown } from 'lucide-react'

const enter = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, type: 'spring' as const, stiffness: 180, damping: 22, mass: 1 },
})

/* Soft 3D extruded white digit, like the reference artwork */
function DigitFour({
  nx,
  ny,
  reducedMotion,
  phase,
}: {
  nx: ReturnType<typeof useMotionValue<number>>
  ny: ReturnType<typeof useMotionValue<number>>
  reducedMotion: boolean
  phase: number
}) {
  const dx = useTransform(nx, (v) => v * 5)
  const dy = useTransform(ny, (v) => v * 5)
  return (
    <motion.span
      aria-hidden
      className="relative select-none font-sans font-extrabold leading-none"
      style={{
        fontSize: 'clamp(88px, 22vw, 260px)',
        color: '#ffffff',
        WebkitTextStroke: '1px rgba(148, 163, 184, 0.4)',
        zIndex: 20,
        x: reducedMotion ? 0 : dx,
        y: reducedMotion ? 0 : dy,
        textShadow: [
          '1px 1px 0 #e8edf5',
          '2px 2px 0 #dfe6f0',
          '3px 3px 0 #d6deec',
          '4px 4px 0 #cdd7e7',
          '5px 5px 0 #c4cfe3',
          '6px 6px 0 #bbc8de',
          '7px 7px 0 #b2c0da',
          '8px 8px 0 #a9b9d5',
          '14px 22px 34px rgba(37, 99, 235, 0.22)',
          '24px 40px 70px rgba(15, 23, 42, 0.14)',
        ].join(', '),
      }}
      animate={
        reducedMotion ? undefined : { y: [0, -6, 0, 5, 0], rotate: [0, 0.8, 0, -0.8, 0] }
      }
      transition={{
        duration: 9,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: phase,
      }}
    >
      4
    </motion.span>
  )
}

/* Central astronaut portal */
function AstronautPortal({
  nx,
  ny,
  reducedMotion,
}: {
  nx: ReturnType<typeof useMotionValue<number>>
  ny: ReturnType<typeof useMotionValue<number>>
  reducedMotion: boolean
}) {
  const dx = useTransform(nx, (v) => v * -8)
  const dy = useTransform(ny, (v) => v * -8)
  return (
    <motion.div
      className="relative shrink-0"
      style={{ x: reducedMotion ? 0 : dx, y: reducedMotion ? 0 : dy, zIndex: 30 }}
      animate={reducedMotion ? undefined : { y: [0, -10, 0, 8, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Soft blue glow behind the portal */}
      <div
        aria-hidden
        className="absolute inset-[-18%] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.22), transparent 65%)',
          filter: 'blur(24px)',
        }}
      />
      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: 'clamp(130px, 30vw, 300px)',
          height: 'clamp(130px, 30vw, 300px)',
          boxShadow:
            '0 24px 60px rgba(37, 99, 235, 0.22), 0 8px 24px rgba(15, 23, 42, 0.08), inset 0 0 0 1px rgba(255,255,255,0.6)',
        }}
      >
        <img
          src="/images/astronaut-portal.png"
          alt="Astronaut floating in a blue portal"
          className="h-full w-full scale-[1.22] object-cover"
        />
      </div>
    </motion.div>
  )
}

/* Blurred blue spheres + dots + orbit ellipse */
function Atmosphere({
  nx,
  ny,
  reducedMotion,
}: {
  nx: ReturnType<typeof useMotionValue<number>>
  ny: ReturnType<typeof useMotionValue<number>>
  reducedMotion: boolean
}) {
  const px = useTransform(nx, (v) => v * 14)
  const py = useTransform(ny, (v) => v * 14)
  const pxSlow = useTransform(nx, (v) => v * 6)
  const pySlow = useTransform(ny, (v) => v * 6)

  const sphere = (style: React.CSSProperties) => (
    <div
      aria-hidden
      className="absolute rounded-full"
      style={{
        background:
          'radial-gradient(circle at 32% 28%, #60a5fa 0%, #2563eb 55%, #1d4ed8 100%)',
        ...style,
      }}
    />
  )

  const dots: Array<{ top: string; left: string; size: number; opacity: number }> = [
    { top: '12%', left: '22%', size: 8, opacity: 0.9 },
    { top: '8%', left: '46%', size: 6, opacity: 0.7 },
    { top: '16%', left: '68%', size: 10, opacity: 0.85 },
    { top: '26%', left: '84%', size: 7, opacity: 0.6 },
    { top: '30%', left: '10%', size: 6, opacity: 0.6 },
    { top: '44%', left: '6%', size: 9, opacity: 0.75 },
    { top: '52%', left: '90%', size: 8, opacity: 0.8 },
    { top: '64%', left: '16%', size: 7, opacity: 0.55 },
    { top: '70%', left: '78%', size: 9, opacity: 0.7 },
    { top: '80%', left: '34%', size: 6, opacity: 0.5 },
    { top: '20%', left: '36%', size: 5, opacity: 0.5 },
    { top: '38%', left: '72%', size: 6, opacity: 0.65 },
    { top: '58%', left: '58%', size: 5, opacity: 0.45 },
    { top: '86%', left: '62%', size: 7, opacity: 0.6 },
    { top: '10%', left: '88%', size: 5, opacity: 0.55 },
    { top: '74%', left: '48%', size: 5, opacity: 0.4 },
  ]

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Orbit ellipse behind the composition */}
      <motion.svg
        viewBox="0 0 1200 800"
        className="absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2"
        style={{ x: reducedMotion ? 0 : pxSlow, y: reducedMotion ? 0 : pySlow }}
        fill="none"
      >
        <ellipse
          cx="600"
          cy="380"
          rx="430"
          ry="180"
          stroke="#93c5fd"
          strokeWidth="1.5"
          opacity="0.7"
          transform="rotate(-14 600 380)"
        />
        <ellipse
          cx="600"
          cy="400"
          rx="540"
          ry="230"
          stroke="#bfdbfe"
          strokeWidth="1"
          opacity="0.5"
          transform="rotate(-10 600 400)"
        />
        {/* Sparkle crosses */}
        <path d="M150 180 l14 14 M164 180 l-14 14" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        <path d="M170 260 h18 M179 251 v18" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        <path d="M1010 560 h16 M1018 552 v16" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      </motion.svg>

      {/* Big blurred spheres at the edges */}
      <motion.div
        className="absolute inset-0"
        style={{ x: reducedMotion ? 0 : px, y: reducedMotion ? 0 : py }}
      >
        {sphere({
          top: '14%',
          right: 'calc(clamp(120px, 22vw, 280px) / -2.2)',
          width: 'clamp(120px, 22vw, 280px)',
          height: 'clamp(120px, 22vw, 280px)',
          filter: 'blur(8px)',
          opacity: 0.92,
        })}
        {sphere({
          bottom: '12%',
          left: 'calc(clamp(130px, 24vw, 300px) / -2.4)',
          width: 'clamp(130px, 24vw, 300px)',
          height: 'clamp(130px, 24vw, 300px)',
          filter: 'blur(12px)',
          opacity: 0.85,
        })}
        {sphere({
          top: '56%',
          left: '16%',
          width: 'clamp(28px, 4vw, 44px)',
          height: 'clamp(28px, 4vw, 44px)',
          filter: 'blur(1px)',
          opacity: 0.95,
        })}
        {sphere({
          top: '16%',
          left: '58%',
          width: 'clamp(18px, 2.4vw, 26px)',
          height: 'clamp(18px, 2.4vw, 26px)',
          opacity: 0.9,
        })}
        {sphere({
          top: '70%',
          right: '20%',
          width: 'clamp(22px, 3vw, 34px)',
          height: 'clamp(22px, 3vw, 34px)',
          filter: 'blur(2px)',
          opacity: 0.85,
        })}
      </motion.div>

      {/* Small dot particles */}
      <motion.div
        className="absolute inset-0"
        style={{ x: reducedMotion ? 0 : pxSlow, y: reducedMotion ? 0 : pySlow }}
      >
        {dots.map((d, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              top: d.top,
              left: d.left,
              width: d.size,
              height: d.size,
              background: i % 3 === 0 ? '#2563eb' : i % 3 === 1 ? '#3b82f6' : '#93c5fd',
              opacity: d.opacity,
            }}
            animate={
              reducedMotion
                ? undefined
                : { y: [0, i % 2 === 0 ? -8 : 8, 0], opacity: [d.opacity, d.opacity * 0.5, d.opacity] }
            }
            transition={{
              duration: 5 + (i % 5),
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.35,
            }}
          />
        ))}
      </motion.div>
    </div>
  )
}

export function NotFoundPage() {
  const prefersReducedMotion = useReducedMotion()
  const reducedMotion = prefersReducedMotion ?? false
  const navigate = useNavigate()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const nx = useSpring(rawX, { stiffness: 160, damping: 18, mass: 1.2 })
  const ny = useSpring(rawY, { stiffness: 160, damping: 18, mass: 1.2 })

  useEffect(() => {
    if (reducedMotion) return
    const onMove = (e: MouseEvent) => {
      rawX.set((e.clientX / window.innerWidth - 0.5) * 2)
      rawY.set((e.clientY / window.innerHeight - 0.5) * 2)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [rawX, rawY, reducedMotion])

  return (
    <main
      className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 md:px-16"
      style={{ background: '#ffffff' }}
    >
      <h1 className="sr-only">404 — Page not found</h1>

      {mounted && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Atmosphere nx={nx} ny={ny} reducedMotion={reducedMotion} />
        </motion.div>
      )}

      {/* 4 [astronaut] 4 */}
      <motion.div
        className="flex w-full items-center justify-center gap-1 sm:gap-4 md:gap-6"
        {...enter(0.35)}
      >
        <DigitFour nx={nx} ny={ny} reducedMotion={reducedMotion} phase={0} />
        <AstronautPortal nx={nx} ny={ny} reducedMotion={reducedMotion} />
        <DigitFour nx={nx} ny={ny} reducedMotion={reducedMotion} phase={2.7} />
      </motion.div>

      {/* Headline */}
      <motion.p
        className="mt-10 text-balance text-center font-sans text-2xl font-bold md:mt-14 md:text-[28px]"
        style={{ color: '#0F172A', zIndex: 50 }}
        {...enter(0.5)}
      >
        Oops! You've drifted off course.
      </motion.p>

      {/* Description */}
      <motion.p
        className="mt-4 max-w-[420px] text-pretty text-center text-[15px] leading-relaxed"
        style={{ color: '#475569', zIndex: 50 }}
        {...enter(0.6)}
      >
        The page you're looking for doesn't exist or has moved to another galaxy.
      </motion.p>

      {/* CTA */}
      <motion.div className="mt-8" style={{ zIndex: 50 }} {...enter(0.7)}>
        <motion.div
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20, mass: 0.8 }}
        >
          <button
            onClick={() => navigate('/')}
            className="flex h-12 items-center justify-center gap-2.5 rounded-full px-8 text-[15px] font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer"
            style={{
              background: '#2563EB',
              boxShadow: '0 10px 28px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            <Rocket className="h-4 w-4" aria-hidden />
            Take Me Home
          </button>
        </motion.div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-6 flex flex-col items-center gap-1"
        style={{ zIndex: 50 }}
        {...enter(0.9)}
      >
        <span className="text-xs" style={{ color: '#94A3B8' }}>
          Scroll to explore
        </span>
        <motion.span
          animate={reducedMotion ? undefined : { y: [0, 4, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-4 w-4" style={{ color: '#94A3B8' }} aria-hidden />
        </motion.span>
      </motion.div>
    </main>
  )
}
