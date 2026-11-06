import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  // The admin panel lives inside the dashboard now; keep old links working.
  async redirects() {
    return [{ source: "/admin", destination: "/dashboard/admin", permanent: true }]
  },
  // Print agents check this for updates; never serve a stale copy.
  async headers() {
    return [{ source: "/downloads/agent.json", headers: [{ key: "Cache-Control", value: "no-cache" }] }]
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
