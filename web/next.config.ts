import path from "node:path";
import type { NextConfig } from "next";

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1");
const apiIsLocal = apiUrl.hostname === "localhost" || apiUrl.hostname === "127.0.0.1";
const mediaUrl = new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL || `${apiUrl.origin}/media`);
const mediaPath = mediaUrl.pathname.replace(/\/$/, "") || "";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  outputFileTracingIncludes: {
    "/*": [
      "../node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**/*",
    ],
  },
  images: {
    dangerouslyAllowLocalIP: apiIsLocal,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: apiUrl.protocol === "https:" ? "https" : "http",
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: "/media/**",
      },
      {
        protocol: mediaUrl.protocol === "https:" ? "https" : "http",
        hostname: mediaUrl.hostname,
        port: mediaUrl.port,
        pathname: `${mediaPath}/**`,
      },
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
