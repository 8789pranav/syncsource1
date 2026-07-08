import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai", "*.preview-chat-*", "127.0.0.1"],
};

export default nextConfig;
