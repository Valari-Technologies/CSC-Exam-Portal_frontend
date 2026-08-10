import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Bell,
  User,
  LogOut,
  ChevronDown,
  ArrowRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  School as SchoolIcon,
  HelpCircle,
  Sparkles,
  CheckCheck,
  BellOff,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentSchool } from '@/hooks/useCurrentSchool';
import { notificationsService } from '@/services/notifications.service';
import { StudentNotificationBell } from '@/components/layout/StudentNotificationBell';
import type { Notification } from '@/types';
import studentHeaderImg from '@/assets/dashboard_designs/Student/dashboard_header.webp';
import defaultSchoolLogo from '@/assets/csc_school_logo.webp';
import studentBg from '@/assets/dashboard_designs/background/student_bg.jpeg';
import card01Img from '@/assets/dashboard_designs/Student/card_01.webp';
import card02Img from '@/assets/dashboard_designs/Student/card_02.webp';
import card03Img from '@/assets/dashboard_designs/Student/card_03.webp';
import card04Img from '@/assets/dashboard_designs/Student/card_04.webp';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  badge?: string;
  active?: boolean;
}

const COLLAPSE_KEY = 'sidebar-collapsed';

export default function StudentDashboardPage() {
  const { user, logout } = useAuth();
  const { data: school } = useCurrentSchool();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

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

  const queryClient = useQueryClient();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsService.unreadCount(),
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', { page: 1 }],
    queryFn: () => notificationsService.list({ page: 1 }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const unreadCount = unreadData?.count ?? 0;

  const navItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/student/dashboard', active: true },
    { label: 'My Exams', icon: ClipboardList, to: '/student/exams' },
    { label: 'My Results', icon: BarChart3, to: '/student/results' },
    {
      label: 'Notifications',
      icon: Bell,
      to: '/student/notifications',
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : undefined,
    },
  ];

  const actionCards = [
    {
      id: 'my-exams',
      title: 'My Exams',
      subtext: 'View and take assigned exams.',
      icon: ClipboardList,
      iconWrapperClass: 'bg-[#f3e8ff] text-[#9333ea]',
      hoverButtonClass: 'group-hover:bg-[#9333ea] group-hover:text-white',
      to: '/student/exams',
      bgImage: card01Img,
    },
    {
      id: 'my-results',
      title: 'My Results',
      subtext: 'View your past exam results and scores.',
      icon: BarChart3,
      iconWrapperClass: 'bg-[#dcfce7] text-[#16a34a]',
      hoverButtonClass: 'group-hover:bg-[#16a34a] group-hover:text-white',
      to: '/student/results',
      bgImage: card02Img,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtext: 'Test assignments, results, and alerts.',
      icon: Bell,
      iconWrapperClass: 'bg-[#ffedd5] text-[#ea580c]',
      hoverButtonClass: 'group-hover:bg-[#ea580c] group-hover:text-white',
      to: '/student/notifications',
      bgImage: card03Img,
    },
    {
      id: 'my-profile',
      title: 'My Profile',
      subtext: 'View and update your profile information.',
      icon: User,
      iconWrapperClass: 'bg-[#dbeafe] text-[#2563eb]',
      hoverButtonClass: 'group-hover:bg-[#2563eb] group-hover:text-white',
      to: '/student/profile',
      bgImage: card04Img,
    },
  ];

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

      {/* Navigation Links */}
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

      {/* User Profile Card (Sidebar Bottom) */}
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

          {/* Quick Profile Dropdown Menu */}
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
          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-xl bg-white shadow-sm border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Top Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* User Guide "?" Help Button */}
            <button
              type="button"
              onClick={() => setGuideModalOpen(true)}
              className="relative p-2.5 rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-[#8b5cf6] hover:border-purple-200 hover:shadow transition-all flex items-center justify-center group"
              title="User Guide & Help"
            >
              <HelpCircle className="h-5 w-5 text-slate-600 group-hover:text-[#8b5cf6] transition-colors" />
            </button>

            {/* Notifications Bell */}
            <StudentNotificationBell />
          </div>
        </header>

        {/* Page Main Content Container */}
        <main className="flex-1 px-6 md:px-10 pb-10 max-w-7xl w-full mx-auto">
          {/* Welcome Hero Banner - Using High-Res dashboard_header.webp with Ambient Glow & Shadow */}
          <div className="relative mb-8 group">
            {/* Ambient Purple/Indigo Soft Glow Backdrop */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/25 via-indigo-500/20 to-blue-600/20 rounded-[28px] blur-xl opacity-75 group-hover:opacity-95 transition-opacity duration-500" />

            {/* Main Banner Container */}
            <div className="w-full max-w-[1920px] mx-auto rounded-[24px] border border-purple-200/60 relative overflow-hidden shadow-xl shadow-purple-950/10 h-[160px] sm:h-[200px] md:h-[230px] lg:h-[250px] flex items-center bg-[#f5f3ff] transition-all duration-300">
              {/* High Resolution Background Image (dashboard_header.webp) */}
              <img
                src={studentHeaderImg}
                alt="Student Dashboard Header"
                className="absolute inset-0 w-full h-full object-cover object-right select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
              />

              {/* Dynamic Left Text Overlay */}
              <div className="relative z-10 w-full sm:w-[48%] md:w-[42%] lg:w-[38%] max-w-md pl-4 sm:pl-6 md:pl-8 lg:pl-10 pr-2 py-4 flex flex-col justify-center min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-[#0f172a] tracking-tight leading-tight drop-shadow-sm">
                  Welcome back, {studentName}! 👋
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm md:text-base lg:text-lg mt-1.5 sm:mt-2 font-medium leading-relaxed">
                  Here&apos;s what&apos;s happening with your exams today.
                </p>
              </div>
            </div>
          </div>

          {/* Action Cards Grid (2x2 Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {actionCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.id}
                  to={card.to}
                  className={`rounded-2xl p-6 shadow-sm border border-slate-100/90 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer relative overflow-hidden ${
                    card.bgImage ? 'bg-[#fbfbfe]' : 'bg-white'
                  }`}
                >
                  {card.bgImage && (
                    <>
                      <img
                        src={card.bgImage}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0 transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-transparent z-0" />
                    </>
                  )}

                  <div className="flex items-start justify-between relative z-10">
                    <div className={`p-3.5 rounded-2xl ${card.iconWrapperClass} shadow-xs`}>
                      <Icon className="h-6 w-6" />
                    </div>

                    <div
                      className={`w-9 h-9 rounded-full bg-slate-100/80 text-slate-500 flex items-center justify-center transition-colors duration-200 ${card.hoverButtonClass}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-5 relative z-10">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#1d4ed8] transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 leading-snug">{card.subtext}</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Recent Notifications Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100/90">
            <div className="flex items-center justify-between mb-6 pb-2">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <Bell className="h-5 w-5 text-[#8b5cf6]" />
                Recent Notifications
              </h2>
              <Link
                to="/student/notifications"
                className="text-[#8b5cf6] hover:text-[#7c3aed] text-sm font-semibold flex items-center gap-1 group transition-colors"
              >
                View all
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {!notificationsData || notificationsData.results.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2">
                  <BellOff className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No Recent Notifications</p>
                <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notificationsData.results.slice(0, 3).map((notification: Notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start justify-between gap-4 p-4 rounded-xl transition-all border ${
                      !notification.is_read
                        ? 'bg-purple-50/40 border-purple-100'
                        : 'bg-white border-slate-100 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${
                          !notification.is_read ? 'bg-purple-600' : 'bg-slate-300'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-sm text-slate-900 ${!notification.is_read ? 'font-bold' : 'font-semibold'}`}>
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                          {(() => {
                            try {
                              return formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });
                            } catch {
                              return notification.created_at;
                            }
                          })()}
                        </p>
                      </div>
                    </div>

                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() => markReadMutation.mutate(notification.id)}
                        disabled={markReadMutation.isPending}
                        title="Mark as read"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors shrink-0"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* User Guide Modal Popup */}
      {guideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setGuideModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 z-10 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
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

            {/* Modal Body / Guide Sections */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-slate-700">
              {/* Quick Process Steps Banner */}
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

              {/* Feature Cards Grid */}
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

            {/* Modal Footer */}
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
