import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Role-based dashboard router. Redirects to the appropriate dashboard
 * for the user's role.
 */
export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  switch (user.role) {
    case 'csc_admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'school_admin':
      return <Navigate to="/school/dashboard" replace />;
    case 'teacher':
      return <Navigate to="/teacher/dashboard" replace />;
    case 'student':
      return <Navigate to="/student/dashboard" replace />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
}
