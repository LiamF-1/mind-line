import type { NextConfig } from 'next'
import path from 'path'

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
  // Use standalone output for production Docker builds (DigitalOcean)
  // Skip on Windows local development to avoid EPERM symlink issues
  ...(process.env.BUILD_STANDALONE === 'true' && {
    output: 'standalone',
    outputFileTracingRoot: path.join(__dirname, '../../'),
  }),
}

export default nextConfig
