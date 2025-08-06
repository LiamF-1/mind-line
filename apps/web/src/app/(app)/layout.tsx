import { Header } from '@/components/ui/header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </>
  )
}
