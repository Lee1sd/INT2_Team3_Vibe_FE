import { Question } from './interview.types';

const FOLLOW_UP_QUESTION_TURN = '5';

/**
 * IS-002b의 꼬리질문을 화면 질문으로 변환한다.
 * targetQuestionId는 최저점 원문항이므로 새 꼬리질문의 ID로 재사용하지 않는다.
 */
export function toFollowUpQuestion(content: string): Question {
  return {
    id: FOLLOW_UP_QUESTION_TURN,
    content,
    type: 'FOLLOW_UP',
  };
}
