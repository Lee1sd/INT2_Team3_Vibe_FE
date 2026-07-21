// 백엔드 domain.interview/persona 실제 엔드포인트 연동 구현.
// 근거: docs/api/api-spec.md IV-001, KW-001, IS-001, IS-002/IS-002b.
// 백엔드 컨트롤러가 아직 구현되지 않았으므로(2026-07-15 기준) 지금 호출하면 404가 난다.
import { apiClient } from '../../api/client';

export interface InterviewerApiItem {
  id: number;
  name: string;
  level: number;
  tone: string;
  unlocked: boolean;
  comingSoon: boolean;
}

export interface KeywordsApiResponse {
  keywords: string[];
}

export interface CreateSessionApiResponse {
  sessionId: number;
  status: string;
  questions: { questionId: number; question: string }[];
}

export interface SubmitAnswersApiResponse {
  evaluations: { questionId: number; score: number; feedback?: string }[];
  totalScore: number;
  weakestQuestionId?: number | null;
  passed: boolean;
  overallFeedback?: string;
  nextTurn?: { type: 'FOLLOW_UP' | 'END'; targetQuestionId?: number | null; question?: string };
}

export const interviewApi = {
  /** IV-001 */
  getInterviewers: (): Promise<{ interviewers: InterviewerApiItem[] }> => apiClient.get('/api/interviewers'),

  /** KW-001 */
  getKeywords: (): Promise<KeywordsApiResponse> => apiClient.get('/api/keywords'),

  /** IS-001 */
  createSession: (resumeId: number, interviewerId: number, keyword: string): Promise<CreateSessionApiResponse> =>
    apiClient.post('/api/interviews', { resumeId, interviewerId, keyword }),

  /** IS-002 / IS-002b — 최초 3개 일괄 제출과 꼬리질문 1개 제출 모두 같은 엔드포인트를 쓴다. */
  submitAnswers: (
    sessionId: number,
    answers: { questionId: number; answerText: string }[]
  ): Promise<SubmitAnswersApiResponse> => apiClient.post(`/api/interviews/${sessionId}/answers`, { answers }),
};
