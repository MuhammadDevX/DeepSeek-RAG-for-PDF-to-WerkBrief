import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
