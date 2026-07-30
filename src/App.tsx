import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';

// Pages are lazy-loaded so each route ships in its own chunk instead of one
// monolithic bundle — faster first paint, especially on exam day.
// Public pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const StudentLoginPage = lazy(() => import('@/pages/auth/StudentLoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const StudentForgotPasswordPage = lazy(() => import('@/pages/auth/StudentForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const SetupPasswordPage = lazy(() => import('@/pages/auth/SetupPasswordPage'));
const ForcePasswordChangePage = lazy(() => import('@/pages/auth/ForcePasswordChangePage'));
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Authenticated common pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));

// Admin (CSC Admin)
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const SchoolsListPage = lazy(() => import('@/pages/admin/schools/SchoolsListPage'));
const CreateSchoolPage = lazy(() => import('@/pages/admin/schools/CreateSchoolPage'));
const SchoolDetailPage = lazy(() => import('@/pages/admin/schools/SchoolDetailPage'));
const EditSchoolPage = lazy(() => import('@/pages/admin/schools/EditSchoolPage'));
const AuditLogsPage = lazy(() => import('@/pages/admin/AuditLogsPage'));
const SupportRequestsPage = lazy(() => import('@/pages/admin/SupportRequestsPage'));

// School Admin
const SchoolDashboardPage = lazy(() => import('@/pages/school/SchoolDashboardPage'));
const AdditionalDetailsPage = lazy(() => import('@/pages/school/AdditionalDetailsPage'));
const AcademicsOverviewPage = lazy(() => import('@/pages/school/academics/AcademicsOverviewPage'));
const ClassManagementPage = lazy(() => import('@/pages/school/academics/ClassManagementPage'));
const SectionManagementPage = lazy(() => import('@/pages/school/academics/SectionManagementPage'));
const SubjectManagementPage = lazy(() => import('@/pages/school/academics/SubjectManagementPage'));
const ChapterManagementPage = lazy(() => import('@/pages/school/academics/ChapterManagementPage'));
const TeachersListPage = lazy(() => import('@/pages/school/teachers/TeachersListPage'));
const CreateTeacherPage = lazy(() => import('@/pages/school/teachers/CreateTeacherPage'));
const TeacherDetailPage = lazy(() => import('@/pages/school/teachers/TeacherDetailPage'));
const EditTeacherPage = lazy(() => import('@/pages/school/teachers/EditTeacherPage'));
const StudentsListPage = lazy(() => import('@/pages/school/students/StudentsListPage'));
const CreateStudentPage = lazy(() => import('@/pages/school/students/CreateStudentPage'));
const BulkImportPage = lazy(() => import('@/pages/school/students/BulkImportPage'));
const StudentDetailPage = lazy(() => import('@/pages/school/students/StudentDetailPage'));
const EditStudentPage = lazy(() => import('@/pages/school/students/EditStudentPage'));

// Teacher
const TeacherDashboardPage = lazy(() => import('@/pages/teacher/TeacherDashboardPage'));
const ClassResultsPage = lazy(() => import('@/pages/teacher/ClassResultsPage'));
const CompletedExamsPage = lazy(() => import('@/pages/teacher/CompletedExamsPage'));
const EvaluateExamPage = lazy(() => import('@/pages/teacher/EvaluateExamPage'));
const PublishedResultsPage = lazy(() => import('@/pages/teacher/PublishedResultsPage'));

// Student
const StudentDashboardPage = lazy(() => import('@/pages/student/StudentDashboardPage'));
const AvailableExamsPage = lazy(() => import('@/pages/student/exam/AvailableExamsPage'));
const ExamScreenPage = lazy(() => import('@/pages/student/exam/ExamScreenPage'));
const ExamCompletePage = lazy(() => import('@/pages/student/exam/ExamCompletePage'));
const StudentResultsPage = lazy(() => import('@/pages/student/results/StudentResultsPage'));
const ResultDetailPage = lazy(() => import('@/pages/student/results/ResultDetailPage'));

// Cross-role (teacher + school_admin + csc_admin)
const QuestionBankPage = lazy(() => import('@/pages/questions/QuestionBankPage'));
const CreateQuestionPage = lazy(() => import('@/pages/questions/CreateQuestionPage'));
const EditQuestionPage = lazy(() => import('@/pages/questions/EditQuestionPage'));
const BulkImportQuestionsPage = lazy(() => import('@/pages/questions/BulkImportQuestionsPage'));
const TestsListPage = lazy(() => import('@/pages/tests/TestsListPage'));
const CreateTestPage = lazy(() => import('@/pages/tests/CreateTestPage'));
const TestPreviewPage = lazy(() => import('@/pages/tests/TestPreviewPage'));
const EditTestPage = lazy(() => import('@/pages/tests/EditTestPage'));
const AssignTestPage = lazy(() => import('@/pages/tests/AssignTestPage'));
const TestAssignmentsPage = lazy(() => import('@/pages/tests/TestAssignmentsPage'));
const ReportsDashboardPage = lazy(() => import('@/pages/reports/ReportsDashboardPage'));
const ClassReportPage = lazy(() => import('@/pages/reports/ClassReportPage'));
const SubjectReportPage = lazy(() => import('@/pages/reports/SubjectReportPage'));
const TestReportPage = lazy(() => import('@/pages/reports/TestReportPage'));
const StudentReportPage = lazy(() => import('@/pages/reports/StudentReportPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public */}
              {/* Staff (csc_admin / school_admin / teacher) sign in with email. */}
              <Route path="/login" element={<LoginPage />} />
              {/* Students sign in with their Student ID. */}
              <Route path="/studentlogin" element={<StudentLoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              {/* Students reset by Student ID; the link still goes to their own email. */}
              <Route path="/student-forgot-password" element={<StudentForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/setup-password" element={<SetupPasswordPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Forced password change — authenticated, but outside the main layout so a
                  user with a temporary password can't reach anything else first. */}
              <Route element={<ProtectedRoute />}>
                <Route path="/force-password-change" element={<ForcePasswordChangePage />} />
              </Route>

              {/* Student custom layout screens */}
              <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                <Route path="/student/dashboard" element={<StudentDashboardPage />} />
                <Route path="/student/exams" element={<AvailableExamsPage />} />
                <Route path="/student/results" element={<StudentResultsPage />} />
                <Route path="/student/results/:resultId" element={<ResultDetailPage />} />
                {/* Student profile/notifications are namespaced under /student/* so they
                    don't collide with the staff /profile and /notifications routes below
                    (a same-path collision was matching the student route for everyone and
                    403-ing staff). They render the student's own full-screen chrome. */}
                <Route path="/student/notifications" element={<NotificationsPage />} />
                <Route path="/student/profile" element={<ProfilePage />} />
                <Route path="/student/exam/:sessionId" element={<ExamScreenPage />} />
                <Route path="/student/exam/complete" element={<ExamCompletePage />} />
              </Route>

              {/* Authenticated routes with main layout (sidebar + header) */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route element={<ProtectedRoute allowedRoles={['csc_admin', 'school_admin', 'teacher']} />}>
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                  </Route>

                  {/* CSC Admin only */}
                  <Route element={<ProtectedRoute allowedRoles={['csc_admin']} />}>
                    <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                    <Route path="/admin/schools" element={<SchoolsListPage />} />
                    <Route path="/admin/schools/new" element={<CreateSchoolPage />} />
                    <Route path="/admin/schools/:id" element={<SchoolDetailPage />} />
                    <Route path="/admin/schools/:id/edit" element={<EditSchoolPage />} />
                    <Route path="/admin/support-requests" element={<SupportRequestsPage />} />
                  </Route>

                  {/* Audit Logs: CSC Admin + School Admin */}
                  <Route element={<ProtectedRoute allowedRoles={['csc_admin', 'school_admin']} />}>
                    <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
                  </Route>

                  {/* Additional Details: School Admin only (CSC Admin has no single school) */}
                  <Route element={<ProtectedRoute allowedRoles={['school_admin']} />}>
                    <Route path="/school/additional-details" element={<AdditionalDetailsPage />} />
                  </Route>

                  {/* School-level: CSC Admin + School Admin */}
                  <Route element={<ProtectedRoute allowedRoles={['csc_admin', 'school_admin']} />}>
                    <Route path="/school/dashboard" element={<SchoolDashboardPage />} />
                    <Route path="/school/teachers" element={<TeachersListPage />} />
                    <Route path="/school/teachers/new" element={<CreateTeacherPage />} />
                    <Route path="/school/teachers/:id" element={<TeacherDetailPage />} />
                    <Route path="/school/teachers/:id/edit" element={<EditTeacherPage />} />
                  </Route>

                  {/* Academics: admins manage; teachers get read-only access
                      (the pages hide all mutations for teachers; the API
                      enforces 403 on any write regardless). */}
                  <Route element={<ProtectedRoute allowedRoles={['csc_admin', 'school_admin', 'teacher']} />}>
                    <Route path="/school/academics" element={<AcademicsOverviewPage />} />
                    <Route path="/school/academics/classes" element={<ClassManagementPage />} />
                    <Route path="/school/academics/sections" element={<SectionManagementPage />} />
                    <Route path="/school/academics/subjects" element={<SubjectManagementPage />} />
                    <Route path="/school/academics/chapters" element={<ChapterManagementPage />} />
                  </Route>

                  {/* Students management: CSC Admin + School Admin (write) */}
                  <Route element={<ProtectedRoute allowedRoles={['csc_admin', 'school_admin']} />}>
                    <Route path="/school/students/new" element={<CreateStudentPage />} />
                    <Route path="/school/students/bulk-import" element={<BulkImportPage />} />
                  </Route>

                  {/* Editing a student: teachers too, but only for students in their
                      assigned classes/sections — the API enforces that with a 403, and
                      the list only offers Edit on rows they can manage. */}
                  <Route element={<ProtectedRoute allowedRoles={['csc_admin', 'school_admin', 'teacher']} />}>
                    <Route path="/school/students/:id/edit" element={<EditStudentPage />} />
                  </Route>

                  {/* Students viewing: CSC Admin + School Admin + Teacher */}
                  <Route element={<ProtectedRoute allowedRoles={['csc_admin', 'school_admin', 'teacher']} />}>
                    <Route path="/school/students" element={<StudentsListPage />} />
                    <Route path="/school/students/:id" element={<StudentDetailPage />} />
                  </Route>

                  {/* Teacher dashboard */}
                  <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
                    <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
                    <Route path="/teacher/results/:testId" element={<ClassResultsPage />} />
                    <Route path="/teacher/completed-exams" element={<CompletedExamsPage />} />
                    <Route path="/teacher/evaluate/:sessionId" element={<EvaluateExamPage />} />
                    <Route path="/teacher/published-results" element={<PublishedResultsPage />} />
                  </Route>

                  {/* Questions + Tests: Teacher + School Admin + CSC Admin */}
                  <Route element={<ProtectedRoute allowedRoles={['csc_admin', 'school_admin', 'teacher']} />}>
                    <Route path="/questions" element={<QuestionBankPage />} />
                    <Route path="/questions/new" element={<CreateQuestionPage />} />
                    <Route path="/questions/:id/edit" element={<EditQuestionPage />} />
                    <Route path="/questions/bulk-import" element={<BulkImportQuestionsPage />} />
                    <Route path="/tests" element={<TestsListPage />} />
                    <Route path="/tests/new" element={<CreateTestPage />} />
                    <Route path="/tests/:id" element={<TestPreviewPage />} />
                    <Route path="/tests/:id/edit" element={<EditTestPage />} />
                    <Route path="/tests/:id/assign" element={<AssignTestPage />} />
                    <Route path="/tests/:id/assignments" element={<TestAssignmentsPage />} />
                  </Route>

                  {/* Reports: Teacher + School Admin + CSC Admin */}
                  <Route element={<ProtectedRoute allowedRoles={['school_admin', 'teacher', 'csc_admin']} />}>
                    <Route path="/reports" element={<ReportsDashboardPage />} />
                    <Route path="/reports/class" element={<ClassReportPage />} />
                    <Route path="/reports/subject" element={<SubjectReportPage />} />
                    <Route path="/reports/test/:id" element={<TestReportPage />} />
                    <Route path="/reports/student/:id" element={<StudentReportPage />} />
                  </Route>

                </Route>
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
