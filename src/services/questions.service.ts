import api from './api';
import type {
  PaginatedResponse,
  Question,
  QuestionListItem,
  QuestionWriteRequest,
} from '@/types';

export interface QuestionDeleteResult {
  archived: boolean;
  detail?: string;
}

export interface QuestionBulkDeleteResult {
  deleted: number;
  archived: number;
  skipped: number;
}

export interface QuestionBulkImportResult {
  total: number;
  success: number;
  fail: number;
  errors: Array<{ row: number; error: string }>;
}

export interface QuestionListParams {
  page?: number;
  search?: string;
  ordering?: string;
  school?: number;
  subject?: number;
  chapter?: number;
  lesson?: string;
  difficulty?: string;
  is_active?: boolean;
  page_size?: number;
}

export const questionsService = {
  async list(params: QuestionListParams = {}): Promise<PaginatedResponse<QuestionListItem>> {
    const { data } = await api.get<PaginatedResponse<QuestionListItem>>('/questions/', { params });
    return data;
  },

  async get(id: number): Promise<Question> {
    const { data } = await api.get<Question>(`/questions/${id}/`);
    return data;
  },

  async create(payload: QuestionWriteRequest): Promise<Question> {
    const { data } = await api.post<Question>('/questions/', payload);
    return data;
  },

  async update(id: number, payload: QuestionWriteRequest): Promise<Question> {
    const { data } = await api.put<Question>(`/questions/${id}/`, payload);
    return data;
  },

  async patch(id: number, payload: Partial<QuestionWriteRequest>): Promise<Question> {
    const { data } = await api.patch<Question>(`/questions/${id}/`, payload);
    return data;
  },

  /**
   * Delete a question. Unused questions are hard-deleted (204). A question that
   * is referenced by existing tests/exams cannot be removed without destroying
   * history, so the backend archives it (200 + { archived: true }) instead.
   */
  async remove(id: number): Promise<QuestionDeleteResult> {
    const { data, status } = await api.delete<{ archived?: boolean; detail?: string }>(
      `/questions/${id}/`,
    );
    if (status === 200 && data && data.archived) {
      return { archived: true, detail: data.detail };
    }
    return { archived: false };
  },

  /**
   * Delete several questions at once. Same per-question semantics as `remove`:
   * questions used by a test/exam are archived rather than hard-deleted.
   */
  async bulkRemove(ids: number[]): Promise<QuestionBulkDeleteResult> {
    const { data } = await api.post<QuestionBulkDeleteResult>('/questions/bulk-delete/', { ids });
    return data;
  },

  async count(params: QuestionListParams = {}): Promise<number> {
    const { data } = await api.get<{ count: number }>('/questions/count/', { params });
    return data.count;
  },

  async bulkImport(formData: FormData): Promise<QuestionBulkImportResult> {
    const { data } = await api.post<QuestionBulkImportResult>(
      '/questions/bulk-import/',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
