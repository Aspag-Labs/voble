import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },

  serverExternalPackages: ['pino', 'pino-pretty'],

  experimental: {
    turbopackFileSystemCacheForDev: true,
  },

  devIndicators: {
    position: 'top-left', // Options: 'bottom-left' (default), 'bottom-right', 'top-left', 'top-right'
  },
}

export default nextConfig

