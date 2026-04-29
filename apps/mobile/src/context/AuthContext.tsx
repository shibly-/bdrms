import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { AuthSession } from '../auth/session';
import { clearSession, loadSession, saveSession } from '../auth/session';

type AuthContextValue = {
  session: AuthSession | null;
  ready: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  const refreshSession = useCallback(async () => {
    const s = await loadSession();
    setSession(s);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshSession();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const signIn = useCallback(async (s: AuthSession) => {
    await saveSession(s);
    setSession(s);
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, ready, signIn, signOut, refreshSession }),
    [session, ready, signIn, signOut, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
