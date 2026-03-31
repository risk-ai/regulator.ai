import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    "/blog/[slug]": ["./content/blog/**/*.md"],
  },
  outputFileTracingRoot: join(__dirname, "..", ".."),
  async redirects() {
    return [
      { source: '/console', destination: 'https://console.regulator.ai', permanent: false },
      { source: '/console/:path*', destination: 'https://console.regulator.ai/:path*', permanent: false },
      { source: '/login', destination: 'https://console.regulator.ai', permanent: false },
      { source: '/signup', destination: 'https://console.regulator.ai', permanent: false },
      { source: '/register', destination: 'https://console.regulator.ai/register', permanent: false },
      { source: '/dashboard', destination: 'https://console.regulator.ai', permanent: false },
    ];
  }
};

export default nextConfig;
