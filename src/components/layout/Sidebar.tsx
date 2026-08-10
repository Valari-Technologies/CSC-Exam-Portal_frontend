import { useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  School,
  GraduationCap,
  Users,
  BookOpen,
  FileQuestion,
  ClipboardList,
  ClipboardCheck,
  Award,
  BarChart3,
  Shield,
  Bell,
  UserCircle,
  LifeBuoy,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentSchool } from '@/hooks/useCurrentSchool';
import { notificationsService } from '@/services/notifications.service';
import { UserAvatar } from '@/components/ui/UserAvatar';
import defaultSchoolLogo from '@/assets/csc_school_logo.webp';
import superAdminLogo from '@/assets/dashboard_designs/Super admin/super_admin_logo.webp';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['csc_admin', 'school_admin', 'teacher', 'student'] },
  { to: '/admin/schools', label: 'Schools', icon: School, roles: ['csc_admin'] },
  { to: '/school/academics', label: 'Academics', icon: BookOpen, roles: ['csc_admin', 'school_admin', 'teacher'] },
  { to: '/school/teachers', label: 'Teachers', icon: GraduationCap, roles: ['csc_admin', 'school_admin'] },
  { to: '/school/students', label: 'Students', icon: Users, roles: ['csc_admin', 'school_admin', 'teacher'] },
  { to: '/questions', label: 'Question Bank', icon: FileQuestion, roles: ['csc_admin', 'school_admin', 'teacher'] },
  { to: '/tests', label: 'Tests', icon: ClipboardList, roles: ['csc_admin', 'school_admin', 'teacher'] },
  { to: '/teacher/completed-exams', label: 'Completed Exams', icon: ClipboardCheck, roles: ['teacher'] },
  { to: '/teacher/published-results', label: 'Published Results', icon: Award, roles: ['teacher'] },
  { to: '/student/exams', label: 'My Exams', icon: ClipboardList, roles: ['student'] },
  { to: '/student/results', label: 'My Results', icon: BarChart3, roles: ['student'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['csc_admin', 'school_admin', 'teacher'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['csc_admin', 'school_admin', 'teacher'] },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: Shield, roles: ['csc_admin', 'school_admin'] },
  { to: '/admin/support-requests', label: 'Support Requests', icon: LifeBuoy, roles: ['csc_admin'] },
  // Additional Details sits directly above Profile for School Admins (item 6).
  { to: '/school/additional-details', label: 'Additional Details', icon: LifeBuoy, roles: ['school_admin'] },
];

const COLLAPSE_KEY = 'sidebar-collapsed';

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

interface SidebarProps {
  /** When true, the off-canvas mobile drawer is shown (below the md breakpoint). */
  mobileOpen?: boolean;
  /** Closes the mobile drawer — also fired when a nav link is tapped. */
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: school } = useCurrentSchool();
  const location = useLocation();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  );

  const normalizedPath = location.pathname.endsWith('/') && location.pathname.length > 1
    ? location.pathname.slice(0, -1)
    : location.pathname;
  const isSecondPage = !ROOT_PATHS.includes(normalizedPath);

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsService.unreadCount(),
    enabled: !!user,
    refetchInterval: 30 * 1000,
  });
  const unreadCount = unreadData?.count ?? 0;

  if (!user) return null;

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  };

  const isCscAdmin = user.role === 'csc_admin';
  const isTeacher = user.role === 'teacher';
  const isSchoolAdmin = user.role === 'school_admin';
  const isStudent = user.role === 'student';
  const isDarkTheme = isCscAdmin || isTeacher || isSchoolAdmin || isStudent;
  const hasTabbedActiveStyle = isCscAdmin;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const title = school?.name ?? 'CSC Exam Portal';
  const logoSrc = school?.logo_url || defaultSchoolLogo;

  // `isCollapsed` drives icon-only mode; `withToggle` shows the collapse control (desktop
  // only). The mobile drawer passes isCollapsed=false so labels always show there.
  const renderContent = (isCollapsed: boolean, withToggle: boolean) => {
    if (isDarkTheme) {
      return (
        <>
          {/* Dark Sidebar Header */}
          {isCollapsed ? (
            <div className="flex items-center justify-center h-16 w-full border-b border-blue-900/40 relative">
              {withToggle && (
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-blue-200/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
              )}
            </div>
          ) : (
            <div className="relative flex flex-col items-start pt-5 pb-4 border-b border-blue-900/40 w-full px-4">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-28 bg-blue-500/25 rounded-full blur-2xl pointer-events-none" />

              {/* Toggle Collapse Button Top Right */}
              {withToggle && (
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg text-blue-200/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer z-20"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}

              {isCscAdmin ? (
                <div className="flex items-center gap-3 z-10 w-full pl-1">
                  <div className="h-10 w-10 rounded-xl p-0.5 bg-white/10 backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center flex-shrink-0 group hover:scale-105 transition-transform duration-300">
                    <img
                      src={superAdminLogo}
                      alt="CSC Super Admin Logo"
                      className="h-full w-full object-contain filter drop-shadow-md rounded-lg"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-sm text-white truncate" title="CSC Exam Portal">CSC Exam Portal</h2>
                    <p className="text-xs text-slate-400 font-medium">Super Admin</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 z-10 w-full pl-1.5">
                  {logoSrc ? (
                    <img
                      src={logoSrc}
                      alt="School Logo"
                      className="h-9 w-9 flex-shrink-0 rounded-lg object-contain bg-white p-0.5 shadow-sm"
                    />
                  ) : (
                    <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
                      <School className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-sm text-white whitespace-normal break-words leading-tight" title={title}>
                      {title}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      {isSchoolAdmin ? 'School Admin' : isStudent ? 'Student' : 'Teacher'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dark Sidebar Navigation Items */}
          <nav className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-1.5 custom-scrollbar",
            hasTabbedActiveStyle ? "pl-3 pr-0" : "px-3",
            isSecondPage && "pointer-events-none opacity-50"
          )}>
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onMobileClose}
                title={isCollapsed ? label : undefined}
                className={({ isActive }) => {
                  const active = isActive || (to === '/dashboard' && [
                    '/dashboard',
                    '/admin/dashboard',
                    '/school/dashboard',
                    '/teacher/dashboard',
                    '/student/dashboard'
                  ].includes(location.pathname));

                  if (hasTabbedActiveStyle) {
                    return cn(
                      'relative flex items-center gap-3.5 text-sm font-semibold transition-all duration-300 ease-out cursor-pointer group/item',
                      isCollapsed ? 'justify-center px-2 py-3 rounded-xl mx-2' : 'py-3 pl-4 pr-5',
                      active
                        ? 'bg-white text-[#0a0d4a] font-extrabold shadow-md rounded-l-2xl rounded-r-none md:-mr-0.5'
                        : 'text-blue-100/80 hover:text-white hover:bg-white/10 rounded-xl mr-3 hover:translate-x-1',
                    );
                  }
                  // Teacher Active / Inactive styles
                  return cn(
                    'relative flex items-center gap-3.5 text-sm font-semibold transition-all duration-300 ease-out cursor-pointer group/item',
                    isCollapsed ? 'justify-center p-3 rounded-xl' : 'py-3 px-4 rounded-2xl',
                    active
                      ? 'bg-[#2563eb] text-white font-extrabold shadow-md shadow-blue-500/25'
                      : 'text-blue-100/80 hover:text-white hover:bg-white/10 hover:translate-x-1',
                  );
                }}
              >
                <Icon className="h-5 w-5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-300" />
                {!isCollapsed && <span className="truncate">{label}</span>}
                {label === 'Notifications' && unreadCount > 0 && (
                  <span
                    className={cn(
                      "bg-[#8b5cf6] text-white text-xs font-bold rounded-full min-w-[20px] text-center shadow-sm flex items-center justify-center",
                      isCollapsed ? "absolute top-1 right-1 h-4 px-1 text-[9px]" : "h-5 px-1.5 ml-auto"
                    )}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          {user !== null ? (
            <div className={cn("mt-auto mb-4 relative z-50", isCollapsed ? "px-2" : "px-4", isSecondPage && "pointer-events-none opacity-50")}>
              <div
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={cn(
                  "bg-[#06082e]/90 border border-blue-500/25 rounded-2xl flex items-center transition-all cursor-pointer hover:bg-white/10 select-none",
                  isCollapsed ? 'p-2 justify-center' : 'p-3 justify-between gap-3'
                )}
                title={isCollapsed ? user.full_name : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 p-0.5 shadow-md flex items-center justify-center text-white">
                      {user.profile_photo_url ? (
                        <img
                          src={user.profile_photo_url}
                          alt={user.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <UserCircle className="h-5.5 w-5.5 text-slate-300" />
                      )}
                    </div>
                  </div>
                  {!isCollapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{user.full_name || 'User'}</p>
                      <p className="text-[10px] font-black text-blue-300/90 uppercase tracking-wider truncate">
                        {user.role === 'csc_admin' 
                          ? 'SUPER ADMIN' 
                          : user.role === 'school_admin' 
                          ? 'SCHOOL ADMIN' 
                          : user.role === 'student' 
                          ? 'STUDENT' 
                          : 'TEACHER'}
                      </p>
                    </div>
                  )}
                </div>
                {!isCollapsed && <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
              </div>

              {userDropdownOpen && (
                <div
                  className={`absolute z-50 bg-[#101b3b] border border-white/15 rounded-xl shadow-xl p-1.5 ${
                    isCollapsed
                      ? 'left-full bottom-0 ml-3 w-44'
                      : 'left-0 right-0 bottom-full mb-2'
                  }`}
                >
                  <Link
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <UserCircle className="h-4 w-4 text-slate-400" />
                    View Profile
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await logout();
                        navigate('/login');
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4 text-red-400" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </>
      );
    }

    return (
      <>
        {/* Sidebar Header */}
        {isCollapsed ? (
          <div className="flex items-center justify-center h-16 w-full border-b border-slate-100 relative bg-white">
            {withToggle && (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="border-b border-slate-100 flex items-center justify-between gap-3 bg-white px-4 py-3.5 w-full">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 flex-shrink-0 rounded-xl p-1 bg-white border border-slate-200/80 shadow-xs flex items-center justify-center">
                <img
                  src={logoSrc}
                  alt="CSC Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-extrabold text-sm truncate text-slate-900 leading-snug" title={title}>
                  {title}
                </h2>
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-wide">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
            </div>
            {withToggle && (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 bg-white">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onMobileClose}
              title={isCollapsed ? label : undefined}
              className={({ isActive }) => {
                const active = isActive || (to === '/dashboard' && [
                  '/dashboard',
                  '/admin/dashboard',
                  '/school/dashboard',
                  '/teacher/dashboard',
                  '/student/dashboard'
                ].includes(location.pathname));

                return cn(
                  'flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-300 ease-out group/item',
                  isCollapsed && 'justify-center px-2.5 py-2.5',
                  active
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1',
                );
              }}
            >
              <Icon className="h-5 w-5 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-300" />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom User Profile Section */}
        {!isCollapsed && (
          <div className="p-3.5 mt-auto border-t border-slate-100 bg-white">
            <div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-2.5 flex items-center justify-between gap-2.5 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar
                  photoUrl={user.profile_photo_url}
                  name={user.full_name}
                  className="h-9 w-9 flex-shrink-0 border border-slate-200 shadow-2xs"
                  iconClassName="h-4 w-4"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{user.full_name || 'Teacher'}</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider truncate">
                    {user.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <Link
                to="/profile"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="View Profile"
              >
                <UserCircle className="h-4.5 w-4.5" />
              </Link>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'flex-shrink-0 hidden md:flex md:flex-col transition-[width] duration-300 ease-in-out shadow-2xl relative z-30',
          isDarkTheme
            ? 'bg-[#090c42] border-r border-[#141961] text-white'
            : 'bg-card border-r text-card-foreground',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {renderContent(collapsed, true)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside
            className={cn(
              'absolute left-0 top-0 h-full w-64 flex flex-col shadow-2xl',
              isDarkTheme
                ? 'bg-[#090c42] border-r border-[#141961] text-white'
                : 'bg-card border-r text-card-foreground',
            )}
          >
            {renderContent(false, false)}
          </aside>
        </div>
      )}
    </>
  );
}

