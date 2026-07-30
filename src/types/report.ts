/** Response shape from GET /reports/class/. */
export interface ClassReportItem {
  class_id: number;
  class_name: string;
  total_students: number;
  avg_percentage: string | null;
  pass_count: number;
  fail_count: number;
}

/** Response shape from GET /reports/subject/. */
export interface SubjectReportItem {
  subject_id: number;
  subject_name: string;
  avg_percentage: string | null;
  question_count: number;
  test_count: number;
}

/** Response shape from GET /reports/test/{id}/. */
export interface TestReportData {
  test_id: number;
  test_title: string;
  total_students: number;
  avg_marks: string | null;
  highest_marks: string | null;
  lowest_marks: string | null;
  avg_percentage: string | null;
  pass_percentage: string | null;
}

/** Individual result entry nested in student report. */
export interface StudentReportResult {
  id: number;
  test_title: string;
  obtained_marks: string;
  total_marks: string;
  percentage: string;
  passed: boolean;
  rank: number | null;
  calculated_at: string;
}

/** Response shape from GET /reports/student/{id}/. */
export interface StudentReportData {
  student_id: number;
  student_name: string;
  student_email: string | null;
  total_tests: number;
  avg_percentage: string | null;
  total_passed: number;
  total_failed: number;
  results: StudentReportResult[];
}
