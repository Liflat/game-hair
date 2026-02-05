/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/game-hair',
  assetPrefix: '/game-hair/',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
