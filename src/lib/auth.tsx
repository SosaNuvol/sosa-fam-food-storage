import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setSignedOutListener } from './api';
import { clearTokens, loadTokens, saveTokens } from './tokenStore';
import type { Me, Membership, TokenResponse } from './types';

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  me: Me | null;
  /** The household the app is showing. */
  current: Membership | null;
  signIn(email: string, password: string): Promise<void>;
  register(email: string, password: string, displayName: string): Promise<void>;
  signOut(): Promise<void>;
  /** Reloads the user and their households, optionally switching to one. */
  refresh(selectHouseholdId?: string): Promise<void>;
  selectHousehold(householdId: string): void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const refresh = useCallback(async (selectHouseholdId?: string) => {
    const next = await api<Me>('/me');
    setMe(next);
    setCurrentId((prev) => {
      const wanted = selectHouseholdId ?? prev;
      return next.households.some((h) => h.householdId === wanted) ? wanted : next.households[0]?.householdId ?? null;
    });
    setStatus('signedIn');
  }, []);

  const signOutLocal = useCallback(() => {
    setMe(null);
    setCurrentId(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    setSignedOutListener(signOutLocal);
    (async () => {
      if (!(await loadTokens())) return signOutLocal();
      try {
        await refresh();
      } catch {
        signOutLocal();
      }
    })();
    return () => setSignedOutListener(null);
  }, [refresh, signOutLocal]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      me,
      current: me?.households.find((h) => h.householdId === currentId) ?? null,
      async signIn(email, password) {
        await saveTokens(await api<TokenResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false }));
        await refresh();
      },
      async register(email, password, displayName) {
        await saveTokens(
          await api<TokenResponse>('/auth/register', { method: 'POST', body: { email, password, displayName }, auth: false }),
        );
        await refresh();
      },
      async signOut() {
        const tokens = await loadTokens();
        if (tokens) {
          await api('/auth/logout', { method: 'POST', body: { refreshToken: tokens.refreshToken }, auth: false }).catch(() => {});
        }
        await clearTokens();
        signOutLocal();
      },
      refresh,
      selectHousehold: setCurrentId,
    }),
    [status, me, currentId, refresh, signOutLocal],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
