import { Header } from '@/components/ui/header'
import { Suspense } from 'react'

// Prevent Next.js 15 prerendering issues
export const dynamic = 'force-dynamic'

function HeaderFallback() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center">
            <span className="text-lg font-bold">Mindline</span>
          </div>
          <div className="bg-muted h-9 w-16 animate-pulse rounded-md" />
        </div>
      </div>
    </header>
  )
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-background min-h-screen">
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
