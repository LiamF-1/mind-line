import { Header } from '@/components/ui/header'

// Prevent Next.js 15 prerendering issues
export const dynamic = 'force-dynamic'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-background min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
