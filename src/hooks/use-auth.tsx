import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import * as authApi from '@/api/auth';
import type { RegisterInput, User } from '@/api/auth';
import { ApiError, onSessionExpired } from '@/api/client';
import { hasToken } from '@/api/token-storage';
import { deleteCache, readCache, USER_CACHE_KEYS, writeCache } from '@/utils/offline-cache';

const SESSION_USER_KEY = 'session-user';

// Profile only (name, email, role, points): the token itself stays in SecureStore.
function forgetUserData() {
  deleteCache(...USER_CACHE_KEYS);
}

type AuthStatus = 'loading' | 'guest' | 'authenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string, remember: boolean) => Promise<User>;
  signUp: (input: RegisterInput) => Promise<User | null>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Signing in is optional: guests can browse, order and reserve. An account only adds
 * points and, for staff, the mesero / admin role.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUserState] = useState<User | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      if (!(await hasToken())) {
        setStatus('guest');
        return;
      }
      // Start with the last known profile so the right screens (customer or admin) show
      // immediately; the server check below then confirms or ends the session.
      const saved = await readCache<User>(SESSION_USER_KEY);
      if (saved && !controller.signal.aborted) {
        setUserState(saved.data);
        setStatus('authenticated');
      }
      try {
        const current = await authApi.me(controller.signal);
        if (current) writeCache(SESSION_USER_KEY, current);
        setUserState(current);
        setStatus(current ? 'authenticated' : 'guest');
      } catch (err) {
        if (controller.signal.aborted) return;
        // 401: the API client already cleared the token, the session is over.
        // Anything else (no internet, server down): keep the customer signed in with
        // the last known profile; the token is revalidated on the next launch.
        const cached = err instanceof ApiError && err.status === 401 ? null : await readCache<User>(SESSION_USER_KEY);
        if (!cached) forgetUserData();
        setUserState(cached?.data ?? null);
        setStatus(cached ? 'authenticated' : 'guest');
      }
    })();

    const unsubscribe = onSessionExpired(() => {
      forgetUserData();
      setUserState(null);
      setStatus('guest');
    });

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, remember: boolean) => {
    const signedIn = await authApi.login(email, password, { remember });
    forgetUserData();
    // "Mantener sesión iniciada" off: the profile isn't kept for the next launch.
    if (remember) writeCache(SESSION_USER_KEY, signedIn);
    setUserState(signedIn);
    setStatus('authenticated');
    return signedIn;
  };

  const signUp = async (input: RegisterInput) => {
    const created = await authApi.register(input);
    if (created) {
      forgetUserData();
      writeCache(SESSION_USER_KEY, created);
      setUserState(created);
      setStatus('authenticated');
    }
    return created;
  };

  const signOut = async () => {
    forgetUserData();
    setUserState(null);
    setStatus('guest');
    await authApi.logout().catch(() => {});
  };

  const setUser = (next: User) => setUserState(next);

  return (
    <AuthContext value={{ status, user, signIn, signUp, signOut, setUser }}>{children}</AuthContext>
  );
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
