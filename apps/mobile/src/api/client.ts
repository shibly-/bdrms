export function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const url = raw?.replace(/\/$/, '');
  return url ?? 'http://localhost:4000/api';
}

export type ApiErrorBody = { message?: string | string[]; statusCode?: number };

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const base = getApiBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.body && typeof init.body === 'string'
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.token) {
    headers.Authorization = `Bearer ${init.token}`;
  }
  const { token: _t, ...rest } = init;
  const res = await fetch(url, { ...rest, headers });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { message: text };
    }
  }
  if (!res.ok) {
    const err = data as ApiErrorBody;
    const msg = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}
