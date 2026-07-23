import { InterviewResponse } from './interview.types';

export type InterviewerTone = 'lenient' | 'strict';

export function getSessionFeedback(session: InterviewResponse): string {
  if (session.overallFeedback) return session.overallFeedback;

  const targetQuestionId = session.weakestQuestionId ?? session.nextTurn.questionId;
  const targetEvaluation = targetQuestionId
    ? session.evaluations?.find((evaluation) => evaluation.questionId === targetQuestionId)
    : undefined;

  return targetEvaluation?.feedback ?? session.evaluations?.find((evaluation) => evaluation.feedback)?.feedback ?? '';
}

export function getInterviewerTone(level: number): InterviewerTone {
  return level >= 2 ? 'strict' : 'lenient';
}

export function createInterviewClosingMessage(tone: InterviewerTone): string {
  if (tone === 'strict') {
    return '수고하셨습니다. 상세 평가는 결과지를 참고하시기 바랍니다.';
  }

  return '수고하셨어요~ 오늘 답변 잘 들었습니다. 자세한 평가는 결과지에서 확인해보세요~';
}
