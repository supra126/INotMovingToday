import type { NextConfig } from "next";

/**
 * Build Mode Detection
 *
 * Set NEXT_PUBLIC_BUILD_MODE=static to build a static version
 * that can be deployed to GitHub Pages, Cloudflare Pages, etc.
 *
 * Static build limitations:
 * - No server-side API key support
 * - Users must provide their own API key
 * - No Server Actions (client-side API calls only)
 */
const isStaticBuild = process.env.NEXT_PUBLIC_BUILD_MODE === "static";

const nextConfig: NextConfig = {
  // Enable static export for static builds
  ...(isStaticBuild && {
    output: "export",
    distDir: "dist",
    // Disable image optimization for static export
    images: {
      unoptimized: true,
    },
  }),

  // Server-side configuration (only for non-static builds)
  ...(!isStaticBuild && {
    images: {
      unoptimized: false,
    },
    experimental: {
      serverActions: {
        bodySizeLimit: "20mb",
      },
      // Enable CSS optimization (critters for critical CSS extraction)
      optimizeCss: true,
    },
  }),

  // SPA routing support
  trailingSlash: false,

  // Performance optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
