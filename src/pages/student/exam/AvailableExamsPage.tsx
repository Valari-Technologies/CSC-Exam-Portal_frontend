import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  Calendar,
  PlayCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { notificationsService } from '@/services/notifications.service';
import { StudentNotificationBell } from '@/components/layout/StudentNotificationBell';
import { useCurrentSchool } from '@/hooks/useCurrentSchool';
import { examsService } from '@/services/exams.service';
import type { TestAssignmentListItem } from '@/types';
import defaultSchoolLogo from '@/assets/csc_school_logo.webp';
import { Spinner } from '@/components/ui/Spinner';
import studentBg from '@/assets/dashboard_designs/background/student_bg.jpeg';
import myExamHeaderImg from '@/assets/dashboard_designs/Student/my exam.webp';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  badge?: string;
  active?: boolean;
}

const COLLAPSE_KEY = 'sidebar-collapsed';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

interface AssignmentStatus {
  label: string;
  bgClass: string;
  textClass: string;
  canStart: boolean;
  hasEnded: boolean;
}

const UPCOMING: AssignmentStatus = {
  label: 'Upcoming',
  bgClass: 'bg-amber-100/80 border-amber-200',
  textClass: 'text-amber-800',
  canStart: false,
  hasEnded: false,
};

const EXPIRED: AssignmentStatus = {
  label: 'Expired',
  bgClass: 'bg-slate-100 border-slate-200',
  textClass: 'text-slate-600',
  canStart: false,
  hasEnded: true,
};

const OPEN: AssignmentStatus = {
  label: 'Start Exam',
  bgClass: 'bg-emerald-100/90 border-emerald-200',
  textClass: 'text-emerald-800',
  canStart: true,
  hasEnded: false,
};

function getAssignmentStatus(a: TestAssignmentListItem, now: Date): AssignmentStatus {
  if (a.availability === 'expired') return EXPIRED;

  const start = new Date(a.start_datetime);
  const end = new Date(a.end_datetime);

  if (now > end) return EXPIRED;
  if (a.availability === 'upcoming' && now < start) return UPCOMING;
  if (a.availability === 'open' || now >= start) return OPEN;
  return UPCOMING;
}

export default function AvailableExamsPage() {
  const { user, logout } = useAuth();
  const { data: school } = useCurrentSchool();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<TestAssignmentListItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsService.unreadCount(),
  });
  const unreadCount = unreadData?.count ?? 0;

  const navItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/student/dashboard' },
    { label: 'My Exams', icon: ClipboardList, to: '/student/exams', active: true },
    { label: 'My Results', icon: BarChart3, to: '/student/results' },
    {
      label: 'Notifications',
      icon: Bell,
      to: '/student/notifications',
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : undefined,
    },
  ];

  // Ticking clock for dynamic window updates
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['available-exams'],
    queryFn: () => examsService.listAssignments(),
  });

  const { data: activeSessions } = useQuery({
    queryKey: ['my-active-sessions'],
    queryFn: () => examsService.listSessions({ status: 'in_progress' }),
  });
  const activeByAssignment = new Map(
    (activeSessions?.results ?? []).map((s) => [s.assignment, s.id]),
  );

  const startMutation = useMutation({
    mutationFn: (assignmentId: number) => examsService.startExam(assignmentId),
    onSuccess: (session) => {
      setPendingAssignment(null);
      navigate(`/student/exam/${session.id}`);
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof Error ? error.message : 'Failed to start exam. Please try again.';
      const axiosErr = error as { response?: { data?: Record<string, unknown> } };
      if (axiosErr.response?.data) {
        const d = axiosErr.response.data;
        const detail = d.detail || d.assignment_id;
        if (typeof detail === 'string') {
          setErrorMsg(detail);
          return;
        }
        if (Array.isArray(detail)) {
          setErrorMsg((detail as string[]).join(' '));
          return;
        }
      }
      setErrorMsg(msg);
    },
  });

  const handleStartClick = (assignment: TestAssignmentListItem) => {
    setErrorMsg(null);
    setPendingAssignment(assignment);
  };

  const pendingCanStart = pendingAssignment
    ? getAssignmentStatus(pendingAssignment, now).canStart
    : null;

  const handleConfirmStart = () => {
    if (pendingAssignment && pendingCanStart) {
      startMutation.mutate(pendingAssignment.id);
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
        <main className="flex-1 px-6 md:px-10 pb-10 max-w-7xl w-full mx-auto space-y-6">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-xs font-bold text-slate-600 hover:text-purple-600 hover:border-purple-200 transition-all w-fit cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {/* Top Header Card */}
          <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#fbfbfe]">
            <img
              src={myExamHeaderImg}
              alt="My Exams Header"
              className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
            />
            {/* Overlay to ensure high contrast/readability for the text */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent z-0" />

            <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                  <ClipboardList className="h-7 w-7 text-[#9333ea]" />
                  My Exams
                </h1>
                <p className="text-slate-500 text-sm mt-1.5 leading-relaxed font-normal">
                  View your assigned online tests. Launch or resume your exam when the time window is active.
                </p>
              </div>
              {data && (
                <div className="px-4 py-2 bg-purple-50 border border-purple-100 rounded-xl text-purple-700 text-xs font-bold shrink-0">
                  Total Assigned: {data.results.length} Exams
                </div>
              )}
            </div>
          </div>

          {/* Exam Grid Section */}
          {isLoading ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex items-center justify-center">
              <Spinner label="Loading assigned exams..." />
            </div>
          ) : isError ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
              <p className="text-red-500 font-semibold text-sm">Failed to load assigned exams.</p>
              <p className="text-slate-400 text-xs mt-1">Please refresh the page or try again later.</p>
            </div>
          ) : data && data.results.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Exams Assigned</h3>
              <p className="text-slate-500 text-xs mt-1">There are currently no active or upcoming tests assigned to you.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data?.results.map((a) => {
                const status = getAssignmentStatus(a, now);
                const resumeSessionId = status.hasEnded
                  ? undefined
                  : activeByAssignment.get(a.id);
                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100/90 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="p-3 rounded-2xl bg-[#f3e8ff] text-[#9333ea] shadow-xs shrink-0">
                          <ClipboardList className="h-6 w-6" />
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${status.bgClass} ${status.textClass}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#1d4ed8] transition-colors leading-snug">
                        {a.test_title}
                      </h3>

                      <div className="mt-4 space-y-2 text-xs text-slate-500">
                        {a.class_name && (
                          <div className="flex items-center gap-2 font-medium text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                            Class: {a.class_name} {a.section_name ? `(${a.section_name})` : ''}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-500 pt-1">
                          <Calendar className="h-4 w-4 text-purple-500 shrink-0" />
                          <span>{formatDateTime(a.start_datetime)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>Ends: {formatDateTime(a.end_datetime)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      {resumeSessionId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/student/exam/${resumeSessionId}`)}
                          className="w-full bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Resume Exam
                        </button>
                      ) : status.canStart ? (
                        <button
                          type="button"
                          onClick={() => handleStartClick(a)}
                          className="w-full bg-[#9333ea] hover:bg-[#7e22ce] text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Start Exam
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full bg-slate-100 text-slate-400 font-semibold text-xs py-3 px-4 rounded-xl cursor-not-allowed text-center"
                        >
                          {status.label === 'Upcoming' ? 'Upcoming' : 'Expired'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={pendingAssignment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAssignment(null);
            setErrorMsg(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Start Exam?
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-2 leading-relaxed">
              You are about to start <strong className="text-slate-900 font-bold">{pendingAssignment?.test_title}</strong>. The exam will enter full-screen mode and your timer will begin immediately.
            </DialogDescription>
          </DialogHeader>

          {pendingCanStart === false && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 mt-2 font-medium">
              This exam window has closed. You can no longer start this test.
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 mt-2 font-medium">
              {errorMsg}
            </div>
          )}

          <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setPendingAssignment(null);
                setErrorMsg(null);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={startMutation.isPending || pendingCanStart === false}
              onClick={handleConfirmStart}
              className="px-5 py-2.5 rounded-xl bg-[#9333ea] hover:bg-[#7e22ce] text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {startMutation.isPending ? 'Starting...' : 'Start Now'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
