import api from './api';
import type { AuditLog, PaginatedResponse } from '@/types';

export interface AuditListParams {
  page?: number;
  action?: string;
  status?: string;
  user?: number;
  search?: string;
  ordering?: string;
}

export const auditService = {
  async list(params: AuditListParams = {}): Promise<PaginatedResponse<AuditLog>> {
    const { data } = await api.get<PaginatedResponse<AuditLog>>('/audit-logs/', { params });
    return data;
  },
};
