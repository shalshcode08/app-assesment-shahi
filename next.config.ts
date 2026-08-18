import type { NextConfig } from "next";

// Tunnels (ngrok and friends) serve the app from a different origin than the
// dev server was started on. Without these, Next blocks the dev asset requests
// the client components need to hydrate, and rejects Server Action posts
// because the request Origin does not match the Host.
const TUNNEL_ORIGINS = [
  "*.ngrok-free.app",
  "*.ngrok-free.dev",
  "*.ngrok.app",
  "*.ngrok.io",
  "*.trycloudflare.com",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: TUNNEL_ORIGINS,
  experimental: {
    serverActions: {
      allowedOrigins: TUNNEL_ORIGINS,
      // Question workbooks are posted to a Server Action; the default 1MB cap
      // rejects a full sheet before it reaches the parser. The upload itself is
      // capped at 4MB, below the request-body limit hosting platforms impose.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
