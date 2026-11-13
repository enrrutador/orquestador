import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // playwright-core se carga dinámico y solo en el servidor (módulo del
  // navegador); no debe empaquetarse en el bundle.
  serverExternalPackages: ["playwright-core"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "graph.facebook.com",
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
      },
    ],
  },
};

export default nextConfig;