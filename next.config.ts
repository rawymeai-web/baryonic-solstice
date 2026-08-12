import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wqklukruzxicjaeblser.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  }
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "rawy",
  project: "backend",

  // Only print logs when uploading source maps in CI/CD to control output size
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/prereqs/javascript/sourcemaps/upload-sourcemaps/
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to bypass Adblockers
  tunnelRoute: "/monitoring",

  sourcemaps: {
    // Delete source maps after upload to prevent visitors from seeing them
    deleteSourcemapsAfterUpload: true,
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Jobs
  automaticVercelMonitors: true,
});

