import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, tokenStorage } from '../api/client';
import type { AuthResult, User } from '../api/types';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  /**
   * Rehidrata la sesión al cargar la app. El token guardado puede estar
   * caducado o pertenecer a un usuario ya borrado, asi que se valida contra
   * /auth/me en vez de darlo por bueno.
   */
  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    api
      .get<User>('/auth/me')
      .then(({ data }) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        tokenStorage.clear();
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<AuthResult>('/auth/login', { email, password });
    tokenStorage.set(data.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data } = await api.post<AuthResult>('/auth/register', { name, email, password });
    // La API ya devuelve un token: quien se registra entra sin volver a escribir
    // sus credenciales.
    tokenStorage.set(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    // Sin esto, la siguiente sesión vería por un instante los tickets del
    // usuario anterior servidos desde la cache.
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
