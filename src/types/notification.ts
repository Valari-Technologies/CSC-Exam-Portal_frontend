export type NotificationType =
  | 'test_assigned'
  | 'exam_completed'
  | 'result_published'
  | 'system_alert'
  | 'reminder'
  | 'support_request';

export interface Notification {
  id: number;
  user: number;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationPreference {
  id: number;
  user: number;
  email_enabled: boolean;
  in_app_enabled: boolean;
  created_at: string;
}
