import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      { source: "/playground", destination: "/" },
      { source: "/explore", destination: "/" },
      { source: "/explore-models", destination: "/" },
      { source: "/models", destination: "/" },
      { source: "/test-results", destination: "/" },
    ];
  },
};

export default nextConfig;
