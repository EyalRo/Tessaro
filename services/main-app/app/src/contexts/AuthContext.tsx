import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthError, AuthSession, AuthUser } from 'shared/libs/auth';
import authService from '../services/authService';

type LoginPayload = {
  email: string;
  password: string;
};

type AuthContextValue = {
  session: AuthSession | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  initializing: boolean;
  loading: boolean;
  error: string | null;
  login(payload: LoginPayload): Promise<AuthUser | null>;
  logout(): Promise<void>;
  clearError(): void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const resolveErrorMessage = (error: unknown): string => {
  if (error instanceof AuthError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unable to sign in - please try again.';
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(authService.getSession());
  const [initializing, setInitializing] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextSession: AuthSession | null) => {
      setSession(nextSession);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!initializing) {
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      try {
        const restored = await authService.restore();
        if (!cancelled) {
          setSession(restored);
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [initializing]);

  const login = useCallback(async ({ email, password }: LoginPayload) => {
    setLoading(true);
    setError(null);

    try {
      const nextSession = await authService.login({ email, password });
      setSession(nextSession);
      return nextSession.user;
    } catch (error: unknown) {
      const message = resolveErrorMessage(error);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setSession(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session),
    initializing,
    loading,
    error,
    login,
    logout,
    clearError
  }), [session, initializing, loading, error, login, logout, clearError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider, useAuthContext };
export type { AuthContextValue, LoginPayload };
