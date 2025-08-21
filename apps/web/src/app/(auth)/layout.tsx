import { FullCenter } from '@/components/ui/full-center'

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
