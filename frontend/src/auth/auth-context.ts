import { createContext } from 'react';
import type { User } from '../api/types';

export interface AuthContextValue {
  user: User | null;
  /** true mientras se rehidrata la sesión desde el token guardado. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
