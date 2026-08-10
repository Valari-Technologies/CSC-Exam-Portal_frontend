import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/Label';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

/* ── validation (unchanged) ─────────────────────────────────────────── */
const studentLoginSchema = z.object({
  student_id: z.string().min(1, 'Student ID is required.'),
  password: z.string().min(1, 'Password is required.'),
});

type StudentLoginFormValues = z.infer<typeof studentLoginSchema>;

interface LocationState {
  from?: { pathname: string };
  /**
   * Set when the student was sent here after changing their password, so they're told to
   * sign in again with the new one rather than wondering why they were logged out.
   */
  message?: string;
}

/* ── Official Multi-Color Google SVG Icon ────────────────────────────── */
function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.1 24.1 0 0 0 0 21.56l7.98-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/* ── component ───────────────────────────────────────────────────────── */
export default function StudentLoginPage() {
  const { studentLogin, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  // Shown after a password change redirected the student back here.
  const notice = (location.state as LocationState | null)?.message ?? null;

  const redirectAfterLogin = () => {
    const from = (location.state as LocationState | null)?.from?.pathname ?? '/student/dashboard';
    navigate(from, { replace: true });
  };

  const onGoogleCredential = async (idToken: string) => {
    setFormError(null);
    try {
      await loginWithGoogle(idToken);
      redirectAfterLogin();
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? err.response?.data?.detail ?? 'Google sign-in failed.'
          : 'Google sign-in failed.';
      setFormError(message);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentLoginFormValues>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: { student_id: '', password: '' },
  });

  const onSubmit = async (values: StudentLoginFormValues) => {
    setFormError(null);
    try {
      await studentLogin({
        student_id: values.student_id.trim(),
        password: values.password,
      });
      redirectAfterLogin();
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? err.response?.data?.detail ?? 'Login failed. Please check your Student ID and password.'
          : 'Something went wrong. Please try again.';
      setFormError(message);
    }
  };

  const hasGoogleClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  return (
    <div className="sl-50split-container">
      {/* ─────────────────── LEFT PANEL (50% Width - Exact Navy Blue Hero Artwork from login_hero_bg.webp) ─────────────────── */}
      <motion.div
        className="sl-left-artwork-panel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="sr-only">CSC Online Exam Portal — Student Sign In</h1>
        <picture className="sl-hero-picture">
          <source srcSet="/images/login-hero-left-navy.webp" type="image/webp" />
          <img
            src="/images/login-hero-left-navy.png"
            alt="CSC Online Exam Portal workspace artwork with realistic 3D laptop, online exam checklist, glowing desk lamp, potted plant, coffee mug, stack of books, and organic curved background"
            className="sl-hero-img-full"
            loading="eager"
          />
        </picture>
      </motion.div>

      {/* ─────────────────── RIGHT PANEL (50% Width - Clean White Form Area) ─────────────────── */}
      <div className="sl-right-form-panel">
        <motion.div
          className="sl-card-box"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        >
          {/* Avatar Icon Badge — Navy Circle overlapping card top */}
          <motion.div
            className="sl-avatar-badge"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 180, damping: 14 }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <svg
              className="sl-badge-lock"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          </motion.div>

          <h2 className="sl-card-title">Student ID Sign In</h2>
          <p className="sl-card-subtitle">Welcome Back ! Enter the Student ID and password given.</p>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit(onSubmit)} className="sl-form-element" noValidate>
            {/* Student ID Input */}
            <div className="sl-field-group">
              <Label htmlFor="student_id" className="sl-field-label">
               Student ID
              </Label>
              <div
                className={`sl-input-wrapper${errors.student_id ? ' sl-input-wrapper--error' : ''}`}
              >
                <User size={18} className="sl-input-icon" aria-hidden="true" />
                <input
                  id="student_id"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="characters"
                  placeholder="KNS-0001"
                  className="sl-text-input"
                  {...register('student_id')}
                />
              </div>
              {errors.student_id && (
                <p className="sl-field-error" role="alert">
                  {errors.student_id.message}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div className="sl-field-group">
              <Label htmlFor="password" className="sl-field-label">
                Password
              </Label>
              <div
                className={`sl-input-wrapper${errors.password ? ' sl-input-wrapper--error' : ''}`}
              >
                <Lock size={18} className="sl-input-icon" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="sl-text-input"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="sl-eye-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="sl-field-error" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Forgot Password Link — Directly below Password field */}
            <div className="sl-forgot-wrapper">
              <Link to="/student-forgot-password" className="sl-forgot-link">
                Forgot password?
              </Link>
            </div>

            {notice && (
              <p
                role="status"
                className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2"
              >
                {notice}
              </p>
            )}

            {/* Form Error Alert */}
            {formError && (
              <motion.p
                role="alert"
                className="sl-error-alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {formError}
              </motion.p>
            )}

            {/* Submit Sign In Button — CSC Deep Navy Gradient */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="sl-submit-button"
              whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(15, 27, 61, 0.35)' }}
              whileTap={{ scale: 0.97 }}
            >
              {isSubmitting && <span className="sl-spinner-icon" />}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </motion.button>

            {/* Divider */}
            <div className="sl-or-divider">
              <span className="sl-divider-line" />
              <span className="sl-divider-text">or continue with</span>
              <span className="sl-divider-line" />
            </div>

            {/* Google OAuth Button */}
            <div className="sl-google-wrapper">
              {hasGoogleClientId ? (
                <GoogleSignInButton onCredential={onGoogleCredential} disabled={isSubmitting} />
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="sl-custom-google-btn"
                  onClick={() =>
                    setFormError(
                      'Google Sign-In requires VITE_GOOGLE_CLIENT_ID to be configured in .env',
                    )
                  }
                >
                  <GoogleIcon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-semibold text-gray-700">Google</span>
                </button>
              )}
            </div>

            {/* Styled Switch Portal Navigation Button */}
            <div className="sl-switch-portal-container">
              <span className="sl-switch-label">Are you a Staff member?</span>
              <Link to="/login" className="sl-switch-button">
                <ShieldCheck size={17} aria-hidden="true" />
                <span>Staff Sign In</span>
              </Link>
            </div>
          </form>
        </motion.div>
      </div>

      {/* ─────────────────── SCOPED CSS STYLES (Proportional Width & Navigation Styling) ─────────────────── */}
      <style>{`
        * {
          box-sizing: border-box;
        }

        /* ============================================= */
        /*  FULLPAGE 50/50 CONTAINER                     */
        /* ============================================= */
        .sl-50split-container {
          position: relative;
          display: flex;
          width: 100vw;
          min-height: 100vh;
          overflow: hidden;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          background: #ffffff;
        }

        /* ============================================= */
        /*  LEFT HERO PANEL (50% Width - Navy Hero Art)  */
        /* ============================================= */
        .sl-left-artwork-panel {
          position: relative;
          width: 50%;
          min-height: 100vh;
          display: flex;
          align-items: flex-end;
          justify-content: flex-start;
          background: #0a1228;
          overflow: hidden;
          z-index: 1;
        }

        .sl-hero-picture {
          display: block;
          width: 100%;
          height: 100%;
        }

        .sl-hero-img-full {
          display: block;
          width: 118%;
          max-width: none;
          height: 100%;
          object-fit: cover;
          object-position: left center;
        }

        /* ============================================= */
        /*  RIGHT FORM PANEL (50% Width - Clean White)   */
        /* ============================================= */
        .sl-right-form-panel {
          position: relative;
          z-index: 2;
          width: 50%;
          height: 100vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2.5rem 3rem;
          background: #ffffff;
        }

        /* Card Container — Proportional width & generous spacing */
        .sl-card-box {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 460px;
          background: #ffffff;
          border-radius: 24px;
          padding: 2.5rem 2.5rem 2.25rem;
          box-shadow:
            0 14px 44px rgba(15, 27, 61, 0.08),
            0 2px 8px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: auto;
          margin-bottom: auto;
        }

        /* Avatar Circle Overlay — CSC Deep Navy Gradient */
        .sl-avatar-badge {
          position: relative;
          margin-bottom: 1.25rem;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(145deg, #153174, #0a1228);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 6px 20px rgba(15, 27, 61, 0.35);
        }
        .sl-badge-lock {
          position: absolute;
          bottom: 8px;
          right: 8px;
          color: #ffffff;
          opacity: 0.9;
        }

        /* Headings */
        .sl-card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f1b3d;
          margin: 0.5rem 0 0.25rem;
          text-align: center;
        }
        .sl-card-subtitle {
          font-size: 0.86rem;
          color: #6b7280;
          text-align: center;
          margin: 0 0 1.65rem;
          line-height: 1.5;
        }

        /* Form */
        .sl-form-element {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }

        /* Input Group */
        .sl-field-group {
          width: 100%;
        }
        .sl-field-label {
          display: block;
          font-size: 0.84rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.4rem;
        }
        .sl-input-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0 1.25rem;
          height: 50px;
          border: 1.5px solid #d1d5db;
          border-radius: 28px;
          background: #ffffff;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sl-input-wrapper:focus-within {
          border-color: #153174;
          box-shadow: 0 0 0 3.5px rgba(21, 49, 116, 0.12);
        }
        .sl-input-wrapper--error {
          border-color: #ef4444;
        }
        .sl-input-wrapper--error:focus-within {
          box-shadow: 0 0 0 3.5px rgba(239, 68, 68, 0.12);
        }
        .sl-input-icon {
          color: #9ca3af;
          flex-shrink: 0;
        }
        .sl-text-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.92rem;
          color: #1f2937;
          height: 100%;
          font-family: inherit;
        }
        .sl-text-input:-webkit-autofill,
        .sl-text-input:-webkit-autofill:hover, 
        .sl-text-input:-webkit-autofill:focus, 
        .sl-text-input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
          -webkit-text-fill-color: #1f2937 !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        .sl-text-input::placeholder {
          color: #9ca3af;
        }
        .sl-eye-toggle {
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 4px;
          display: flex;
          align-items: center;
          border-radius: 50%;
          transition: color 0.15s, background 0.15s;
        }
        .sl-eye-toggle:hover {
          color: #153174;
          background: rgba(21, 49, 116, 0.06);
        }
        .sl-eye-toggle:focus-visible {
          outline: 2px solid #153174;
          outline-offset: 2px;
        }
        .sl-field-error {
          font-size: 0.74rem;
          color: #ef4444;
          margin-top: 0.3rem;
          padding-left: 1rem;
        }

        /* Forgot Password Wrapper — Right-aligned below password input */
        .sl-forgot-wrapper {
          display: flex;
          justify-content: flex-end;
          margin-top: -0.4rem;
          margin-bottom: 0.1rem;
        }
        .sl-forgot-link {
          font-size: 0.8rem;
          font-weight: 500;
          color: #153174;
          text-decoration: none;
          transition: color 0.15s;
        }
        .sl-forgot-link:hover {
          color: #0a1228;
          text-decoration: underline;
        }
        .sl-forgot-link:focus-visible {
          outline: 2px solid #153174;
          outline-offset: 2px;
          border-radius: 2px;
        }

        /* Error Alert */
        .sl-error-alert {
          font-size: 0.82rem;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.18);
          border-radius: 12px;
          padding: 0.6rem 1rem;
          margin: 0;
        }

        /* Submit Button — CSC Deep Navy Gradient */
        .sl-submit-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          height: 48px;
          border: none;
          border-radius: 26px;
          background: linear-gradient(140deg, #153174, #0a1228);
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: box-shadow 0.25s, transform 0.15s;
          box-shadow: 0 4px 16px rgba(15, 27, 61, 0.28);
          font-family: inherit;
          letter-spacing: 0.3px;
        }
        .sl-submit-button:hover:not(:disabled) {
          box-shadow: 0 6px 24px rgba(15, 27, 61, 0.38);
          background: linear-gradient(140deg, #1a3b8b, #0f1b3d);
        }
        .sl-submit-button:focus-visible {
          outline: 2px solid #153174;
          outline-offset: 3px;
        }
        .sl-submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .sl-spinner-icon {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: sl-spin-anim 0.6s linear infinite;
        }
        @keyframes sl-spin-anim {
          to { transform: rotate(360deg); }
        }

        /* Divider */
        .sl-or-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .sl-divider-line {
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }
        .sl-divider-text {
          font-size: 0.79rem;
          color: #9ca3af;
          white-space: nowrap;
        }

        /* Google Button */
        .sl-google-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
        }
        .sl-custom-google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
          width: 100%;
          height: 46px;
          border: 1.5px solid #d1d5db;
          border-radius: 24px;
          background: #ffffff;
          color: #374151;
          font-size: 0.92rem;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.15s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .sl-custom-google-btn:hover:not(:disabled) {
          border-color: #9ca3af;
          background: #f9fafb;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
        }
        .sl-custom-google-btn:focus-visible {
          outline: 2px solid #153174;
          outline-offset: 2px;
        }

        /* ============================================= */
        /*  SWITCH PORTAL NAVIGATION STYLING             */
        /* ============================================= */
        .sl-switch-portal-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.25rem;
          width: 100%;
        }
        .sl-switch-label {
          font-size: 0.78rem;
          color: #6b7280;
        }
        .sl-switch-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          height: 44px;
          border: 1.5px solid #153174;
          border-radius: 24px;
          background: rgba(21, 49, 116, 0.04);
          color: #153174;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(21, 49, 116, 0.06);
        }
        .sl-switch-button:hover {
          background: #153174;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(21, 49, 116, 0.25);
          transform: translateY(-1px);
        }
        .sl-switch-button:focus-visible {
          outline: 2px solid #153174;
          outline-offset: 2px;
        }

        /* ============================================= */
        /*  RESPONSIVE BREAKPOINTS                       */
        /* ============================================= */
        @media (min-width: 1400px) {
          .sl-card-box {
            max-width: 480px;
            padding: 3.75rem 2.75rem 2.5rem;
          }
        }

        @media (max-width: 1120px) {
          .sl-right-form-panel {
            padding: 2.5rem 2rem;
          }
          .sl-card-box {
            max-width: 430px;
          }
        }

        @media (max-width: 860px) {
          .sl-50split-container {
            flex-direction: column;
            overflow-y: auto;
          }
          .sl-left-artwork-panel {
            width: 100%;
            min-height: 260px;
            height: auto;
          }
          .sl-hero-img-full {
            object-fit: cover;
            object-position: top center;
          }
          .sl-right-form-panel {
            width: 100%;
            height: auto;
            min-height: auto;
            overflow-y: visible;
            padding: 2.5rem 1.5rem 2rem;
          }
          .sl-card-box {
            margin: 0 auto;
          }
        }

        @media (max-width: 520px) {
          .sl-left-artwork-panel {
            min-height: 220px;
          }
          .sl-right-form-panel {
            padding: 2rem 1rem;
          }
          .sl-card-box {
            padding: 2rem 1.25rem 1.5rem;
            border-radius: 20px;
          }
        }
      `}</style>
    </div>
  );
}
