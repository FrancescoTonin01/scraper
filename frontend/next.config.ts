import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { hostname: "**.autoscout24.it" },
      { hostname: "**.autoscout24.net" },
      { hostname: "images.sbito.it" },
      { hostname: "**.subito.it" },
    ],
  },
};

export default nextConfig;
