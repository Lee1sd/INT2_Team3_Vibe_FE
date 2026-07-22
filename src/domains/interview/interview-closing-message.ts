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
  return level === 2 ? 'strict' : 'lenient';
}

export function createInterviewClosingMessage(session: InterviewResponse, tone: InterviewerTone): string {
  const feedback = getSessionFeedback(session).trim() || '면접 내용을 기준으로 평가를 정리했습니다.';

  if (tone === 'strict') {
    return `답변 잘 들었습니다. ${feedback}\n자세한 평가는 결과지를 참고하시죠.`;
  }

  return `수고하셨어요~ ${feedback}\n자세한 건 결과지에서 확인해보세요!`;
}
