/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    turbo: false
  },
  async redirects() {
    return [
      { source: '/console', destination: 'https://console.regulator.ai', permanent: false },
      { source: '/console/:path*', destination: 'https://console.regulator.ai/:path*', permanent: false },
      { source: '/login', destination: 'https://console.regulator.ai', permanent: false },
      { source: '/signup', destination: 'https://console.regulator.ai', permanent: false },
      { source: '/dashboard', destination: 'https://console.regulator.ai', permanent: false },
    ];
  }
};

export default nextConfig;
