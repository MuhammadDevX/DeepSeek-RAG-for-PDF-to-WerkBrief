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
    requestTimeout: 1200000, // 20 minutes
  },
};

export default nextConfig;
