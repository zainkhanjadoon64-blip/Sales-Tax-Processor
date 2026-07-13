import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  light?: boolean
}

export function Logo({ className, light = false }: LogoProps) {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={cn('flex items-center gap-2.5', className)}
    >
      <span className="relative flex h-10 w-10 items-center justify-center">
        <img
          src="/icon.png"
          alt="Tax Suite"
          className={cn(
            'h-10 w-10 object-contain',
            light && 'brightness-0 invert',
          )}
        />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'text-xl font-bold tracking-tight',
            light ? 'text-primary-foreground' : 'text-primary',
          )}
        >
          Tax Suite
        </span>
        <span
          className={cn(
            'text-[10px] font-medium',
            light ? 'text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          Compliance Hub
        </span>
      </span>
    </button>
  )
}
