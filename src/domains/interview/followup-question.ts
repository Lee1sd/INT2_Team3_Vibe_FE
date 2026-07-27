/**
 * 꼬리질문(follow-up) 답변 제출 시 BE에 보낼 외부 questionId를 계산한다. (#93)
 *
 * 꼬리질문은 본문항 다음 번호(N+1)를 questionId로 갖는다. 하드코딩하지 않고
 * 평가된 본문항 수(N)에서 유도해, #146(3문항→4문항, turn4→turn5) 같은 문항 수
 * 변경에도 자동 대응한다. BE는 turn 번호 불일치 시 400(INTERVIEW_ANSWER_TURNS_INVALID)을 낸다.
 */
export function getFollowUpQuestionId(mainQuestionCount: number): string {
  return String(mainQuestionCount + 1);
}
