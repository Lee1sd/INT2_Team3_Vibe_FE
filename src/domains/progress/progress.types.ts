// 백엔드 domain.progress/judgment 패키지(최용성 담당)와 짝을 이루는 타입.
// 근거: docs/api/api-spec.md UM-001, BG-001.
// UM-001 절대값과 BG-001 목록을 면접 전후로 비교해 화면에 필요한 변화량을 만든다.
export interface UserBadge {
  badgeId: number;
  stage: number;
  name: string;
  imageUrl: string | null;
  acquired: boolean;
  acquiredAt: string | null;
}

export interface GaugeUpdate {
  previousGauge: number;
  newGauge: number;
  levelUp: boolean;
  unlockedLevel: number;
  newlyAcquiredBadge?: UserBadge;
}
