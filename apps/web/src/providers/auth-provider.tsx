'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import {
  clearAccessLinkToken,
  clearStoredAuth,
  readAccessLinkToken,
  readStoredAuth,
  writeAccessLinkToken,
  writeStoredAuth,
} from '@/lib/auth';
import type { LoginResponse, StoredAuth, UserRole } from '@/lib/types';

type AuthContextValue = {
  accessToken: string | null;
  user: StoredAuth['user'] | null;
  tenant: StoredAuth['tenant'] | null;
  permissions: string[];
  impersonation: StoredAuth['impersonation'] | null;
  hasOriginalAuth: boolean;
  accessLinkToken: string | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    accessToken?: string | null,
    totpCode?: string,
  ) => Promise<LoginResponse & { requiresTotp?: boolean }>;
  logout: () => void;
  startImpersonation: (loginResponse: LoginResponse) => void;
  stopImpersonation: () => Promise<void>;
  setAccessLinkToken: (token: string) => void;
  updateTenant: (tenant: Partial<StoredAuth['tenant']>) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [accessLinkToken, setAccessLinkTokenState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setAuth(readStoredAuth());
    setAccessLinkTokenState(readAccessLinkToken());
    setIsHydrated(true);
  }, []);

  const setAccessLinkToken = useCallback((token: string) => {
    writeAccessLinkToken(token);
    setAccessLinkTokenState(token);
  }, []);

  const login = useCallback(
    async (email: string, password: string, token?: string | null, totpCode?: string) => {
      const loginResponse = await apiFetch<LoginResponse & { requiresTotp?: boolean }>('/auth/login', {
        method: 'POST',
        body: {
          email,
          password,
          accessToken: token ?? accessLinkToken ?? undefined,
          ...(totpCode ? { totpCode } : {}),
        },
        token: null,
      });

      // If server asks for TOTP, return early without storing auth
      if (loginResponse.requiresTotp) return loginResponse;

      const storedAuth: StoredAuth = {
        ...loginResponse,
        accessLinkToken: token ?? accessLinkToken,
      };

      writeStoredAuth(storedAuth);
      setAuth(storedAuth);
      return loginResponse;
    },
    [accessLinkToken],
  );

  const logout = useCallback(() => {
    queryClient.clear();
    clearStoredAuth();
    clearAccessLinkToken();
    setAuth(null);
    setAccessLinkTokenState(null);
    router.push('/login');
  }, [queryClient, router]);

  const startImpersonation = useCallback((loginResponse: LoginResponse) => {
    queryClient.clear();
    setAuth((current) => {
      const storedAuth: StoredAuth = {
        ...loginResponse,
        originalAuth: current ? {
          accessToken: current.accessToken,
          user: current.user,
          tenant: current.tenant,
          permissions: current.permissions,
          impersonation: current.impersonation,
        } : null,
      };

      writeStoredAuth(storedAuth);
      return storedAuth;
    });
    router.push('/dashboard');
  }, [queryClient, router]);

  const stopImpersonation = useCallback(async () => {
    const currentAuth = readStoredAuth();
    const supportSessionId = currentAuth?.impersonation?.supportSessionId;
    const originalToken = currentAuth?.originalAuth?.accessToken;

    if (supportSessionId && originalToken) {
      try {
        await apiFetch(`/platform/support/sessions/${supportSessionId}/close`, {
          method: 'PATCH',
          body: { notes: 'Sesión cerrada al volver a plataforma.' },
          token: originalToken,
        });
      } catch {
        // La sesión local debe restaurarse aunque el cierre remoto falle.
      }
    }

    setAuth((current) => {
      const originalAuth = current?.originalAuth;

      if (!originalAuth) {
        return current;
      }

      const storedAuth: StoredAuth = {
        ...originalAuth,
        originalAuth: null,
      };

      writeStoredAuth(storedAuth);
      return storedAuth;
    });
    queryClient.clear();
    router.push('/platform/support');
  }, [queryClient, router]);

  const updateTenant = useCallback((tenantUpdate: Partial<StoredAuth['tenant']>) => {
    setAuth((current) => {
      if (!current?.tenant) {
        return current;
      }

      const nextAuth = {
        ...current,
        tenant: {
          ...current.tenant,
          ...tenantUpdate,
        },
      };

      writeStoredAuth(nextAuth);
      return nextAuth;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken: auth?.accessToken ?? null,
      user: auth?.user ?? null,
      tenant: auth?.tenant ?? null,
      permissions: auth?.permissions ?? [],
      impersonation: auth?.impersonation ?? null,
      hasOriginalAuth: Boolean(auth?.originalAuth),
      accessLinkToken,
      isHydrated,
      isAuthenticated: Boolean(auth?.accessToken),
      login,
      logout,
      startImpersonation,
      stopImpersonation,
      setAccessLinkToken,
      updateTenant,
      hasPermission: (permission) =>
        auth?.permissions.includes(permission) ?? false,
      hasRole: (role) => auth?.user.role === role,
    }),
    [accessLinkToken, auth, isHydrated, login, logout, setAccessLinkToken, startImpersonation, stopImpersonation, updateTenant],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
