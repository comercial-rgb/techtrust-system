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
        hostname: 'app.techtrustautosolutions.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'techtrustautosolutions.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'techtrust-api.onrender.com',
        pathname: '/**',
      },
      { protocol: 'https', hostname: 'flagcdn.com', pathname: '/**' },
      ...apiRemotePatterns(),
    ],
  },
}

module.exports = nextConfig
