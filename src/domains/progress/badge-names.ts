/** Stage별 뱃지 표시명 — Stage1은 가입 기본, Stage2~5는 면접관 직급에 대응한다. */
export const BADGE_STAGE_NAMES = [
  '인턴머쓱', // 가입 직후
  '대리머쓱', // 널널한 대리
  '과장머쓱', // 깐깐한 과장
  '부장머쓱', // 압박 부장
  '임원머쓱', // 이중인격 임원
] as const;

/** Stage 번호(1~5)에 대응하는 직급형 뱃지명을 반환한다. */
export function badgeNameForStage(stage: number, fallback = '현재 뱃지'): string {
  return BADGE_STAGE_NAMES[stage - 1] ?? fallback;
}
