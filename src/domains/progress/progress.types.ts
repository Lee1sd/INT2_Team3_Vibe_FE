// 백엔드 domain.progress/judgment 패키지(최용성 담당)와 짝을 이루는 타입.
// 근거: docs/api/api-spec.md UM-001, BG-001.
// UM-001 절대값과 BG-001 목록을 면접 전후로 비교해 화면에 필요한 변화량을 만든다.
export interface BadgeApiItem {
  badgeId: number;
  stage: number;
  name: string;
  imageUrl: string | null;
  acquired?: boolean;
  acquiredAt: string | null;
}

/** 화면 내부에서는 구·신 BG-001 응답을 정규화해 획득 상태를 항상 명시한다. */
export interface UserBadge extends BadgeApiItem {
  acquired: boolean;
}

/** 기존 badges 보유 목록과 새 catalog 전체 도감을 함께 수용하는 BG-001 응답이다. */
export interface BadgeListResponse {
  badges: BadgeApiItem[];
  catalog?: BadgeApiItem[];
}

export interface GaugeUpdate {
  previousGauge: number;
  newGauge: number;
  levelUp: boolean;
  unlockedLevel: number;
  newlyAcquiredBadge?: UserBadge;
}
