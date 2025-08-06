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
  // Only use standalone output for production Docker builds
  ...(process.env.BUILD_STANDALONE === 'true' && {
    output: 'standalone',
    outputFileTracingRoot: process.cwd(),
  }),
}

export default nextConfig
