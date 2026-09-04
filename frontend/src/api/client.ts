import axios, { AxiosError } from 'axios';
import type { ApiError } from './types';

const TOKEN_KEY = 'crazysupporthub.token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el token en cada petición.
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Un 401 significa que el token caducó o dejó de ser valido: se limpia la
 * sesion y se manda al login. Se hace aquí, en un solo sitio, y no en cada
 * pantalla.
 *
 * Se excluye el propio login para que unas credenciales incorrectas muestren
 * su mensaje en el formulario en vez de provocar una redirección.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const isLoginAttempt = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginAttempt) {
      tokenStorage.clear();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Traduce un error de axios al mensaje que se le muestra a la persona.
 * La API devuelve `message` como string o como lista (errores de validación).
 */
export function getErrorMessage(error: unknown, fallback = 'Ocurrio un error inesperado.'): string {
  if (axios.isAxiosError<ApiError>(error)) {
    if (!error.response) {
      return 'No se pudo conectar con el servidor. Comprueba que la API este corriendo.';
    }
    const message = error.response.data?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

/** Errores de validación por campo, para pintarlos debajo de cada input. */
export function getFieldErrors(error: unknown): string[] {
  if (axios.isAxiosError<ApiError>(error) && Array.isArray(error.response?.data?.message)) {
    return error.response.data.message;
  }
  return [];
}
