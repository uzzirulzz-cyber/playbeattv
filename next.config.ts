import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Rewrite /admin, /storefront, etc. to the main page so the client-side
  // router can handle them as view switches (single-page-app style).
  async rewrites() {
    const views = [
      "admin",
      "storefront",
      "live",
      "movies",
      "series",
      "favorites",
      "history",
      "categories",
      "account",
    ];
    return views.map((v) => ({
      source: `/${v}`,
      destination: "/",
    }));
  },
};

export default nextConfig;
