import api from './api';
import type {
  PaginatedResponse,
  SupportRequest,
  SupportRequestCreate,
  SupportRequestReply,
  SupportStatus,
} from '@/types';

export interface SupportListParams {
  page?: number;
  status?: SupportStatus;
  school?: number;
}

export const supportService = {
  /** CSC Admin sees all requests; School Admin sees only their own school's. */
  async list(params: SupportListParams = {}): Promise<PaginatedResponse<SupportRequest>> {
    const { data } = await api.get<PaginatedResponse<SupportRequest>>('/support-requests/', {
      params,
    });
    return data;
  },

  async get(id: number): Promise<SupportRequest> {
    const { data } = await api.get<SupportRequest>(`/support-requests/${id}/`);
    return data;
  },

  /** School Admin submits an Additional Details request. */
  async create(payload: SupportRequestCreate): Promise<SupportRequest> {
    const { data } = await api.post<SupportRequest>('/support-requests/', payload);
    return data;
  },

  /** CSC Admin replies (and, by default, resolves). */
  async reply(id: number, payload: SupportRequestReply): Promise<SupportRequest> {
    const { data } = await api.post<SupportRequest>(`/support-requests/${id}/reply/`, payload);
    return data;
  },
};
