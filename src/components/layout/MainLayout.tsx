import { Suspense, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import defaultBg from '@/assets/dashboard_designs/background/background.jpeg';
import superadminBg from '@/assets/dashboard_designs/background/superadmin_bg.jpeg';
import teacherBg from '@/assets/dashboard_designs/background/teacher_bg.jpeg';
import studentBg from '@/assets/dashboard_designs/background/student_bg.jpeg';

const ROOT_PATHS = [
  '/',
  '/dashboard',
  '/admin/dashboard',
  '/school/dashboard',
  '/teacher/dashboard',
  '/student/dashboard',
  '/admin/schools',
  '/school/academics',
  '/school/teachers',
  '/school/students',
  '/questions',
  '/tests',
  '/reports',
  '/profile',
  '/notifications',
  '/admin/audit-logs',
  '/admin/support-requests',
  '/school/additional-details',
  '/student/exams',
  '/student/results',
  '/student/notifications',
  '/student/profile',
  '/teacher/completed-exams',
  '/teacher/published-results',
];

export function MainLayout() {
  // On desktop the sidebar is always visible; on small screens it collapses into an
  // off-canvas drawer toggled from the header, so navigation stays reachable everywhere.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  const normalizedPath = location.pathname.endsWith('/') && location.pathname.length > 1
    ? location.pathname.slice(0, -1)
    : location.pathname;
  const showBack = !ROOT_PATHS.includes(normalizedPath);

  const getLayoutBg = () => {
    if (!user) return defaultBg;
    switch (user.role) {
      case 'csc_admin':
        return superadminBg;
      case 'teacher':
        return teacherBg;
      case 'student':
        return studentBg;
      default:
        return defaultBg;
    }
  };

  return (
    <div className={cn("min-h-screen flex overflow-hidden w-full", isTeacher ? "bg-[#f8fafc]" : "bg-background")}>
      {/* Sidebar starts from the very top (full height) */}
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      {/* Right side container holds Header and main scrollable content area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Overall background image */}
        <img
          src={getLayoutBg()}
          alt=""
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0"
        />
        
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-6 relative z-10 bg-transparent">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="mb-4 -ml-2 text-muted-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          {/* Page chunks are lazy-loaded. Suspending here — rather than at the app root —
              keeps the header and sidebar mounted while the next page's chunk loads, so
              navigation swaps only the content area instead of blanking the whole screen. */}
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
