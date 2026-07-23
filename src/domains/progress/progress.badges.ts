import { UserBadge } from './progress.types';

/** 전체 뱃지 도감에서 실제 획득한 항목만 Stage 오름차순으로 선택한다. */
export function selectAcquiredBadges(badges: UserBadge[]): UserBadge[] {
  return badges
    .filter((badge) => badge.acquired)
    .sort((left, right) => left.stage - right.stage);
}
