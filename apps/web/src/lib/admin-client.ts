import { clearAuthStorage } from "./auth-session";
import { getApiBaseUrl } from "./api";

export function getAccessToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("accessToken") ?? "";
}

function redirectToLandingForUnauthorized(): void {
  if (typeof window === "undefined") return;
  clearAuthStorage();
  window.location.assign("/");
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (res.status === 401) {
    redirectToLandingForUnauthorized();
    throw new Error(data.message ?? "Unauthorized");
  }
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data as T;
}
