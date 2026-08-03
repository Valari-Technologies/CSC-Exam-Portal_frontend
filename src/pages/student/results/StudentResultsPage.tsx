import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
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
  Eye,
  FileSpreadsheet,
  FileText,
  Table2,
  ChevronLeft,
  ChevronRight,
  Award,
  ArrowLeft,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { notificationsService } from '@/services/notifications.service';
import { StudentNotificationBell } from '@/components/layout/StudentNotificationBell';
import { useCurrentSchool } from '@/hooks/useCurrentSchool';
import defaultSchoolLogo from '@/assets/csc_school_logo.webp';
import { Spinner } from '@/components/ui/Spinner';
import studentBg from '@/assets/dashboard_designs/background/student_bg.jpeg';
import myResultHeaderImg from '@/assets/dashboard_designs/Student/my result.webp';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { resultsService } from '@/services/results.service';
import type { ExportFormat } from '@/services/results.service';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  badge?: string;
  active?: boolean;
}

const COLLAPSE_KEY = 'sidebar-collapsed';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

const DOWNLOAD_FORMATS: { format: ExportFormat; label: string; icon: typeof FileText }[] = [
  { format: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { format: 'csv', label: 'CSV (.csv)', icon: Table2 },
  { format: 'pdf', label: 'PDF (.pdf)', icon: FileText },
];

export default function StudentResultsPage() {
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

  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['student-results', page],
    queryFn: () => resultsService.list({ page }),
    placeholderData: keepPreviousData,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 20)) : 1;
  const hasResults = !!data && data.count > 0;

  const download = async (format: ExportFormat) => {
    setDownloadError(null);
    setDownloading(format);
    try {
      await resultsService.export(format);
    } catch {
      setDownloadError('Could not prepare the download. Please try again.');
    } finally {
      setDownloading(null);
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
              src={myResultHeaderImg}
              alt="My Results Header"
              className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
            />
            {/* Overlay to ensure high contrast/readability for the text */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent z-0" />

            <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                  <BarChart3 className="h-7 w-7 text-[#16a34a]" />
                  My Results
                </h1>
                <p className="text-slate-500 text-sm mt-1.5 leading-relaxed font-normal">
                  Your published test results, performance statistics, and official certificates.
                </p>
              </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={!hasResults || downloading !== null}
                  className="bg-[#1d4ed8] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Download className="h-4 w-4" />
                  {downloading ? 'Preparing...' : 'Download Results'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl shadow-xl border border-slate-100 p-1.5 bg-white z-50">
                {DOWNLOAD_FORMATS.map(({ format, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={format}
                    onSelect={() => void download(format)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    <Icon className="h-4 w-4 text-purple-600" />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          </div>

          {downloadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs font-medium text-red-700">
              {downloadError}
            </div>
          )}

          {/* Results Table Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100/90 overflow-hidden">
            {isLoading ? (
              <div className="p-12 flex items-center justify-center">
                <Spinner label="Loading results..." />
              </div>
            ) : isError ? (
              <div className="p-12 text-center">
                <p className="text-red-500 font-semibold text-sm">Failed to load results.</p>
                <p className="text-slate-400 text-xs mt-1">Please try refreshing the page.</p>
              </div>
            ) : data && data.results.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <Award className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No Results Available Yet</h3>
                <p className="text-slate-500 text-xs mt-1">Results will appear here once your teachers publish your test scores.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-4 px-6 w-16">S.No</th>
                      <th className="py-4 px-6">Test Title</th>
                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6 text-right">Marks</th>
                      <th className="py-4 px-6 text-right">Percentage</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {data?.results.map((r, index) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6 font-medium text-slate-400">
                          {(page - 1) * 20 + index + 1}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                          {r.test_title}
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          {formatDate(r.calculated_at)}
                        </td>
                        <td className="py-4 px-6 text-right font-semibold text-slate-900">
                          {parseFloat(r.obtained_marks).toFixed(1)} / {parseFloat(r.total_marks).toFixed(1)}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-slate-900">
                          {parseFloat(r.percentage).toFixed(1)}%
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${
                              r.passed
                                ? 'bg-emerald-100/80 text-emerald-800 border-emerald-200'
                                : 'bg-red-100/80 text-red-800 border-red-200'
                            }`}
                          >
                            {r.passed ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link
                            to={`/student/results/${r.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {data && data.count > 20 && (
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Page {page} of {totalPages} &bull; {data.count} Total Results
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
