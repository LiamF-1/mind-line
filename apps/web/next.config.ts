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
  // Aggressive fix for Next.js 15 clientReferenceManifest bug
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    esmExternals: 'loose',
  },
  // Disable static optimization to prevent manifest issues
  trailingSlash: false,
  // Force all pages to be dynamic
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
