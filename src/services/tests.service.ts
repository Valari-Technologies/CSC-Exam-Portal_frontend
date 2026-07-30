import api from './api';
import type {
  PaginatedResponse,
  TestAssignmentListItem,
  TestAssignmentWriteRequest,
  TestDetail,
  TestListItem,
  TestWriteRequest,
} from '@/types';

export interface TestListParams {
  page?: number;
  search?: string;
  status?: string;
  subject?: number;
  school_class?: number;
  ordering?: string;
}

export interface AssignmentListParams {
  page?: number;
  test?: number;
  is_active?: boolean;
}

export const testsService = {
  async list(params: TestListParams = {}): Promise<PaginatedResponse<TestListItem>> {
    const { data } = await api.get<PaginatedResponse<TestListItem>>('/tests/', { params });
    return data;
  },

  async get(id: number): Promise<TestDetail> {
    const { data } = await api.get<TestDetail>(`/tests/${id}/`);
    return data;
  },

  async create(payload: TestWriteRequest): Promise<TestDetail> {
    const { data } = await api.post<TestDetail>('/tests/', payload);
    return data;
  },

  async update(id: number, payload: TestWriteRequest): Promise<TestDetail> {
    const { data } = await api.put<TestDetail>(`/tests/${id}/`, payload);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/tests/${id}/`);
  },

  async addQuestions(testId: number, questionIds: number[]): Promise<TestDetail> {
    const { data } = await api.post<TestDetail>(`/tests/${testId}/add-questions/`, {
      question_ids: questionIds,
    });
    return data;
  },

  async removeQuestions(testId: number, questionIds: number[]): Promise<TestDetail> {
    const { data } = await api.post<TestDetail>(`/tests/${testId}/remove-questions/`, {
      question_ids: questionIds,
    });
    return data;
  },

  async publish(testId: number): Promise<TestDetail> {
    const { data } = await api.post<TestDetail>(`/tests/${testId}/publish/`);
    return data;
  },

  async autoGenerate(
    testId: number,
    params: { count: number; difficulty?: string; chapter_ids?: number[] },
  ): Promise<TestDetail> {
    const { data } = await api.post<TestDetail>(`/tests/${testId}/auto-generate/`, params);
    return data;
  },

  async listAssignments(params: AssignmentListParams = {}): Promise<PaginatedResponse<TestAssignmentListItem>> {
    const { data } = await api.get<PaginatedResponse<TestAssignmentListItem>>('/tests/assignments/', { params });
    return data;
  },

  async createAssignment(payload: TestAssignmentWriteRequest): Promise<TestAssignmentListItem> {
    const { data } = await api.post<TestAssignmentListItem>('/tests/assignments/', payload);
    return data;
  },

  async removeAssignment(id: number): Promise<void> {
    await api.delete(`/tests/assignments/${id}/`);
  },
};
