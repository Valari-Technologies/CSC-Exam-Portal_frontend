import api from './api';
import type { AuditLog, PaginatedResponse } from '@/types';

export interface AuditListParams {
  page?: number;
  action?: string;
  status?: string;
  user?: number;
  search?: string;
  ordering?: string;
  created_at__gte?: string;
  created_at__lte?: string;
}

export const auditService = {
  async list(params: AuditListParams = {}): Promise<PaginatedResponse<AuditLog>> {
    const { data } = await api.get<PaginatedResponse<AuditLog>>('/audit-logs/', { params });
    return data;
  },
};
