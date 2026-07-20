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
 * 주의(FE/BE 불일치, 실제 연동 전 정리 필요): 백엔드는 채점 세부항목(intent/accuracy/reasoning/
 * tradeoff)을 절대 응답에 포함하지 않기로 확정했다 — score(0~25, IS-002)와 totalScore(0~100),
 * feedback 문장만 내려온다 (docs/api/api-contract.md, docs/ai/owners/choi-yongseong.md 체크리스트
 * "세부 점수는 API·화면에 노출하지 않는다" 참고). 이 타입은 mock 전용이며, 실제 연동 시에는
 * evaluations[]({questionId, score, feedback})+totalScore 중심으로 다시 설계해야 한다.
 */
export interface EvaluationDetail {
  intent: number;
  accuracy: number;
  reasoning: number;
  tradeoff: number;
  total: number;
  feedback: string;
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
  evaluation: EvaluationDetail | null; // Null if just starting or fetching questions without evaluation
  passed: boolean;
  nextTurn: NextTurn;
  questions?: Question[]; // Provided on initial load or follow-up
}
