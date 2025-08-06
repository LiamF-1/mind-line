import { Header } from '@/components/ui/header'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  )
}
