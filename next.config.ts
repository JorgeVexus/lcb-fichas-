import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel's file tracing misses non-JS assets that playwright-core loads
  // dynamically (e.g. browsers.json), which breaks /api/pdf in production
  // with "Cannot find module '.../playwright-core/browsers.json'". Force
  // the whole package (and @sparticuz/chromium) into that route's bundle.
  outputFileTracingIncludes: {
    "/api/pdf": [
      "./node_modules/playwright-core/**/*",
      "./node_modules/@sparticuz/chromium/**/*",
      // sharp ships prebuilt native binaries (.node files) the same way --
      // sin esto correríamos el mismo riesgo de que Vercel no las incluya.
      "./node_modules/sharp/**/*",
      "./node_modules/@img/**/*",
    ],
  },
};

export default nextConfig;
