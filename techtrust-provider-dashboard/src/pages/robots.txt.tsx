import { GetServerSideProps } from 'next'

const SITE_URL = 'https://provider.techtrustautosolutions.com'

function generateRobots(): string {
  return `User-agent: *
Allow: /register
Allow: /login
Disallow: /dashboard
Disallow: /orcamentos
Disallow: /pedidos
Disallow: /servicos
Disallow: /configuracoes
Disallow: /faturas
Disallow: /compliance
Disallow: /onboarding

Sitemap: ${SITE_URL}/sitemap.xml`
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const robots = generateRobots()

  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate')
  res.write(robots)
  res.end()

  return { props: {} }
}

export default function Robots() {
  return null
}
