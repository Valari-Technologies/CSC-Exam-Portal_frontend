import api from './api';
import type {
  ClassReportItem,
  StudentReportData,
  SubjectReportItem,
  TestReportData,
} from '@/types';

export interface ReportParams {
  school_id?: number;
}

export interface ClassReportParams extends ReportParams {
  date_from?: string;
  date_to?: string;
}

export interface SubjectReportParams extends ReportParams {
  school_class?: number;
}

export interface StudentReportParams {
  subject?: number;
}

export const reportsService = {
  /** Class-wise performance report. */
  async classReport(params: ClassReportParams = {}): Promise<ClassReportItem[]> {
    const { data } = await api.get<ClassReportItem[]>('/reports/class/', { params });
    return data;
  },

  /** Subject-wise performance report. */
  async subjectReport(params: SubjectReportParams = {}): Promise<SubjectReportItem[]> {
    const { data } = await api.get<SubjectReportItem[]>('/reports/subject/', { params });
    return data;
  },

  /** Per-test analysis report. */
  async testReport(testId: number): Promise<TestReportData> {
    const { data } = await api.get<TestReportData>(`/reports/test/${testId}/`);
    return data;
  },

  /** Per-student performance history. */
  async studentReport(studentId: number, params: StudentReportParams = {}): Promise<StudentReportData> {
    const { data } = await api.get<StudentReportData>(`/reports/student/${studentId}/`, { params });
    return data;
  },
};
