import { BadgeApiItem, BadgeListResponse, UserBadge } from './progress.types';

/** 구 응답은 acquiredAt 존재 여부로 획득 상태를 복원하고 신 응답은 acquired를 우선한다. */
export function normalizeBadges(badges: BadgeApiItem[]): UserBadge[] {
  return badges.map((badge) => ({
    ...badge,
    acquired: badge.acquired ?? (badge.acquiredAt !== null),
  }));
}

/** 전체 뱃지 목록에서 실제 획득한 항목만 Stage 오름차순으로 선택한다. */
export function selectAcquiredBadges(badges: BadgeApiItem[]): UserBadge[] {
  return normalizeBadges(badges)
    .filter((badge) => badge.acquired)
    .sort((left, right) => left.stage - right.stage);
}

/** 신 응답의 catalog를 우선하고 구 응답에서는 기존 badges를 도감 대체값으로 사용한다. */
export function selectBadgeCatalog(response: BadgeListResponse): UserBadge[] {
  return normalizeBadges(response.catalog ?? response.badges);
}
