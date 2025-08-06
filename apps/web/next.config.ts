import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@prisma/client'],
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Fix for Next.js 15 not-found page prerendering issue
  // https://github.com/vercel/next.js/issues/65447
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // Only use standalone output for production Docker builds
  ...(process.env.BUILD_STANDALONE === 'true' && {
    output: 'standalone',
    outputFileTracingRoot: process.cwd(),
  }),
}

export default nextConfig
