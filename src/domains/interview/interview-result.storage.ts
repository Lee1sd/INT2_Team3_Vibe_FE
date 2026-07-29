import { InterviewPostSubmitError } from './submit-failure';
import { FinalInterviewResult, InterviewResponse } from './interview.types';

const RESULT_STORAGE_PREFIX = 'career-dungeon:interview-result:';

/**
 * 최종 판정 evaluations의 최소 개수 — 본문항 1 + 꼬리질문 1.
 * 정확한 개수는 세션마다 다르므로(문항 수 변경 — BE 저장소 INT2_Team3_Vibe_BE의 #146),
 * 개수를 알 수 있는 호출 측만
 * expectedEvaluationCount로 정확히 검사하고 그 외에는 이 하한만 본다.
 */
const MIN_FINAL_EVALUATION_COUNT = 2;

/**
 * 최종 판정 응답의 evaluations 개수를 본문항 수에서 유도한다. (#95)
 *
 * 최종 판정에는 본문항 N개와 꼬리질문 1개의 평가가 모두 담기므로 N+1이다.
 * 개수를 하드코딩하면 문항 수 변경(BE 저장소 INT2_Team3_Vibe_BE의 #146: 3→4문항)
 * 때마다 게이트가 깨진다 —
 * getFollowUpQuestionId와 같은 이유로 동적 계산한다.
 */
export function getFinalEvaluationCount(mainQuestionCount: number): number {
  return mainQuestionCount + 1;
}

function hasExpectedEvaluationCount(actual: number, expected: number | undefined): boolean {
  return expected === undefined ? actual >= MIN_FINAL_EVALUATION_COUNT : actual === expected;
}

/**
 * 저장소나 라우터에서 읽은 값이 최종 판정 계약을 만족하는지 확인한다.
 *
 * expectedEvaluationCount를 주면 개수를 정확히 검사한다. 생략하면(저장소/라우터에서
 * 읽어 본문항 수를 알 수 없는 경우) 하한과 구조 정합성만 검사한다.
 */
export function isFinalInterviewResult(
  value: unknown,
  expectedEvaluationCount?: number,
): value is FinalInterviewResult {
  if (!value || typeof value !== 'object') return false;

  const result = value as Partial<FinalInterviewResult>;
  if (!Array.isArray(result.evaluations)) return false;
  if (!hasExpectedEvaluationCount(result.evaluations.length, expectedEvaluationCount)) return false;
  if (!Number.isInteger(result.totalScore) || result.totalScore! < 0 || result.totalScore! > 100) return false;
  if (typeof result.passed !== 'boolean' || result.passed !== (result.totalScore! >= 80)) return false;
  if (typeof result.overallFeedback !== 'string' || !result.overallFeedback.trim()) return false;

  const evaluationsValid = result.evaluations.every((evaluation) => (
    evaluation
    && typeof evaluation.questionId === 'string'
    && Number.isInteger(evaluation.score)
    && evaluation.score >= 0
    && evaluation.score <= 25
    && (evaluation.feedback === undefined || typeof evaluation.feedback === 'string')
  ));
  const questionIds = new Set(result.evaluations.map((evaluation) => evaluation.questionId));
  return evaluationsValid && questionIds.size === result.evaluations.length;
}

/** IS-002b 화면 응답에서 검증된 최종 판정 데이터만 분리한다. */
export function toFinalInterviewResult(
  response: InterviewResponse,
  expectedEvaluationCount?: number,
): FinalInterviewResult {
  const candidate: FinalInterviewResult = {
    evaluations: response.evaluations ?? [],
    totalScore: response.totalScore ?? Number.NaN,
    passed: response.passed,
    overallFeedback: response.overallFeedback ?? '',
  };

  if (!isFinalInterviewResult(candidate, expectedEvaluationCount)) {
    // 서버는 이미 답변을 받아들인 상태다 — 제출 실패가 아니라 후처리 실패로 구분한다. (#95)
    throw new InterviewPostSubmitError('최종 채점 응답이 IS-002b 계약을 충족하지 않습니다.');
  }

  return candidate;
}

/** 결과 페이지 새로고침에 대비해 현재 탭의 sessionStorage에 최종 판정을 보관한다. */
export function saveFinalInterviewResult(sessionId: string, result: FinalInterviewResult): void {
  try {
    sessionStorage.setItem(`${RESULT_STORAGE_PREFIX}${sessionId}`, JSON.stringify(result));
  } catch {
    // 저장소가 차단돼도 동일 화면 전환의 route state로 결과를 전달할 수 있다.
  }
}

/** 세션별로 보관한 최종 판정을 읽고 스키마가 어긋난 값은 사용하지 않는다. */
export function loadFinalInterviewResult(sessionId: string): FinalInterviewResult | null {
  try {
    const serialized = sessionStorage.getItem(`${RESULT_STORAGE_PREFIX}${sessionId}`);
    if (!serialized) return null;

    const parsed: unknown = JSON.parse(serialized);
    return isFinalInterviewResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
