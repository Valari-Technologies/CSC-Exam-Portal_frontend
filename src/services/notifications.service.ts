import api from './api';
import type { Notification, NotificationPreference, PaginatedResponse } from '@/types';

export interface NotificationListParams {
  page?: number;
  type?: string;
  is_read?: boolean;
  ordering?: string;
}

export const notificationsService = {
  async list(params: NotificationListParams = {}): Promise<PaginatedResponse<Notification>> {
    const { data } = await api.get<PaginatedResponse<Notification>>('/notifications/', { params });
    return data;
  },

  async markRead(id: number): Promise<Notification> {
    const { data } = await api.post<Notification>(`/notifications/${id}/mark-read/`);
    return data;
  },

  async markAllRead(): Promise<{ updated: number }> {
    const { data } = await api.post<{ updated: number }>('/notifications/mark-all-read/');
    return data;
  },

  async unreadCount(): Promise<{ count: number }> {
    const { data } = await api.get<{ count: number }>('/notifications/unread-count/');
    return data;
  },

  async deleteNotification(id: number): Promise<void> {
    await api.delete(`/notifications/${id}/`);
  },

  async getPreferences(): Promise<NotificationPreference> {
    const { data } = await api.get<NotificationPreference>('/notifications/preferences/');
    return data;
  },

  async updatePreferences(payload: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const { data } = await api.patch<NotificationPreference>('/notifications/preferences/', payload);
    return data;
  },
};
