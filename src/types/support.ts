export type SupportIssueType =
  | 'incorrect_school_name'
  | 'incorrect_login_email'
  | 'password_issue'
  | 'other';

export type SupportStatus = 'open' | 'resolved';

export interface SupportRequest {
  id: number;
  school: number;
  school_name: string;
  school_code: string;
  school_official_email: string;
  school_principal_name: string;
  raised_by: number | null;
  raised_by_name: string | null;
  raised_by_email: string | null;
  issue_type: SupportIssueType;
  issue_type_display: string;
  description: string;
  status: SupportStatus;
  status_display: string;
  admin_reply: string;
  resolved_by: number | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

/** What the School Admin submits on the Additional Details form. */
export interface SupportRequestCreate {
  issue_type: SupportIssueType;
  description: string;
}

/** The Super Admin's reply; `resolve` closes the request in the same step. */
export interface SupportRequestReply {
  reply: string;
  resolve?: boolean;
}
