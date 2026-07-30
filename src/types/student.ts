export type Gender = 'male' | 'female' | 'other';

/**
 * The gender choices, in the order forms should offer them. Shared by the student and
 * teacher forms, and mirrors the Gender choices on both Django models.
 */
export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];
export type BulkImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface StudentUser {
  id: number;
  // Null when the student has no email on file — they sign in with student_id, so an
  // email is contact information for them, not a credential.
  email: string | null;
  student_id: string | null;
  full_name: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface StudentProfile {
  id: number;
  user: number;
  user_email: string | null;
  user_name: string;
  student_id: string | null;
  school: number;
  school_name: string;
  /** The School ID (e.g. KAR_001) — the school's code, not its primary key. */
  school_code: string;
  school_class: number;
  class_name: string;
  section: number;
  section_name: string;
  roll_number: string;
  admission_number: string;
  sub_section_code: string | null;
  display_section: string;
  display_class_section: string;
  gender: Gender | '';
  is_active: boolean;
  enrollment_date: string;
}

export interface StudentProfileDetail {
  id: number;
  user: StudentUser;
  student_id: string | null;
  /**
   * Plaintext password, returned ONLY by the create/update call that just set it, so it
   * can be shown once for handout. Always null on a plain fetch — it is never stored.
   */
  initial_password: string | null;
  school: number;
  school_name: string;
  /** The School ID (e.g. KAR_001) — the school's code, not its primary key. */
  school_code: string;
  school_class: number;
  class_name: string;
  section: number;
  section_name: string;
  roll_number: string;
  admission_number: string;
  sub_section_code: string | null;
  display_section: string;
  display_class_section: string;
  date_of_birth: string | null;
  gender: Gender | '';
  parent_name: string;
  parent_phone: string;
  is_active: boolean;
  enrollment_date: string;
}

export interface StudentWriteRequest {
  /** Null = no email on file. Never send '' — the column is unique, so blanks collide. */
  email?: string | null;
  full_name: string;
  /** Blank = auto-generate from the school prefix (e.g. KAR_ST_001). */
  student_id?: string;
  /** Blank = auto-generate on create, or leave the existing password unchanged on edit. */
  password?: string;
  school?: number;
  school_class: number;
  section: number;
  roll_number: string;
  admission_number?: string;
  sub_section_code?: string | null;
  date_of_birth?: string | null;
  gender?: Gender | '';
  parent_name?: string;
  parent_phone?: string;
  is_active?: boolean;
}

export interface BulkImportError {
  /** 0 means the problem is with the file as a whole, not one student row. */
  row: number;
  error: string;
  /**
   * 'error' — the row was rejected and no student was created.
   * 'warning' — the student WAS created, but something needs attention (e.g. the setup
   * email bounced). Only 'error' entries are counted in `fail_count`.
   * Absent on records imported before this distinction existed; treat those as errors.
   */
  level?: 'error' | 'warning';
}

/** One student's login credentials, as handed back by an import for handout. */
export interface BulkImportCredential {
  full_name: string;
  roll_number: string;
  student_id: string;
  password: string;
}

export interface BulkImportLog {
  id: number;
  school: number;
  imported_by: number | null;
  file_name: string;
  total_rows: number;
  success_count: number;
  fail_count: number;
  errors: BulkImportError[];
  /**
   * Present ONLY in the response to the upload that created these students — the
   * passwords are never stored, so import history always returns null here. Download
   * them before leaving the page; they cannot be retrieved again.
   */
  credentials: BulkImportCredential[] | null;
  status: BulkImportStatus;
  created_at: string;
}
