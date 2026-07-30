export type AuditAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'exam_start'
  | 'exam_submit'
  | 'password_change'
  | 'password_reset'
  | 'data_export'
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'school_created'
  | 'school_updated'
  | 'result_published'
  | 'bulk_import'
  | 'bulk_import_deleted'
  | 'test_published'
  | 'test_assigned';

export type AuditStatus = 'success' | 'failure';

export interface AuditLog {
  id: number;
  user: number | null;
  user_email: string | null;
  user_name: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: number | null;
  ip_address: string | null;
  status: AuditStatus;
  details: Record<string, unknown>;
  created_at: string;
}
