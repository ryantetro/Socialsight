import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
};

export default nextConfig;
