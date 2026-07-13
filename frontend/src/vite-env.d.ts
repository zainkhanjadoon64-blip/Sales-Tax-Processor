/// <reference types="vite/client" />

declare module '@/components/ui/BorderGlow' {
  import { ReactNode } from 'react'
  interface BorderGlowProps {
    children: ReactNode
    className?: string
    edgeSensitivity?: number
    glowColor?: string
    backgroundColor?: string
    borderRadius?: number
    glowRadius?: number
    glowIntensity?: number
    coneSpread?: number
    animated?: boolean
    colors?: string[]
    fillOpacity?: number
  }
  const BorderGlow: React.FC<BorderGlowProps>
  export default BorderGlow
}