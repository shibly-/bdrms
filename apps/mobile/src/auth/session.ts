import * as SecureStore from 'expo-secure-store';

const KEY = 'bdrms_auth_session';

export type UserRole = 'admin' | 'staff' | 'user';

export type AuthSession = {
  accessToken: string;
  role: UserRole;
};

export async function loadSession(): Promise<AuthSession | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed?.accessToken && parsed?.role) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export async function saveSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
