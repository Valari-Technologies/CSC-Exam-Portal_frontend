// One Gender definition for the whole app — students and teachers use the same choices,
// and re-declaring it here would collide in the types barrel (`export *`) and silently
// drop both.
import type { Gender } from './student';

export interface TeacherUser {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface TeacherAssignmentRead {
  id: number;
  /** Null for a class-only assignment (no subject named yet). */
  subject: number | null;
  subject_name: string | null;
  school_class: number;
  class_name: string;
  section: number | null;
  section_name: string | null;
  academic_year: string;
  assigned_at: string;
}

export interface TeacherProfile {
  id: number;
  user: number;
  user_email: string;
  user_name: string;
  school: number;
  school_name: string;
  /** The School ID (e.g. KAR_001) — the school's code, not its primary key. */
  school_code: string;
  /**
   * Auto-generated from the school's School ID, e.g. KARTR_001. Server-owned and never
   * entered by hand — distinct from `employee_id`, which is the school's own reference.
   */
  teacher_id: string;
  employee_id: string;
  contact_number?: string;
  /** '' when unknown — teachers created before this field existed have no value. */
  gender: Gender | '';
  qualification: string;
  joining_date: string | null;
  is_active: boolean;
  assignments_count: number;
}

export interface TeacherProfileDetail {
  id: number;
  user: TeacherUser;
  school: number;
  school_name: string;
  /** The School ID (e.g. KAR_001) — the school's code, not its primary key. */
  school_code: string;
  /** Auto-generated from the school's School ID, e.g. KARTR_001. See TeacherProfile. */
  teacher_id: string;
  employee_id: string;
  contact_number?: string;
  /** '' when unknown — see TeacherProfile. */
  gender: Gender | '';
  qualification: string;
  joining_date: string | null;
  is_active: boolean;
  assignments: TeacherAssignmentRead[];
  /**
   * One-time password-setup link for the teacher. Present ONLY on the response to
   * creating a teacher — never on reads. Surface it to the School Admin so they can hand
   * it over; it is also emailed to the teacher.
   */
  setup_link?: string | null;
}

/** One class/section/subject a teacher is assigned to while being created. */
export interface TeacherClassAssignmentRequest {
  school_class: number;
  section?: number | null;
  /** Optional — a Subject belongs to one class, so it must match `school_class`. */
  subject?: number | null;
}

export interface TeacherWriteRequest {
  email: string;
  full_name: string;
  school?: number;
  employee_id?: string;
  contact_number?: string;
  gender?: Gender | '';
  qualification?: string;
  joining_date?: string | null;
  is_active?: boolean;
  /**
   * Academic year (e.g. "2025-26") stamped onto every assignment created below. Create
   * only — it is stored on the assignments, not on the teacher.
   */
  academic_year?: string;
  /**
   * Class/section/subject assignments to create alongside the teacher. Create only — the
   * API rejects these on update, where assignments are managed separately.
   */
  assignments?: TeacherClassAssignmentRequest[];
}

/** Dashboard counters scoped to the logged-in teacher's own assignments. */
export interface TeacherStats {
  /** Distinct classes this teacher is assigned to — not the school's class total. */
  assigned_classes: number;
  /** Distinct subjects this teacher actually teaches — not the school's subject total. */
  assigned_subjects: number;
}

/** The classes and section letters a teacher is assigned — scopes their Students filters. */
export interface TeacherAssignmentOptions {
  classes: { id: number; name: string }[];
  sections: string[];
}

export interface TeacherAssignmentWriteRequest {
  teacher: number;
  /** Optional — omit or null for a class-only assignment. */
  subject?: number | null;
  school_class: number;
  section?: number | null;
  academic_year: string;
}
