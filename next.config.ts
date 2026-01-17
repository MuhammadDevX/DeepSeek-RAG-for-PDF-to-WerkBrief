import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    // Remove all console.* calls in production builds for security and cleaner output
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: [], // Remove ALL console methods including error and warn
          }
        : false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
  serverRuntimeConfig: {
    requestTimeout: 7200000, // 2 hours (120 minutes) for large file processing
  },
};

export default nextConfig;
