/** Public landing route for unauthenticated or expired sessions */
export const AUTH_LANDING_PATH = "/";

export function clearAuthStorage(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("accessToken");
  window.localStorage.removeItem("userRole");
}

function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** True if token is missing exp, malformed, or past expiry (with small clock skew). */
export function isAccessTokenExpired(token: string): boolean {
  if (!token) return true;
  const exp = decodeJwtExp(token);
  if (exp == null) return true;
  return Date.now() / 1000 >= exp - 30;
}
