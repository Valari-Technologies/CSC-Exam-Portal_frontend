import type { OptionKey } from './question';

/** List serializer shape returned by GET /results/. */
export interface ResultListItem {
  id: number;
  student: number;
  student_name: string;
  student_email: string | null;
  class_name: string | null;
  section_name: string | null;
  test: number;
  test_title: string;
  subject_name: string;
  assignment: number;
  obtained_marks: string;
  total_marks: string;
  percentage: string;
  passed: boolean;
  rank: number | null;
  is_published: boolean;
  published_at: string | null;
  calculated_at: string;
}

/** Per-question breakdown nested inside detail response. */
export interface ResultDetailItem {
  id: number;
  question_id: number;
  question_text: string;
  selected_option: OptionKey | null;
  correct_option: OptionKey;
  is_correct: boolean;
  marks_obtained: string;
}

/** Detail serializer shape returned by GET /results/{id}/. */
export interface ResultDetailResponse {
  id: number;
  session: number;
  student: number;
  student_name: string;
  student_email: string | null;
  test: number;
  test_title: string;
  assignment: number;
  total_marks: string;
  obtained_marks: string;
  percentage: string;
  passed: boolean;
  correct_count: number;
  wrong_count: number;
  unattempted_count: number;
  rank: number | null;
  time_taken_seconds: number;
  is_published: boolean;
  published_at: string | null;
  calculated_at: string;
  details: ResultDetailItem[];
  /**
   * False when the test has `allow_review_after_submit` off and the viewer is the student:
   * `details` comes back empty by design, not because the breakdown is missing.
   * Always true for teachers and admins.
   */
  review_allowed: boolean;
}

/** Response from POST /results/{id}/publish/. */
export interface PublishResultResponse {
  detail: string;
  result_id: number;
  is_published: boolean;
}

/** Response from POST /results/publish-bulk/. */
export interface PublishBulkResponse {
  detail: string;
  assignment_id: number;
  published_count: number;
}

/** Kept for backward compat — the base model shape. */
export interface Result {
  id: number;
  session: number;
  student: number;
  test: number;
  assignment: number;
  total_marks: string;
  obtained_marks: string;
  percentage: string;
  passed: boolean;
  correct_count: number;
  wrong_count: number;
  unattempted_count: number;
  rank: number | null;
  time_taken_seconds: number;
  is_published: boolean;
  published_at: string | null;
  calculated_at: string;
}

export interface ResultDetail {
  id: number;
  result: number;
  question: number;
  selected_option: OptionKey | null;
  correct_option: OptionKey;
  is_correct: boolean;
  marks_obtained: string;
}
