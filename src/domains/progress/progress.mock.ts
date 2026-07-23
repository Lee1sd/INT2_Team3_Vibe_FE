// 백엔드 게이지/뱃지 API가 준비되기 전까지 결과 화면을 검증하기 위한 목업 구현.
import { selectAcquiredBadges } from './progress.badges';
import { GaugeUpdate, UserBadge } from './progress.types';

const MOCK_BADGE_CATALOG: UserBadge[] = [1, 2, 3, 4].map((stage) => ({
  badgeId: stage,
  stage,
  name: `프로그래머쓱 LEVEL ${stage}`,
  imageUrl: `/badges/Level${stage}.png`,
  acquired: stage === 1,
  acquiredAt: stage === 1 ? '2026-07-21T00:00:00Z' : null,
}));

export const progressMock = {
  /** Mock 화면에서는 Stage1 뱃지를 보유한 가입 직후 상태를 반환한다. */
  getMyBadges: async () => selectAcquiredBadges(MOCK_BADGE_CATALOG),

  /** Mock 마이페이지에서도 잠금 Stage의 실제 이미지 경로를 포함한 도감을 반환한다. */
  getBadgeCatalog: async () => MOCK_BADGE_CATALOG,

  /** Mock 모드에서는 고정 결과를 사용하므로 별도 스냅샷을 저장하지 않는다. */
  captureSnapshot: async (_sessionId: string): Promise<void> => undefined,

  /** 결과 화면에서 사용할 진행도와 신규 뱃지 예시를 반환한다. */
  getGaugeUpdate: async (sessionId: string): Promise<GaugeUpdate> => {
    console.log('Fetching gauge update for session', sessionId);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          previousGauge: 30,
          newGauge: 60,
          levelUp: true,
          unlockedLevel: 2,
          newlyAcquiredBadge: {
            badgeId: 2,
            stage: 2,
            name: '프로그래머쓱 LEVEL 2',
            imageUrl: null,
            acquired: true,
            acquiredAt: '2026-07-21T00:00:00Z',
          },
        });
      }, 1000);
    });
  },
};
