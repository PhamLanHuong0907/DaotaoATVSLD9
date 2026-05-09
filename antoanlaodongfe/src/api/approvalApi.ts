import apiClient from './client';

export type PendingType =
  | 'document'
  | 'course'
  | 'exam_template'
  | 'question'
  | 'exam_period'
  | 'exam_room'
  | 'exam';

export interface PendingItem {
  id: string;
  type: PendingType;
  title: string;
  created_by: string;
  created_at: string;
  occupation: string | null;
  skill_level: number | null;
  requested_to?: string | null;
  requested_department_id?: string | null;
}

export interface ApprovalSummary {
  total: number;
  by_type: Record<string, number>;
  items: PendingItem[];
}

export interface SubmitForReviewBody {
  requested_to?: string | null;
  requested_department_id?: string | null;
  note?: string | null;
}

export interface ReviewComment {
  id: string;
  target_type: string;
  target_id: string;
  user_id: string;
  user_name: string;
  department_id: string | null;
  content: string;
  created_at: string;
}

export const approvalApi = {
  inbox: (type?: PendingType) =>
    apiClient
      .get<ApprovalSummary>('/approvals/inbox', { params: type ? { type } : {} })
      .then((r) => r.data),

  approve: (type: PendingType, id: string, reviewNotes?: string) =>
    apiClient
      .post(`/approvals/${type}/${id}/approve`, { review_notes: reviewNotes })
      .then((r) => r.data),

  reject: (type: PendingType, id: string, reviewNotes?: string) =>
    apiClient
      .post(`/approvals/${type}/${id}/reject`, { review_notes: reviewNotes })
      .then((r) => r.data),

  submitForReview: (type: PendingType, id: string, body: SubmitForReviewBody = {}) =>
    apiClient
      .post(`/approvals/${type}/${id}/submit-for-review`, body)
      .then((r) => r.data),

  getComments: (type: PendingType, id: string) =>
    apiClient
      .get<ReviewComment[]>(`/approvals/${type}/${id}/comments`)
      .then((r) => r.data),

  addComment: (type: PendingType, id: string, content: string) =>
    apiClient
      .post<{ id: string }>(`/approvals/${type}/${id}/comments`, { content })
      .then((r) => r.data),
};
