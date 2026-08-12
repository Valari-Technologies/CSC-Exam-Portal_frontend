import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  School as SchoolIcon,
  HelpCircle,
  Sparkles,
  CheckCheck,
  AlertTriangle,
  Clock,
  Trash2,
  LifeBuoy,
  ChevronLeft,
  ChevronRight,
  BellOff,
  ArrowLeft,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '@/hooks/useAuth';
import { useCurrentSchool } from '@/hooks/useCurrentSchool';
import defaultSchoolLogo from '@/assets/csc_school_logo.webp';
import { Spinner } from '@/components/ui/Spinner';
import { notificationsService } from '@/services/notifications.service';
import { StudentNotificationBell } from '@/components/layout/StudentNotificationBell';
import type { Notification, NotificationType } from '@/types';
import { cn } from '@/lib/utils';
import notificationHeaderImg from '@/assets/dashboard_designs/Notification/notification_header.webp';
import studentBg from '@/assets/dashboard_designs/background/student_bg.jpeg';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  badge?: string;
  active?: boolean;
}

const COLLAPSE_KEY = 'sidebar-collapsed';

interface TypeConfig {
  icon: React.ElementType;
  label: string;
  iconClass: string;
  badgeClass: string;
}

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  test_assigned: {
    icon: ClipboardList,
    label: 'Test Assigned',
    iconClass: 'text-purple-600',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  exam_completed: {
    icon: CheckCheck,
    label: 'Exam Completed',
    iconClass: 'text-emerald-600',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  result_published: {
    icon: CheckCheck,
    label: 'Result Published',
    iconClass: 'text-emerald-600',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  system_alert: {
    icon: AlertTriangle,
    label: 'System Alert',
    iconClass: 'text-red-600',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
  },
  reminder: {
    icon: Clock,
    label: 'Reminder',
    iconClass: 'text-amber-600',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  support_request: {
    icon: LifeBuoy,
    label: 'Support Request',
    iconClass: 'text-blue-600',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
};

export default function NotificationsPage() {
  const { user, logout } = useAuth();
  const { data: school } = useCurrentSchool();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  );

  const toggleCollapsed = () => {
    setUserDropdownOpen(false);
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  };

  const isStudent = user?.role === 'student';
  const studentName = user?.full_name || 'Muthu Subash K';
  const studentPhoto =
    user?.profile_photo_url ||
    user?.profile_picture ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
  const schoolName = school?.name || 'Karapettai nadar hr.sec.school';
  const schoolLogo = school?.logo_url || defaultSchoolLogo;

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Fallback redirect
    }
    navigate('/studentlogin');
  };

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsService.unreadCount(),
  });
  const unreadCount = unreadData?.count ?? 0;

  const navItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/student/dashboard' },
    { label: 'My Exams', icon: ClipboardList, to: '/student/exams' },
    { label: 'My Results', icon: BarChart3, to: '/student/results' },
    {
      label: 'Notifications',
      icon: Bell,
      to: '/student/notifications',
      active: true,
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : undefined,
    },
  ];

  /* ---- queries ---- */
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications', { page }],
    queryFn: () => notificationsService.list({ page }),
  });

  /* ---- mutations ---- */
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsService.markRead(id),
    onSuccess: invalidateAll,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationsService.deleteNotification(id),
    onSuccess: invalidateAll,
  });

  /* ---- derived ---- */
  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;

  const formatTime = (iso: string): string => {
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch {
      return iso;
    }
  };

  const renderSidebarContent = (isCollapsed: boolean, isMobile: boolean = false) => (
    <div className="flex flex-col h-full bg-[#0b1739] text-white select-none">
      {/* Sidebar Header */}
      {isCollapsed ? (
        <div className="flex items-center justify-center h-16 w-full border-b border-blue-900/40 relative">
          {!isMobile && (
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
          {!isMobile && (
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

          <div className="flex items-center gap-3 z-10 w-full pl-1.5">
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={schoolName}
                className="h-9 w-9 flex-shrink-0 rounded-lg object-contain bg-white p-0.5 shadow-sm"
              />
            ) : (
              <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
                <SchoolIcon className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-sm text-white truncate" title={schoolName}>
                {schoolName}
              </h2>
              <p className="text-xs text-slate-400 font-medium">Student</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto custom-scrollbar py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => isMobile && setMobileMenuOpen(false)}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3.5 text-sm font-semibold transition-all duration-300 ease-out cursor-pointer group/item ${
                isCollapsed ? 'justify-center p-3 rounded-xl' : 'py-3 px-4 rounded-2xl'
              } ${
                item.active
                  ? 'bg-[#2563eb] text-white font-extrabold shadow-md shadow-blue-500/25'
                  : 'text-blue-100/80 hover:text-white hover:bg-white/10 hover:translate-x-1'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0 group-hover/item:scale-110 transition-transform duration-300" />
              {!isCollapsed && <span className="flex-1 truncate font-semibold">{item.label}</span>}
              {item.badge && (
                <span
                  className={`bg-[#8b5cf6] text-white text-xs font-bold rounded-full min-w-[20px] text-center shadow-sm ${
                    isCollapsed ? 'px-1.5 py-0.2 text-[10px]' : 'px-2 py-0.5'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`mt-auto mb-4 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        <div className="relative">
          <div
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className={`bg-[#142247] border border-white/10 rounded-2xl flex items-center transition-all cursor-pointer hover:bg-white/15 ${
              isCollapsed ? 'p-2 justify-center' : 'p-3 justify-between gap-3'
            }`}
            title={isCollapsed ? studentName : undefined}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 p-0.5 shadow">
                  <img
                    src={studentPhoto}
                    alt={studentName}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-white truncate">{studentName}</h2>
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">STUDENT</p>
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
                to="/student/profile"
                onClick={() => setUserDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 rounded-lg transition-colors"
              >
                <User className="h-4 w-4 text-slate-400" />
                View Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4 text-red-400" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const mainContentMarkup = (
    <div className="space-y-6">
      {isStudent && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-xs font-bold text-slate-600 hover:text-purple-600 hover:border-purple-200 transition-all w-fit cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      )}

      {/* Top Header Card with notification_header.webp background */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#fbfbfe]">
        <img
          src={notificationHeaderImg}
          alt="Notifications Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]"></div>
        
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3 flex-wrap leading-tight drop-shadow-sm">
              <Bell className="h-7 w-7 text-indigo-600 animate-pulse" />
              Notifications
            </h1>
            <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-semibold drop-shadow-sm max-w-xl">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All caught up! No unread alerts.'}
            </p>
          </div>
        </div>
      </div>

      {unreadCount > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="bg-[#1d4ed8] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        </div>
      )}

      {/* Main List Area */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex items-center justify-center">
          <Spinner label="Loading notifications..." />
        </div>
      ) : isError ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <p className="text-red-500 font-semibold text-sm">Failed to load notifications.</p>
          <p className="text-slate-400 text-xs mt-1">Please try again later.</p>
        </div>
      ) : data && data.results.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
            <BellOff className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Notifications Yet</h3>
          <p className="text-slate-500 text-xs mt-1">When you receive test assignments, results, or announcements, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.results.map((notification: Notification) => {
            const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.system_alert;
            const Icon = config.icon;

            return (
              <div
                key={notification.id}
                className={cn(
                  'bg-white rounded-2xl p-5 shadow-sm border border-slate-100/90 transition-all flex items-start gap-4 hover:shadow-md',
                  !notification.is_read && 'border-l-4 border-l-purple-600 bg-purple-50/20',
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border',
                    notification.is_read
                      ? 'bg-slate-100 border-slate-200/80 text-slate-500'
                      : 'bg-purple-100/80 border-purple-200 text-purple-600 shadow-xs',
                  )}
                >
                  <Icon className={cn('h-5 w-5', config.iconClass)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={cn('text-sm text-slate-900', !notification.is_read ? 'font-bold' : 'font-semibold')}>
                      {notification.title}
                    </span>
                    <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-bold border', config.badgeClass)}>
                      {config.label}
                    </span>
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-purple-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {notification.message}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-2 block font-medium">
                    {formatTime(notification.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!notification.is_read && (
                    <button
                      type="button"
                      onClick={() => markReadMutation.mutate(notification.id)}
                      disabled={markReadMutation.isPending}
                      title="Mark as read"
                      className="p-2 rounded-xl text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(notification.id)}
                    disabled={deleteMutation.isPending}
                    title="Delete notification"
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.count > 20 && (
        <div className="px-6 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            Page {page} of {totalPages} &bull; {data.count} Total Notifications
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!data.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={!data.next}
              onClick={() => setPage((p) => p + 1)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // If user is a student, render with Student Dashboard sidebar & top header controls
  if (isStudent) {
    return (
      <div className="min-h-screen bg-transparent flex text-slate-800 relative overflow-hidden">
        <img
          src={studentBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0"
        />
        {/* Desktop Sidebar */}
        <aside
          className={`hidden md:block flex-shrink-0 min-h-screen fixed left-0 top-0 bottom-0 z-30 transition-[width] duration-300 ease-in-out ${
            collapsed ? 'w-16' : 'w-64'
          }`}
        >
          {renderSidebarContent(collapsed, false)}
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-64 max-w-xs bg-[#0b1739] h-full shadow-2xl flex flex-col z-10">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
              >
                <X className="h-6 w-6" />
              </button>
              {renderSidebarContent(false, true)}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out relative z-10 ${
            collapsed ? 'md:pl-16' : 'md:pl-64'
          }`}
        >
          {/* Main Header Bar */}
          <header className="px-6 md:px-10 py-5 flex items-center justify-between md:justify-end bg-transparent">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-white shadow-sm border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGuideModalOpen(true)}
                className="relative p-2.5 rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-[#8b5cf6] hover:border-purple-200 hover:shadow transition-all flex items-center justify-center group"
                title="User Guide & Help"
              >
                <HelpCircle className="h-5 w-5 text-slate-600 group-hover:text-[#8b5cf6] transition-colors" />
              </button>

              <StudentNotificationBell />
            </div>
          </header>

          {/* Page Main Content Container */}
          <main className="flex-1 px-6 md:px-10 pb-10 max-w-7xl w-full mx-auto space-y-8">
            {mainContentMarkup}
          </main>
        </div>

        {/* User Guide Modal Popup */}
        {guideModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setGuideModalOpen(false)}
            />
            <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 z-10 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-5 bg-gradient-to-r from-[#0b1739] via-[#101b3b] to-[#1e1b4b] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-400/30 text-purple-300">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      Student User Guide 👋
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5 font-normal">
                      Learn how to navigate your exams, results, and features
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGuideModalOpen(false)}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-slate-700">
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-100 rounded-2xl p-5">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Quick Exam Process (How It Works)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white/90 p-3 rounded-xl border border-purple-100/60 flex flex-col items-center text-center">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs mb-2">1</span>
                      <span className="font-bold text-slate-900">Check Exams</span>
                      <span className="text-slate-500 mt-1">Go to &quot;My Exams&quot; for assigned tests.</span>
                    </div>
                    <div className="bg-white/90 p-3 rounded-xl border border-purple-100/60 flex flex-col items-center text-center">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs mb-2">2</span>
                      <span className="font-bold text-slate-900">Start Test</span>
                      <span className="text-slate-500 mt-1">Read rules and click &quot;Start Exam&quot;.</span>
                    </div>
                    <div className="bg-white/90 p-3 rounded-xl border border-purple-100/60 flex flex-col items-center text-center">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs mb-2">3</span>
                      <span className="font-bold text-slate-900">Submit Answers</span>
                      <span className="text-slate-500 mt-1">Complete MCQs before timer ends.</span>
                    </div>
                    <div className="bg-white/90 p-3 rounded-xl border border-purple-100/60 flex flex-col items-center text-center">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs mb-2">4</span>
                      <span className="font-bold text-slate-900">View Results</span>
                      <span className="text-slate-500 mt-1">Check scores under &quot;My Results&quot;.</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">My Exams Page</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      View all active, upcoming, and completed online exams assigned by your school. You can check start times, duration, and launch exams directly.
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">My Results Page</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Track your exam performance, view subject-wise mark breakdowns, check pass/fail status, and download official performance certificates.
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                        <Bell className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">Notifications & Alerts</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Receive real-time alerts whenever a teacher assigns a new exam, publishes test results, or posts important school announcements.
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                        <User className="h-5 w-5" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">Student Profile & Settings</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Click your profile card at the bottom of the sidebar to view your student profile details, change password, or sign out safely from the portal.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setGuideModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#1d4ed8] text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Got it! Close Guide
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Non-student users (Admin / Teacher) render standard layout inside MainLayout
  return mainContentMarkup;
}

