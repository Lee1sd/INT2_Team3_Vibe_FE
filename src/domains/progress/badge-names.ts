/** Stage별 뱃지 표시명 — 마이페이지·메인 도감이 같은 카피를 쓴다. */
export const BADGE_STAGE_NAMES = [
  '인턴머쓱',
  '대리머쓱',
  '과장머쓱',
  '팀장머쓱',
  '프로그래머쓱',
] as const;

/** Stage 번호(1~5)에 대응하는 직급형 뱃지명을 반환한다. */
export function badgeNameForStage(stage: number, fallback = '현재 뱃지'): string {
  return BADGE_STAGE_NAMES[stage - 1] ?? fallback;
}
