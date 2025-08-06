import { cn } from '@/lib/utils'

interface FullCenterProps {
  children: React.ReactNode
  className?: string
}

export function FullCenter({ children, className }: FullCenterProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen items-center justify-center p-4',
        className
      )}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
