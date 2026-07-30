import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  Download,
  FileSpreadsheet,
  FileText,
  Table2,
  CheckCircle,
  XCircle,
  MinusCircle,
  ArrowLeft,
  Clock,
  Award,
  Percent,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { notificationsService } from '@/services/notifications.service';
import { StudentNotificationBell } from '@/components/layout/StudentNotificationBell';
import { useCurrentSchool } from '@/hooks/useCurrentSchool';
import defaultSchoolLogo from '@/assets/csc_school_logo.png';
import { Spinner } from '@/components/ui/Spinner';
import studentBg from '@/assets/dashboard_designs/background/student_bg.jpeg';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { resultsService } from '@/services/results.service';
import type { ExportFormat } from '@/services/results.service';
import type { OptionKey } from '@/types';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  badge?: string;
  active?: boolean;
}

const COLLAPSE_KEY = 'sidebar-collapsed';

const OPTION_LABELS: Record<OptionKey, string> = {
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
};

const DOWNLOAD_FORMATS: { format: ExportFormat; label: string; icon: typeof FileText }[] = [
  { format: 'pdf', label: 'PDF (.pdf)', icon: FileText },
  { format: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { format: 'csv', label: 'CSV (.csv)', icon: Table2 },
];

function filenameStem(testTitle: string): string {
  const slug = testTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || 'result';
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export default function ResultDetailPage() {
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

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsService.unreadCount(),
  });
  const unreadCount = unreadData?.count ?? 0;

  const navItems: NavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/student/dashboard' },
    { label: 'My Exams', icon: ClipboardList, to: '/student/exams' },
    { label: 'My Results', icon: BarChart3, to: '/student/results', active: true },
    {
      label: 'Notifications',
      icon: Bell,
      to: '/student/notifications',
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : undefined,
    },
  ];

  const { resultId } = useParams<{ resultId: string }>();
  const id = Number(resultId);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['result-detail', id],
    queryFn: () => resultsService.get(id),
    enabled: !!resultId,
  });

  const download = async (format: ExportFormat, testTitle: string) => {
    setDownloadError(null);
    setDownloading(true);
    try {
      await resultsService.exportOne(id, format, filenameStem(testTitle));
    } catch {
      setDownloadError('Could not prepare the download. Please try again.');
    } finally {
      setDownloading(false);
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

  const totalQuestions = data ? data.correct_count + data.wrong_count + data.unattempted_count : 0;

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
          {isLoading ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex items-center justify-center">
              <Spinner label="Loading result details..." />
            </div>
          ) : isError || !data ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
              <p className="text-red-500 font-semibold text-sm">Failed to load result details.</p>
              <p className="text-slate-400 text-xs mt-1">Please try again later.</p>
            </div>
          ) : (
            <>
              {/* Top Header Card */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <Link
                    to="/student/results"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 mb-2 transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to My Results
                  </Link>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <BarChart3 className="h-7 w-7 text-[#1d4ed8]" />
                    {data.test_title}
                  </h1>
                  <p className="text-slate-500 text-xs mt-1 font-normal">
                    Detailed score breakdown and question review
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={downloading}
                      className="bg-[#1d4ed8] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <Download className="h-4 w-4" />
                      {downloading ? 'Preparing...' : 'Download Result'}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl shadow-xl border border-slate-100 p-1.5 bg-white z-50">
                    {DOWNLOAD_FORMATS.map(({ format, label, icon: Icon }) => (
                      <DropdownMenuItem
                        key={format}
                        onSelect={() => void download(format, data.test_title)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        <Icon className="h-4 w-4 text-purple-600" />
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {downloadError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs font-medium text-red-700">
                  {downloadError}
                </div>
              )}

              {/* Metric Cards Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Score Obtained</p>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                      {parseFloat(data.obtained_marks).toFixed(1)} / {parseFloat(data.total_marks).toFixed(1)}
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      data.passed
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-red-100 text-red-800 border-red-200'
                    }`}
                  >
                    {data.passed ? 'Pass' : 'Fail'}
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Percentage</p>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                      {parseFloat(data.percentage).toFixed(1)}%
                    </h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                    <Percent className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Time Taken</p>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                      {formatTime(data.time_taken_seconds)}
                    </h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Questions</p>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                      {totalQuestions}
                    </h3>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600">
                    <Award className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Accuracy Summary Banner */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-wrap items-center justify-around gap-4 text-xs font-semibold">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>Correct: {data.correct_count}/{totalQuestions}</span>
                </div>
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>Wrong: {data.wrong_count}/{totalQuestions}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MinusCircle className="h-4 w-4 text-slate-400" />
                  <span>Unattempted: {data.unattempted_count}/{totalQuestions}</span>
                </div>
              </div>

              {/* Question Level Details Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100/90 overflow-hidden">
                {data.details.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-500">
                    {data.review_allowed === false
                      ? 'Your teacher has disabled answer review for this test. Your final score above is recorded.'
                      : 'No question-level details available.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-4 px-6 w-12">#</th>
                          <th className="py-4 px-6">Question</th>
                          <th className="py-4 px-6">Your Answer</th>
                          <th className="py-4 px-6">Correct Answer</th>
                          <th className="py-4 px-6 text-center">Status</th>
                          <th className="py-4 px-6 text-right">Marks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {data.details.map((d, idx) => (
                          <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-4 px-6 font-medium text-slate-400">{idx + 1}</td>
                            <td className="py-4 px-6 max-w-md font-medium text-slate-900 leading-snug">
                              {d.question_text}
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-800">
                              {d.selected_option ? OPTION_LABELS[d.selected_option] : '--'}
                            </td>
                            <td className="py-4 px-6 font-bold text-emerald-700">
                              {OPTION_LABELS[d.correct_option]}
                            </td>
                            <td className="py-4 px-6 text-center">
                              {d.selected_option === null ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  Unattempted
                                </span>
                              ) : d.is_correct ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Correct
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                                  Wrong
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right font-bold text-slate-900">
                              {parseFloat(d.marks_obtained).toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
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
