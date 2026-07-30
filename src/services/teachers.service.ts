import api from './api';
import type {
  PaginatedResponse,
  TeacherAssignmentOptions,
  TeacherAssignmentRead,
  TeacherAssignmentWriteRequest,
  TeacherProfile,
  TeacherProfileDetail,
  TeacherStats,
  TeacherWriteRequest,
} from '@/types';

export interface TeacherListParams {
  page?: number;
  search?: string;
  is_active?: boolean;
  school?: number;
  ordering?: string;
}

export const teachersService = {
  async list(params: TeacherListParams = {}): Promise<PaginatedResponse<TeacherProfile>> {
    const { data } = await api.get<PaginatedResponse<TeacherProfile>>('/teachers/', { params });
    return data;
  },

  async get(id: number): Promise<TeacherProfileDetail> {
    const { data } = await api.get<TeacherProfileDetail>(`/teachers/${id}/`);
    return data;
  },

  async create(payload: TeacherWriteRequest): Promise<TeacherProfileDetail> {
    const { data } = await api.post<TeacherProfileDetail>('/teachers/', payload);
    return data;
  },

  async update(id: number, payload: TeacherWriteRequest): Promise<TeacherProfileDetail> {
    const { data } = await api.put<TeacherProfileDetail>(`/teachers/${id}/`, payload);
    return data;
  },

  async patch(id: number, payload: Partial<TeacherWriteRequest>): Promise<TeacherProfileDetail> {
    const { data } = await api.patch<TeacherProfileDetail>(`/teachers/${id}/`, payload);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/teachers/${id}/`);
  },

  /** Permanently delete the teacher (User + profile + assignments). Irreversible. */
  async hardDelete(id: number): Promise<void> {
    await api.delete(`/teachers/${id}/hard-delete/`);
  },

  /** Counters for the logged-in teacher's own dashboard. Teachers only. */
  async myStats(): Promise<TeacherStats> {
    const { data } = await api.get<TeacherStats>('/teachers/my-stats/');
    return data;
  },

  /**
   * The distinct classes and section letters assigned to the logged-in teacher.
   * Used to scope the Class/Section filters on Teacher → Students. Teachers only.
   */
  async myAssignments(): Promise<TeacherAssignmentOptions> {
    const { data } = await api.get<TeacherAssignmentOptions>('/teachers/my-assignments/');
    return data;
  },

  async listAssignments(params: Record<string, unknown> = {}): Promise<PaginatedResponse<TeacherAssignmentRead>> {
    const { data } = await api.get<PaginatedResponse<TeacherAssignmentRead>>('/teachers/assignments/', { params });
    return data;
  },

  async createAssignment(payload: TeacherAssignmentWriteRequest): Promise<TeacherAssignmentRead> {
    const { data } = await api.post<TeacherAssignmentRead>('/teachers/assignments/', payload);
    return data;
  },

  async removeAssignment(id: number): Promise<void> {
    await api.delete(`/teachers/assignments/${id}/`);
  },
};
