// 백엔드 domain.interview/persona/judgment 패키지(김한비 ②, 최용성 ③ 담당)와 짝을 이루는 타입.
// 근거: docs/api/api-spec.md IV-001, KW-001, IS-001, IS-002/IS-002b.

export interface Interviewer {
  id: string;
  name: string;
  level: number;
  requiredGauge: number;
  isUnlocked: boolean;
  description: string;
  achievement?: string;
  avatar: string; // URL or emoji
}

export interface Question {
  id: string;
  content: string;
  type: 'MAIN' | 'FOLLOW_UP';
}

export interface Answer {
  questionId: string;
  content: string;
}

/**
 * IS-002/IS-002b question-level evaluation.
 * Backend does not expose intent/accuracy/reasoning/tradeoff sub-scores.
 */
export interface EvaluationDetail {
  questionId: string;
  score: number;
  feedback?: string;
}

export interface NextTurn {
  type: 'FOLLOW_UP' | 'END';
  turn: number;
  question?: string;
  questionId?: string;
}

export interface InterviewResponse {
  // startInterview 응답에만 포함된다 — 이후 submitAnswers/submitFollowUp 호출은 화면이 들고 있는
  // 값을 그대로 재사용하므로 응답에 다시 실어줄 필요가 없다 (#11: 하드코딩된 'session_123' 제거).
  sessionId?: string;
  evaluations?: EvaluationDetail[];
  totalScore?: number;
  weakestQuestionId?: string;
  overallFeedback?: string;
  passed: boolean;
  nextTurn: NextTurn;
  questions?: Question[]; // Provided on initial load or follow-up
}
