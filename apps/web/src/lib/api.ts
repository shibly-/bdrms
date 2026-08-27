/**
 * Browser calls same-origin `/api`. Next.js rewrites those requests to the
 * Nest server (local PORT 4000, or API_ORIGIN on Vercel).
 */
export function getApiBaseUrl(): string {
  return "/api";
}
