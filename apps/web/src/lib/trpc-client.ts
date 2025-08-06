import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '@/server/api/root'
import superjson from 'superjson'

function getBaseUrl() {
  if (typeof window !== 'undefined') return '' // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}` // SSR should use vercel url
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL // explicit app URL
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL // NextAuth URL fallback
  return `http://localhost:${process.env.PORT ?? 3000}` // dev SSR should use localhost
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
})
