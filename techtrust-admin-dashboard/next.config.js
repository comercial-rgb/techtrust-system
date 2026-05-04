/** @type {import('next').NextConfig} */
function apiRemotePatterns() {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) return []
  try {
    const { protocol, hostname } = new URL(base)
    const p = protocol === 'https:' ? 'https' : 'http'
    return [{ protocol: p, hostname, pathname: '/**' }]
  } catch {
    return []
  }
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: 'localhost', pathname: '/**' },
      {
        protocol: 'https',
        hostname: 'admin.techtrustautosolutions.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'app.techtrustautosolutions.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'techtrustautosolutions.com',
        pathname: '/**',
      },
      { protocol: 'https', hostname: 'flagcdn.com', pathname: '/**' },
      ...apiRemotePatterns(),
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
