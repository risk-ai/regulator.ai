import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { withSentryConfig } from "@sentry/nextjs";

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
      { source: '/signup', destination: 'https://console.regulator.ai?mode=register', permanent: false },
      { source: '/register', destination: 'https://console.regulator.ai?mode=register', permanent: false },
      { source: '/dashboard', destination: 'https://console.regulator.ai', permanent: false },
    ];
  }
};

const sentryConfig = {
  org: process.env.SENTRY_ORG || "",
  project: process.env.SENTRY_PROJECT || "",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

export default withSentryConfig(nextConfig, sentryConfig);
