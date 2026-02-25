/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
      'provider.techtrustautosolutions.com',
      'techtrustautosolutions.com',
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
