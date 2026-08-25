import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Sources d'images autorisées pour next/image.
    // À compléter avec le domaine média Vitahome / le DAM client.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "pro.vitahome.fr" },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
