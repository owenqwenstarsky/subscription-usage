import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permit this machine's Tailnet address to load dev-only assets and HMR.
  allowedDevOrigins: ["100.72.80.114"],
};

export default nextConfig;
