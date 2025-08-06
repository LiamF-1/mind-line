import { FullCenter } from '@/components/ui/full-center'

// Prevent Next.js 15 prerendering issues
export const dynamic = 'force-dynamic'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <FullCenter>{children}</FullCenter>
    </div>
  )
}
