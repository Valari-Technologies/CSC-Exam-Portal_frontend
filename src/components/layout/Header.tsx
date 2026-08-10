import { useState } from 'react';
import { LogOut, Menu, User as UserIcon, HelpCircle, X, Sparkles, BookOpen, ClipboardList, FileQuestion, Users, Shield, LifeBuoy, School } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isTeacher = user?.role === 'teacher';
  const isCscAdmin = user?.role === 'csc_admin';
  const isSchoolAdmin = user?.role === 'school_admin';

  return (
    <>
      <header className="h-14 bg-transparent px-4 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden flex-shrink-0"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {(isTeacher || isCscAdmin || isSchoolAdmin) && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setGuideModalOpen(true)}
              className="h-9 w-9 rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer mr-0.5"
              title={isCscAdmin ? 'Super Admin User Guide' : isSchoolAdmin ? 'School Admin User Guide' : 'Teacher User Guide'}
              aria-label={isCscAdmin ? 'Super Admin User Guide' : isSchoolAdmin ? 'School Admin User Guide' : 'Teacher User Guide'}
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          )}
          <NotificationBell />
          {!isTeacher && !isCscAdmin && !isSchoolAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="User menu">
                  <UserAvatar
                    photoUrl={user?.profile_photo_url}
                    name={user?.full_name}
                    className="h-8 w-8"
                    iconClassName="h-5 w-5"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      photoUrl={user?.profile_photo_url}
                      name={user?.full_name}
                      className="h-9 w-9"
                      iconClassName="h-5 w-5"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate">{user?.full_name}</span>
                      <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

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
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {isCscAdmin ? 'Super Admin User Guide 👋' : isSchoolAdmin ? 'School Admin User Guide 👋' : 'Teacher User Guide 👋'}
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5 font-normal">
                    {isCscAdmin
                      ? 'Learn how to manage schools, audit logs, and support requests'
                      : isSchoolAdmin
                      ? 'Learn how to manage classes, sections, subjects, teachers, and students'
                      : 'Learn how to manage classes, subjects, question bank, and tests'}
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
              {isCscAdmin ? (
                <>
                  {/* Super Admin Process Banner */}
                  <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 rounded-2xl p-5">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      Quick Admin Actions (How It Works)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white/90 p-3 rounded-xl border border-blue-100/60 flex flex-col items-center text-center">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs mb-2">1</span>
                        <span className="font-bold text-slate-900">Manage Schools</span>
                        <span className="text-slate-500 mt-1">View, edit, or configure registered schools.</span>
                      </div>
                      <div className="bg-white/90 p-3 rounded-xl border border-blue-100/60 flex flex-col items-center text-center">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs mb-2">2</span>
                        <span className="font-bold text-slate-900">Check Audit Logs</span>
                        <span className="text-slate-500 mt-1">Track login activities and modifications.</span>
                      </div>
                      <div className="bg-white/90 p-3 rounded-xl border border-blue-100/60 flex flex-col items-center text-center">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs mb-2">3</span>
                        <span className="font-bold text-slate-900">Support Desk</span>
                        <span className="text-slate-500 mt-1">Directly view and resolve school queries.</span>
                      </div>
                      <div className="bg-white/90 p-3 rounded-xl border border-blue-100/60 flex flex-col items-center text-center">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs mb-2">4</span>
                        <span className="font-bold text-slate-900">Profile Settings</span>
                        <span className="text-slate-500 mt-1">Manage credentials in bottom sidebar drawer.</span>
                      </div>
                    </div>
                  </div>

                  {/* Super Admin Help Cards */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">Features & Guides</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-slate-100 rounded-2xl p-4 space-y-2 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-blue-600">
                          <School className="h-4 w-4" />
                          <h5 className="font-bold text-sm text-slate-900">Schools Management</h5>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Use the Schools menu to register new academic institutions, upload logos, assign default admins, and view connection credentials.
                        </p>
                      </div>

                      <div className="border border-slate-100 rounded-2xl p-4 space-y-2 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-blue-600">
                          <Shield className="h-4 w-4" />
                          <h5 className="font-bold text-sm text-slate-900">Audit Trails & Logs</h5>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Monitor exact security logs, timestamp trails, IP updates, and modifications made by different portals inside Audit Logs.
                        </p>
                      </div>

                      <div className="border border-slate-100 rounded-2xl p-4 space-y-2 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-blue-600">
                          <LifeBuoy className="h-4 w-4" />
                          <h5 className="font-bold text-sm text-slate-900">Support Requests</h5>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Check outstanding technical tickets filed by school admins or teachers. View logs and contact admins directly to assist.
                        </p>
                      </div>

                      <div className="border border-slate-100 rounded-2xl p-4 space-y-2 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-blue-600">
                          <UserIcon className="h-4 w-4" />
                          <h5 className="font-bold text-sm text-slate-900">Profile Settings</h5>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Configure your Super Admin settings, password configurations, email preferences, and personal security items inside Profile page.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : isSchoolAdmin ? (
                <>
                  {/* School Admin Process Banner */}
                  <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-100 rounded-2xl p-5">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-emerald-600" />
                      Quick School Admin Actions (How It Works)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white/90 p-3 rounded-xl border border-emerald-100/60 flex flex-col items-center text-center">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs mb-2">1</span>
                        <span className="font-bold text-slate-900">Manage Academics</span>
                        <span className="text-slate-500 mt-1">Configure classes, sections, and subjects.</span>
                      </div>
                      <div className="bg-white/90 p-3 rounded-xl border border-emerald-100/60 flex flex-col items-center text-center">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs mb-2">2</span>
                        <span className="font-bold text-slate-900">Manage Teachers</span>
                        <span className="text-slate-500 mt-1">Add teachers and assign their subjects.</span>
                      </div>
                      <div className="bg-white/90 p-3 rounded-xl border border-emerald-100/60 flex flex-col items-center text-center">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs mb-2">3</span>
                        <span className="font-bold text-slate-900">Register Students</span>
                        <span className="text-slate-500 mt-1">Add students individually or in bulk.</span>
                      </div>
                      <div className="bg-white/90 p-3 rounded-xl border border-emerald-100/60 flex flex-col items-center text-center">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs mb-2">4</span>
                        <span className="font-bold text-slate-900">Track Reports</span>
                        <span className="text-slate-500 mt-1">View overall performance and audit logs.</span>
                      </div>
                    </div>
                  </div>

                  {/* School Admin Help Cards */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">Features & Guides</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-slate-100 rounded-2xl p-4 space-y-2 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-emerald-600">
                          <BookOpen className="h-4 w-4" />
                          <h5 className="font-bold text-sm text-slate-900">Academics Configuration</h5>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Use the Academics menu to set up your school classes, sections, and subjects. These configurations are required before adding teachers or students.
                        </p>
                      </div>

                      <div className="border border-slate-100 rounded-2xl p-4 space-y-2 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-emerald-600">
                          <Users className="h-4 w-4" />
                          <h5 className="font-bold text-sm text-slate-900">Teachers Management</h5>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Add school teachers individually, assign them to their corresponding classes/subjects, and track their test creation activities.
                        </p>
                      </div>

                      <div className="border border-slate-100 rounded-2xl p-4 space-y-2 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-emerald-600">
                          <Users className="h-4 w-4" />
                          <h5 className="font-bold text-sm text-slate-900">Students & Enrolments</h5>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Register students in bulk via Excel spreadsheets or add them one-by-one. Manage their credentials and track active profile logs.
                        </p>
                      </div>

                      <div className="border border-slate-100 rounded-2xl p-4 space-y-2 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-emerald-600">
                          <LifeBuoy className="h-4 w-4" />
                          <h5 className="font-bold text-sm text-slate-900">Support Requests</h5>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Submit support queries directly to Super Admins. Track request histories and replies inside the additional details workspace.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Quick Process Steps Banner (Teacher) */}
                  <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-100 rounded-2xl p-5">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-indigo-600" />
                      Quick Teaching Process (How It Works)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white/90 p-3 rounded-xl border border-indigo-100/60 flex flex-col items-center text-center">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs mb-2">1</span>
                        <span className="font-bold text-slate-900">Check Classes</span>
                        <span className="text-slate-500 mt-1">View your assigned classes in dashboard.</span>
                      </div>
                      <div className="bg-white/90 p-3 rounded-xl border border-indigo-100/60 flex flex-col items-center text-center">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs mb-2">2</span>
                        <span className="font-bold text-slate-900">Add Questions</span>
                        <span className="text-slate-500 mt-1">Create multiple choice questions easily.</span>
                      </div>
                      <div className="bg-white/90 p-3 rounded-xl border border-indigo-100/60 flex flex-col items-center text-center">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs mb-2">3</span>
                        <span className="font-bold text-slate-900">Build Tests</span>
                        <span className="text-slate-500 mt-1">Generate exam templates for students.</span>
                      </div>
                      <div className="bg-white/90 p-3 rounded-xl border border-indigo-100/60 flex flex-col items-center text-center">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs mb-2">4</span>
                        <span className="font-bold text-slate-900">Assess Results</span>
                        <span className="text-slate-500 mt-1">Verify exam submissions and publish.</span>
                      </div>
                    </div>
                  </div>

                  {/* Detail Help Cards (Teacher) */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">Features & Guides</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-slate-100 rounded-2xl p-4 space-y-2 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-indigo-600">
                          <Users className="h-4 w-4" />
                          <h5 className="font-bold text-sm text-slate-900">Classes & Academics</h5>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Check your subject and class allocations directly on the dashboard homepage. Use Academics to inspect chapters and subjects.
                        </p>
                      </div>

                      <div className="border border-slate-100 rounded-2xl p-4 space-y-2 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-indigo-600">
                          <FileQuestion className="h-4 w-4" />
                          <h5 className="font-bold text-sm text-slate-900">Question Management</h5>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Use the Question Bank to filter questions by class, subject, and chapter. You can create new questions or edit existing ones.
                        </p>
                      </div>

                      <div className="border border-slate-100 rounded-2xl p-4 space-y-2 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-indigo-600">
                          <ClipboardList className="h-4 w-4" />
                          <h5 className="font-bold text-sm text-slate-900">Test Creation & Evaluation</h5>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Construct active test papers with dynamic duration, start/end dates, mark constraints, and negative markings.
                        </p>
                      </div>

                      <div className="border border-slate-100 rounded-2xl p-4 space-y-2 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-indigo-600">
                          <BookOpen className="h-4 w-4" />
                          <h5 className="font-bold text-sm text-slate-900">Completed & Results</h5>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Track student scores, check statistics of completed exams, and publish final scorecard sheets.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGuideModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
              >
                Close Guide
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
