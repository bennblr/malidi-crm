/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Оптимизация для SPA навигации
  experimental: {
    optimizePackageImports: ['antd'],
  },
}

module.exports = nextConfig

