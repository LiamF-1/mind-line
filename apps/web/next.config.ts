import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@prisma/client'],
  // Only use standalone output for production Docker builds
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  outputFileTracingRoot:
    process.env.BUILD_STANDALONE === 'true' ? process.cwd() : undefined,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

export default nextConfig
