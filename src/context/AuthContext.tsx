import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { authService } from '@/services/auth.service';
import { ACCESS_TOKEN_KEY } from '@/services/api';
import type {
  LoginRequest,
  RegisterRequest,
  StudentLoginRequest,
  User,
  UserRole,
} from '@/types';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!sessionStorage.getItem(ACCESS_TOKEN_KEY)) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const me = await authService.getCurrentUser();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Guard the browser back-forward cache (bfcache). After a full-page logout (e.g. the API
  // layer hard-redirects to /login on a failed token refresh), pressing Back can restore the
  // previous PROTECTED document straight from bfcache without re-running any auth check. If a
  // page is restored from bfcache and there is no access token, force a reload so the app
  // re-initialises and ProtectedRoute sends the user to /login. Tokens live in sessionStorage,
  // which the browser already clears on a true close — this only closes the Back-button gap.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !sessionStorage.getItem(ACCESS_TOKEN_KEY)) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);


  const login = useCallback(async (payload: LoginRequest) => {
    const { user: loggedIn } = await authService.login(payload);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const studentLogin = useCallback(async (payload: StudentLoginRequest) => {
    const { user: loggedIn } = await authService.studentLogin(payload);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback(async (payload: RegisterRequest) => {
    const { user: created } = await authService.register(payload);
    setUser(created);
    return created;
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const { user: loggedIn } = await authService.googleLogin(idToken);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  // Inactivity auto-logout after 20 minutes of no user interaction
  useEffect(() => {
    if (!user) return;

    let timeoutId: number;

    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        logout();
      }, 20 * 60 * 1000); // 20 minutes
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, logout]);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const hasRole = useCallback(
    (role: UserRole | UserRole[]) => {
      if (!user) return false;
      return Array.isArray(role) ? role.includes(user.role) : user.role === role;
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      studentLogin,
      register,
      loginWithGoogle,
      logout,
      refreshUser,
      hasRole,
    }),
    [user, isLoading, login, studentLogin, register, loginWithGoogle, logout, refreshUser, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
