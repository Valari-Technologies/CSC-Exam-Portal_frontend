export type TestStatus = 'draft' | 'published' | 'archived';
export type AssignedToType = 'class' | 'section' | 'students';

export interface Test {
  id: number;
  school: number;
  created_by: number | null;
  title: string;
  description: string;
  subject: number;
  school_class: number;
  total_marks: string;
  passing_marks: string;
  duration_minutes: number;
  instructions: string;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_result_immediately: boolean;
  allow_review_after_submit: boolean;
  status: TestStatus;
  created_at: string;
  updated_at: string;
}

export interface TestListItem {
  id: number;
  title: string;
  subject_name: string;
  class_name: string;
  total_marks: string;
  duration_minutes: number;
  status: TestStatus;
  question_count: number;
  created_at: string;
}

export interface TestQuestionItem {
  id: number;
  question: number;
  question_text: string;
  order_number: number;
  marks_override: string | null;
  difficulty: string;
  marks: string;
}

export interface TestDetail {
  id: number;
  school: number;
  created_by: number | null;
  created_by_name: string | null;
  title: string;
  description: string;
  subject: number;
  subject_name: string;
  school_class: number;
  class_name: string;
  total_marks: string;
  passing_marks: string;
  duration_minutes: number;
  instructions: string;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_result_immediately: boolean;
  allow_review_after_submit: boolean;
  status: TestStatus;
  questions: TestQuestionItem[];
  assignments_count: number;
  created_at: string;
  updated_at: string;
}

export interface TestWriteRequest {
  title: string;
  description?: string;
  subject: number;
  school_class: number;
  total_marks: number;
  passing_marks: number;
  duration_minutes: number;
  instructions?: string;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_result_immediately?: boolean;
  allow_review_after_submit?: boolean;
}

export interface TestQuestion {
  id: number;
  test: number;
  question: number;
  order_number: number;
  marks_override: string | null;
}

export interface TestAssignment {
  id: number;
  test: number;
  assigned_to_type: AssignedToType;
  school_class: number | null;
  section: number | null;
  start_datetime: string;
  end_datetime: string;
  assigned_by: number | null;
  assigned_at: string;
  is_active: boolean;
}

export type AssignmentAvailability = 'upcoming' | 'open' | 'expired';

export interface TestAssignmentListItem {
  id: number;
  test: number;
  test_title: string;
  assigned_to_type: AssignedToType;
  school_class: number | null;
  class_name: string | null;
  section: number | null;
  section_name: string | null;
  subject_name: string | null;
  assigned_by_name: string | null;
  chapter_name: string | null;
  lesson_name: string | null;
  start_datetime: string;
  end_datetime: string;
  /**
   * The server's own reading of the window at fetch time. The client still ticks
   * its local clock so a card transitions live, but this is what stops a device
   * with a wrong clock drawing "Start Exam" on a closed window.
   */
  availability: AssignmentAvailability;
  is_active: boolean;
  assigned_at: string;
}

export interface TestAssignmentWriteRequest {
  test: number;
  assigned_to_type: AssignedToType;
  school_class?: number | null;
  section?: number | null;
  /** Required when assigned_to_type === 'students': explicit recipient user ids. */
  students?: number[];
  start_datetime: string;
  end_datetime: string;
}

export interface TestAssignmentStudent {
  id: number;
  assignment: number;
  student: number;
  is_notified: boolean;
  notified_at: string | null;
}
