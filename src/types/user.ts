export type UserRole = 'csc_admin' | 'school_admin' | 'teacher' | 'student';

export interface User {
  id: number;
  email: string;
  /** Login ID for students; null for every other role. */
  student_id: string | null;
  /** Generated Teacher ID (e.g. KAR_TR_001); null for every non-teacher. */
  teacher_id: string | null;
  full_name: string;
  role: UserRole;
  school: number | null;
  school_name: string | null;
  /**
   * The School ID shown to people (e.g. KAR_001) — the school's `code`, NOT the `school`
   * primary key above. Anything labelled "School ID" in the UI must use this one.
   */
  school_code: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_password_set: boolean;
  /**
   * True when the account was given a temporary password (e.g. a School Admin created by
   * CSC Admin) and must replace it before using the app. Distinct from is_password_set:
   * a usable password exists, it just isn't theirs yet.
   */
  must_change_password: boolean;
  oauth_provider: string | null;
  oauth_id: string | null;
  /** Externally hosted avatar URL, set only by Google OAuth. */
  profile_picture: string | null;
  /** Absolute URL of the user's self-uploaded profile photo, or null if none. */
  profile_photo_url: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

/** Email + password — CSC Admin, School Admin, Teacher. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Student ID + password — students only (/studentlogin). */
export interface StudentLoginRequest {
  student_id: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  school_code: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}
