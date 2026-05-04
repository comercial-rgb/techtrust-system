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
        hostname: 'provider.techtrustautosolutions.com',
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
  // Custom headers for SEO and security
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
  // Redirects for clean URLs
  async redirects() {
    return [
      {
        source: '/cadastro',
        destination: '/register',
        permanent: true,
      },
      {
        source: '/signup',
        destination: '/register',
        permanent: true,
      },
      {
        source: '/registro',
        destination: '/register',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
