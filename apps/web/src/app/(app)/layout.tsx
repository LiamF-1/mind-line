import { Header } from '@/components/ui/header'
import { AppSidebar } from '@/components/app-sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="mx-auto max-w-7xl">
        <div className="flex h-[calc(100vh-56px)]">
          <AppSidebar />
          <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
