import type { NextConfig } from "next";

const isStaticBuild = process.env.NEXT_PUBLIC_BUILD_MODE === "static";

const nextConfig: NextConfig = {
  output: isStaticBuild ? "export" : undefined,

  images: {
    unoptimized: isStaticBuild,
  },

  experimental: {
    serverActions: isStaticBuild
      ? undefined
      : {
          bodySizeLimit: "20mb",
        },
  },

  // SPA routing support
  trailingSlash: false,
};

export default nextConfig;
