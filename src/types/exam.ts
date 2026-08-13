import type { OptionKey } from './question';

export type ExamSessionStatus =
  | 'not_started'
  | 'started'
  | 'in_progress'
  | 'submitted'
  | 'evaluated'
  | 'published'
  | 'abandoned';
export type AntiCheatEventType = 'tab_switch' | 'fullscreen_exit' | 'copy_attempt' | 'focus_loss';

/** Brief student info nested in exam session detail. */
export interface ExamStudentBrief {
  id: number;
  /** Null when the student has no email on file — they sign in with a Student ID. */
  email: string | null;
  full_name: string;
}

/** Question shape returned inside an exam session (no correct_option). */
export interface ExamQuestion {
  id: number;
  question_text: string;
  question_image: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_a_image: string | null;
  option_b_image: string | null;
  option_c_image: string | null;
  option_d_image: string | null;
  marks: number;
  order_number: number;
  /**
   * The order to DISPLAY the options in, e.g. ['c','a','d','b'] when the test has
   * shuffle_options on. Each letter still identifies the same option text, so the value
   * sent back as `selected_option` — and therefore grading — is unaffected by the order.
   */
  option_order?: OptionKey[];
}

/** Answer shape nested in session detail. */
export interface ExamAnswerBrief {
  id: number;
  question_id: number;
  question_text: string;
  selected_option: OptionKey | null;
  time_spent_seconds: number;
  last_updated_at: string;
}

/** List serializer shape for exam sessions (evaluation dashboard row). */
export interface ExamSessionListItem {
  id: number;
  student: number;
  student_email: string | null;
  student_name: string;
  class_name: string | null;
  section_name: string | null;
  test: number;
  test_title: string;
  subject_name: string;
  lesson_name: string | null;
  assignment: number;
  status: ExamSessionStatus;
  started_at: string;
  submitted_at: string | null;
  time_remaining_seconds: number;
  obtained_marks: string | null;
  total_marks: string | null;
  percentage: string | null;
  result_id: number | null;
  is_published: boolean;
}

/** One question row in the teacher answer-review payload. */
export interface ReviewQuestion {
  question_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  student_answer: OptionKey | null;
  correct_answer: OptionKey;
  is_correct: boolean;
  marks_obtained: string;
  max_marks: string;
  explanation: string;
}

/** GET /exam/sessions/{id}/review/ response. */
export interface SessionReview {
  session_id: number;
  status: ExamSessionStatus;
  student_name: string;
  test_title: string;
  subject_name: string;
  submitted_at: string | null;
  evaluated_at: string | null;
  result: {
    id: number;
    total_marks: string;
    obtained_marks: string;
    percentage: string;
    passed: boolean;
    is_published: boolean;
  };
  questions: ReviewQuestion[];
}

/** POST /exam/sessions/{id}/evaluate/ response. */
export interface EvaluateResponse {
  detail: string;
  session_id: number;
  status: ExamSessionStatus;
  obtained_marks: string;
  total_marks: string;
  percentage: string;
  passed: boolean;
}

/** Detail serializer shape for a single exam session. */
export interface ExamSessionDetail {
  id: number;
  student: ExamStudentBrief;
  test: number;
  test_title: string;
  test_duration_minutes: number;
  assignment: number;
  status: ExamSessionStatus;
  started_at: string;
  submitted_at: string | null;
  time_remaining_seconds: number;
  ip_address: string | null;
  browser_info: string;
  answers: ExamAnswerBrief[];
  questions: ExamQuestion[];
}

/** Kept for backward compat — the base model shape. */
export interface ExamSession {
  id: number;
  student: number;
  assignment: number;
  test: number;
  started_at: string;
  submitted_at: string | null;
  time_remaining_seconds: number;
  status: ExamSessionStatus;
  ip_address: string | null;
  browser_info: string;
}

export interface ExamAnswer {
  id: number;
  session: number;
  question: number;
  selected_option: OptionKey | null;
  time_spent_seconds: number;
  last_updated_at: string;
}

export interface AntiCheatLog {
  id: number;
  session: number;
  event_type: AntiCheatEventType;
  event_count: number;
  occurred_at: string;
}

/** Payload for save-answer endpoint. */
export interface SaveAnswerPayload {
  question_id: number;
  selected_option: OptionKey | null;
  time_spent_seconds?: number;
  time_remaining_seconds?: number;
}

/** Response from save-answer endpoint. */
export interface SaveAnswerResponse {
  detail: string;
  question_id: number;
  selected_option: OptionKey | null;
  time_remaining_seconds: number;
}

/** Response from submit endpoint. */
export interface SubmitExamResponse {
  detail: string;
  session_id: number;
}

/** Response from cheat-event endpoint. */
export interface CheatEventResponse {
  detail: string;
  auto_submitted: boolean;
}
