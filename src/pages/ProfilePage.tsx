import React, { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications.service';
import { StudentNotificationBell } from '@/components/layout/StudentNotificationBell';
import Cropper, { type Area } from 'react-easy-crop';
import {
  User as UserIcon,
  Mail,
  Shield,
  School,
  Lock,
  Check,
  AlertCircle,
  Camera,
  Hash,
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
  ArrowLeft,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentSchool } from '@/hooks/useCurrentSchool';
import defaultSchoolLogo from '@/assets/csc_school_logo.png';
import { authService } from '@/services/auth.service';
import { cn } from '@/lib/utils';
import { getCroppedBlob } from '@/lib/cropImage';
import { PASSWORD_RULES_HINT, extractApiError, passwordField } from '@/lib/password';
import profileHeaderImg from '@/assets/dashboard_designs/profile/profile.png';
import studentBg from '@/assets/dashboard_designs/background/student_bg.jpeg';

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  badge?: string;
  active?: boolean;
}

const COLLAPSE_KEY = 'sidebar-collapsed';

const passwordSchema = z
  .object({
    old_password: z.string().min(1, 'Current password is required'),
    new_password: passwordField,
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const ROLE_LABELS: Record<string, string> = {
  csc_admin: 'CSC Admin',
  school_admin: 'School Admin',
  teacher: 'Teacher',
  student: 'Student',
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png'];

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const { data: school } = useCurrentSchool();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const photoMutation = useMutation({
    mutationFn: (file: File) => authService.uploadProfilePhoto(file),
    onSuccess: async () => {
      await refreshUser();
      setCropSrc(null);
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    photoMutation.reset();
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Photo must be a JPG, JPEG, or PNG image.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Photo must be 5MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSaveCrop = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    setPhotoError(null);
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      photoMutation.mutate(file);
    } catch {
      setPhotoError('Could not crop the image. Please try another photo.');
    }
  };

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
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : undefined,
    },
  ];

  const {
    register: passwordRegister,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      old_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      authService.changePassword(values.old_password, values.new_password),
    onSuccess: async () => {
      setPasswordSuccess(true);
      resetPasswordForm();
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await logout();
      navigate(user?.role === 'student' ? '/studentlogin' : '/login', {
        replace: true,
        state: { message: 'Your password was changed. Please log in with your new password.' },
      });
    },
  });

  const renderSidebarContent = (isCollapsed: boolean, isMobile: boolean = false) => (
    <div className="flex flex-col h-full bg-[#0b1739] text-white select-none">
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

  if (!user) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Spinner label="Loading profile..." />
      </div>
    );
  }

  const profileContentMarkup = (
    <div className="space-y-6 w-full">
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

      {/* Top Header Card with profile.png background */}
      <div className="relative group rounded-[20px] overflow-hidden shadow-sm border border-slate-200/60 min-h-[160px] md:min-h-[180px] flex items-center bg-[#f5f3ff]">
        <img
          src={profileHeaderImg}
          alt="Profile Header"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none transition-transform duration-700 ease-out group-hover:scale-[1.01]"
        />
        {/* Overlay to ensure high contrast/readability for the text */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]"></div>
        
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-3 flex-wrap leading-tight drop-shadow-sm">
              <UserIcon className="h-7 w-7 text-purple-600 animate-pulse" />
              My Profile & Settings
            </h1>
            <p className="text-slate-700 text-xs sm:text-sm mt-2 leading-relaxed font-semibold drop-shadow-sm max-w-xl">
              Manage your account profile details, photo, and security password.
            </p>
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Account Info Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100/90 space-y-6 h-full">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserIcon className="h-5 w-5 text-purple-600" />
            Account Information
          </h3>

          <div className="flex items-center gap-5">
            <div className="shrink-0">
              <div className="relative h-20 w-20 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 p-0.5 shadow-md flex items-center justify-center overflow-hidden">
                {user.profile_photo_url || user.profile_picture ? (
                  <img
                    src={user.profile_photo_url ?? user.profile_picture ?? ''}
                    alt={user.full_name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-10 w-10 text-white" />
                )}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoMutation.isPending}
                  aria-label="Upload profile photo"
                  className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/60 py-1 text-white hover:bg-black/75 disabled:opacity-60 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-extrabold text-slate-900 truncate">{user.full_name}</h2>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
                {user.is_verified && (
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Verified
                  </span>
                )}
              </div>
              <div className="mt-1.5 min-h-[1rem]">
                {photoMutation.isPending && (
                  <p className="text-xs text-slate-500 font-medium">Uploading photo…</p>
                )}
                {photoError && <p className="text-xs text-red-600 font-semibold">{photoError}</p>}
                {photoMutation.isError && !photoError && (
                  <p className="text-xs text-red-600 font-semibold">
                    Could not upload photo. Please try again.
                  </p>
                )}
                {!photoMutation.isPending && !photoError && (
                  <p className="text-xs text-slate-400 font-medium">JPG, JPEG, or PNG &bull; max 5MB</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3.5 pt-4 border-t border-slate-100 text-xs sm:text-sm text-slate-600">
            {user.role === 'student' && user.student_id && (
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Hash className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="text-slate-500">Student ID: <strong className="font-mono text-slate-900 font-bold ml-1">{user.student_id}</strong></span>
              </div>
            )}
            {user.role === 'teacher' && user.teacher_id && (
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Hash className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="text-slate-500">Teacher ID: <strong className="font-mono text-slate-900 font-bold ml-1">{user.teacher_id}</strong></span>
              </div>
            )}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <Mail className="h-4 w-4 text-purple-600 shrink-0" />
              <span className="text-slate-500">Email: <strong className="text-slate-900 font-semibold ml-1">{user.email}</strong></span>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <Shield className="h-4 w-4 text-purple-600 shrink-0" />
              <span className="text-slate-500">Role: <strong className="text-slate-900 font-semibold ml-1">{ROLE_LABELS[user.role] ?? user.role}</strong></span>
            </div>
            {user.school && (
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <School className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="text-slate-500">
                  School: <strong className="text-slate-900 font-semibold ml-1">{user.school_name ?? 'School'}</strong>
                  {user.school_code ? <span className="text-slate-400 ml-1">({user.school_code})</span> : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100/90 space-y-6 h-full">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Lock className="h-5 w-5 text-purple-600" />
              Change Password
            </h3>
            <p className="text-xs text-slate-500 mt-2 font-normal">Update your portal account password safely.</p>
          </div>

          <form
            onSubmit={handlePasswordSubmit((values) => passwordMutation.mutate(values))}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="old_password" className="text-xs font-bold text-slate-700">Current Password</Label>
              <Input
                id="old_password"
                type="password"
                placeholder="Enter current password"
                {...passwordRegister('old_password')}
                className={cn('rounded-xl text-xs py-2.5', passwordErrors.old_password && 'border-red-500')}
              />
              {passwordErrors.old_password && (
                <p className="text-xs text-red-600 font-medium">{passwordErrors.old_password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_password" className="text-xs font-bold text-slate-700">New Password</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="Enter new password"
                {...passwordRegister('new_password')}
                className={cn('rounded-xl text-xs py-2.5', passwordErrors.new_password && 'border-red-500')}
              />
              {passwordErrors.new_password ? (
                <p className="text-xs text-red-600 font-medium">{passwordErrors.new_password.message}</p>
              ) : (
                <p className="text-[11px] text-slate-400">{PASSWORD_RULES_HINT}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm_password" className="text-xs font-bold text-slate-700">Confirm New Password</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="Confirm new password"
                {...passwordRegister('confirm_password')}
                className={cn('rounded-xl text-xs py-2.5', passwordErrors.confirm_password && 'border-red-500')}
              />
              {passwordErrors.confirm_password && (
                <p className="text-xs text-red-600 font-medium">{passwordErrors.confirm_password.message}</p>
              )}
            </div>

            {passwordMutation.isError && (
              <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span role="alert">
                  {extractApiError(
                    passwordMutation.error,
                    'Failed to change password. Please try again.',
                  )}
                </span>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  Password changed successfully. Signing you out — please log in again with your new password…
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="bg-[#1d4ed8] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-3 px-6 rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer mt-4"
            >
              {passwordMutation.isPending ? 'Changing Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Photo Crop Dialog */}
      <Dialog
        open={cropSrc !== null}
        onOpenChange={(open) => {
          if (!open && !photoMutation.isPending) setCropSrc(null);
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Crop Profile Photo</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Drag to reposition and use the slider to zoom. Click Save when ready.
            </DialogDescription>
          </DialogHeader>

          {cropSrc && (
            <div className="space-y-4">
              <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-slate-900">
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-semibold">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                  aria-label="Zoom"
                />
              </div>
              {photoMutation.isError && (
                <p className="text-xs text-red-600 font-medium" role="alert">
                  {extractApiError(photoMutation.error, 'Could not save the photo. Please try again.')}
                </p>
              )}
              {photoError && <p className="text-xs text-red-600 font-medium">{photoError}</p>}
            </div>
          )}

          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setCropSrc(null)}
              disabled={photoMutation.isPending}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCrop}
              disabled={photoMutation.isPending || !croppedAreaPixels}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all"
            >
              {photoMutation.isPending ? 'Saving…' : 'Save Photo'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

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
            {profileContentMarkup}
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

  return profileContentMarkup;
}
