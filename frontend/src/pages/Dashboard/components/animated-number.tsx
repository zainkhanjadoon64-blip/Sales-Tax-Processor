import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring, useInView } from 'motion/react'

interface AnimatedNumberProps {
  value: number
  suffix?: string
  className?: string
}

export function AnimatedNumber({ value, suffix = '', className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { damping: 32, stiffness: 120 })
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  useEffect(() => {
    if (isInView) motionValue.set(value)
  }, [isInView, value, motionValue])

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = Math.round(latest).toLocaleString() + suffix
      }
    })
    return unsubscribe
  }, [spring, suffix])

  return <span ref={ref} className={className}>0{suffix}</span>
}
