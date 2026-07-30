import { createContext } from 'react';
import type {
  LoginRequest,
  RegisterRequest,
  StudentLoginRequest,
  User,
  UserRole,
} from '@/types';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<User>;
  studentLogin: (payload: StudentLoginRequest) => Promise<User>;
  register: (payload: RegisterRequest) => Promise<User>;
  loginWithGoogle: (idToken: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

// Context lives in its own module (not AuthContext.tsx) so the provider file
// only exports a component — required for React Fast Refresh / the lint gate.
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
