/** 현재 표준 면접의 레벨별 합격선을 반환한다. Lv.3 이상은 MVP 기본값 80점을 사용한다. */
export function getInterviewPassingScore(level: number | null | undefined): number {
  return level === 1 ? 60 : 80;
}
