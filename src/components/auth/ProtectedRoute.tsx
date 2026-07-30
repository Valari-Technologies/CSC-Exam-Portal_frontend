import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

const FORCE_PASSWORD_CHANGE_PATH = '/force-password-change';

export function ProtectedRoute({ allowedRoles, redirectTo = '/login' }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  // Accounts provisioned with a temporary password (e.g. a School Admin created by CSC
  // Admin) must replace it before doing anything else. This fires ONLY on the explicit
  // flag, so every existing user — where it defaults to false — is unaffected.
  if (user?.must_change_password && location.pathname !== FORCE_PASSWORD_CHANGE_PATH) {
    return <Navigate to={FORCE_PASSWORD_CHANGE_PATH} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
