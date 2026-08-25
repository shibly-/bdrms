import type { NextConfig } from "next";

/**
 * Nest API origin (no trailing slash, no /api suffix).
 * Local: http://localhost:4000
 * Vercel: https://your-api.vercel.app
 */
function resolveApiOrigin(): string {
  const raw = (
    process.env.API_ORIGIN ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:4000"
  )
    .trim()
    .replace(/\/$/, "")
    .replace(/\/api$/, "");

  if (process.env.VERCEL && /localhost|127\.0\.0\.1/i.test(raw)) {
    throw new Error(
      "Set API_ORIGIN on the web Vercel project to your deployed API origin (e.g. https://your-api.vercel.app). Do not use localhost.",
    );
  }

  return raw;
}

const nextConfig: NextConfig = {
  async rewrites() {
    const origin = resolveApiOrigin();
    return [
      {
        source: "/api/:path*",
        destination: `${origin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
