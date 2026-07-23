import { FinalInterviewResult, InterviewResponse } from './interview.types';

const RESULT_STORAGE_PREFIX = 'career-dungeon:interview-result:';

/** 저장소나 라우터에서 읽은 값이 최종 판정 계약을 만족하는지 확인한다. */
export function isFinalInterviewResult(value: unknown): value is FinalInterviewResult {
  if (!value || typeof value !== 'object') return false;

  const result = value as Partial<FinalInterviewResult>;
  if (!Array.isArray(result.evaluations) || result.evaluations.length !== 4) return false;
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
  return evaluationsValid && questionIds.size === 4;
}

/** IS-002b 화면 응답에서 검증된 최종 판정 데이터만 분리한다. */
export function toFinalInterviewResult(response: InterviewResponse): FinalInterviewResult {
  const candidate: FinalInterviewResult = {
    evaluations: response.evaluations ?? [],
    totalScore: response.totalScore ?? Number.NaN,
    passed: response.passed,
    overallFeedback: response.overallFeedback ?? '',
  };

  if (!isFinalInterviewResult(candidate)) {
    throw new Error('최종 채점 응답이 IS-002b 계약을 충족하지 않습니다.');
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
