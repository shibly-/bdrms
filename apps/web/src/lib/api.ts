/**
 * Nest API base including the `/api` prefix.
 * Local: http://localhost:4000/api
 * Vercel: https://YOUR-API-PROJECT.vercel.app/api
 * (must be the API project, not this web project)
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

  if (typeof window !== "undefined") {
    const pageHost = window.location.hostname;
    const onLocalhost = pageHost === "localhost" || pageHost === "127.0.0.1";

    if (!onLocalhost) {
      if (!fromEnv || /localhost|127\.0\.0\.1/i.test(fromEnv)) {
        return "";
      }
      try {
        const apiHost = new URL(fromEnv).hostname;
        if (apiHost === pageHost) {
          return "";
        }
      } catch {
        return "";
      }
      return fromEnv;
    }
  }

  return fromEnv || "http://localhost:4000/api";
}

export function requireApiBaseUrl(): string {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(
      "API URL is not configured. On the web Vercel project, set NEXT_PUBLIC_API_BASE_URL to the API project, for example https://your-api-project.vercel.app/api — not this web app's URL.",
    );
  }
  return base;
}
