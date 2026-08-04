import api from './api';
import type {
  CheatEventResponse,
  AntiCheatEventType,
  EvaluateResponse,
  ExamSessionDetail,
  ExamSessionListItem,
  PaginatedResponse,
  SaveAnswerPayload,
  SaveAnswerResponse,
  SessionReview,
  SubmitExamResponse,
  TestAssignmentListItem,
} from '@/types';

export interface SessionListParams {
  page?: number;
  status?: string;
  /** Comma-separated status list, e.g. 'submitted,evaluated,published'. */
  status_in?: string;
  test?: number;
  assignment?: number;
  subject?: number;
  school_class?: number;
  section?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  search_type?: string;
  ordering?: string;
}

/** One per-question mark override sent to the evaluate endpoint. */
export interface EvaluateMarkItem {
  question_id: number;
  marks_awarded: string;
}

export const examsService = {
  /** List active assignments available to the current student. */
  async listAssignments(): Promise<PaginatedResponse<TestAssignmentListItem>> {
    const { data } = await api.get<PaginatedResponse<TestAssignmentListItem>>(
      '/tests/assignments/',
      { params: { is_active: true } },
    );
    return data;
  },

  /** Start a new exam session for a given assignment. */
  async startExam(assignmentId: number): Promise<ExamSessionDetail> {
    const { data } = await api.post<ExamSessionDetail>('/exam/sessions/start/', {
      assignment_id: assignmentId,
    });
    return data;
  },

  /** Get full session detail (questions, answers, timer). */
  async getSession(sessionId: number): Promise<ExamSessionDetail> {
    const { data } = await api.get<ExamSessionDetail>(`/exam/sessions/${sessionId}/`);
    return data;
  },

  /** List exam sessions (paginated). */
  async listSessions(params: SessionListParams = {}): Promise<PaginatedResponse<ExamSessionListItem>> {
    const { data } = await api.get<PaginatedResponse<ExamSessionListItem>>('/exam/sessions/', { params });
    return data;
  },

  /** Teacher answer-review payload (question / student answer / correct answer / marks). */
  async review(sessionId: number): Promise<SessionReview> {
    const { data } = await api.get<SessionReview>(`/exam/sessions/${sessionId}/review/`);
    return data;
  },

  /** Save the teacher's evaluation (optional per-question mark overrides). */
  async evaluate(sessionId: number, marks: EvaluateMarkItem[] = []): Promise<EvaluateResponse> {
    const { data } = await api.post<EvaluateResponse>(
      `/exam/sessions/${sessionId}/evaluate/`,
      { marks },
    );
    return data;
  },

  /** Save a single answer during an exam. */
  async saveAnswer(sessionId: number, payload: SaveAnswerPayload): Promise<SaveAnswerResponse> {
    const { data } = await api.post<SaveAnswerResponse>(
      `/exam/sessions/${sessionId}/save-answer/`,
      payload,
    );
    return data;
  },

  /** Submit the exam. */
  async submitExam(sessionId: number): Promise<SubmitExamResponse> {
    const { data } = await api.post<SubmitExamResponse>(
      `/exam/sessions/${sessionId}/submit/`,
    );
    return data;
  },

  /** Log an anti-cheat event. */
  async logCheatEvent(sessionId: number, eventType: AntiCheatEventType): Promise<CheatEventResponse> {
    const { data } = await api.post<CheatEventResponse>(
      `/exam/sessions/${sessionId}/cheat-event/`,
      { event_type: eventType },
    );
    return data;
  },
};
