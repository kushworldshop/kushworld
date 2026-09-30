/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '64mb',
    },
    proxyClientMaxBodySize: '64mb',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'kushworldstudio.co',
      },
    ],
  },
};

module.exports = nextConfig;