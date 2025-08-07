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
  // NUCLEAR FIX: Force standalone mode to bypass clientReferenceManifest
  output: 'standalone',
  // Disable problematic optimizations
  swcMinify: true,
  // Force all pages to be dynamic to prevent manifest issues
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ]
  },
}

export default nextConfig
