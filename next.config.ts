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
    requestTimeout: 3600000, // 1 hour
  },
};

export default nextConfig;
