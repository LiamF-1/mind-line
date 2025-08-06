import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@prisma/client'],
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
}

export default nextConfig
