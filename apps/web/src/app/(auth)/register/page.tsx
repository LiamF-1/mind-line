import { AuthForm } from '@/components/auth-form'

// Prevent Next.js 15 prerendering issues
export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  return <AuthForm mode="register" />
}
