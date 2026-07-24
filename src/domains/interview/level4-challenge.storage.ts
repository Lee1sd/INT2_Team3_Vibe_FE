import { ChallengeFinalResult } from './interview.types';

const RESULT_STORAGE_PREFIX = 'career-dungeon:challenge-result:';

export function isChallengeFinalResult(value: unknown): value is ChallengeFinalResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<ChallengeFinalResult>;
  if (result.mode !== 'level4-challenge') return false;
  if (!Array.isArray(result.evaluations)) return false;
  if (!Number.isInteger(result.totalScore) || result.totalScore! < 0 || result.totalScore! > 100) return false;
  if (typeof result.passed !== 'boolean') return false;
  if (typeof result.overallFeedback !== 'string' || !result.overallFeedback.trim()) return false;
  if (!Number.isInteger(result.challengeGauge) || result.challengeGauge! < 0 || result.challengeGauge! > 100) return false;
  if (!Number.isInteger(result.utteranceCount) || result.utteranceCount! < 0) return false;
  if (result.endReason !== 'PASS' && result.endReason !== 'FAIL' && result.endReason !== 'MAX_UTTERANCES') return false;
  if (typeof result.closingMessage !== 'string' || !result.closingMessage.trim()) return false;
  return result.evaluations.every((evaluation) => (
    evaluation
    && typeof evaluation.questionId === 'string'
    && Number.isInteger(evaluation.score)
    && evaluation.score >= 0
    && evaluation.score <= 25
    && (evaluation.feedback === undefined || typeof evaluation.feedback === 'string')
  ));
}

export function saveChallengeFinalResult(sessionId: string, result: ChallengeFinalResult): void {
  try {
    sessionStorage.setItem(`${RESULT_STORAGE_PREFIX}${sessionId}`, JSON.stringify(result));
  } catch {
    // route state로도 전달 가능
  }
}

export function loadChallengeFinalResult(sessionId: string): ChallengeFinalResult | null {
  try {
    const serialized = sessionStorage.getItem(`${RESULT_STORAGE_PREFIX}${sessionId}`);
    if (!serialized) return null;
    const parsed: unknown = JSON.parse(serialized);
    return isChallengeFinalResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isLevel4ChallengeSessionId(sessionId: string | undefined | null): boolean {
  return Boolean(sessionId && sessionId.startsWith('lv4_'));
}
