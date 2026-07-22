// 백엔드 게이지/뱃지 API가 준비되기 전까지 결과 화면을 검증하기 위한 목업 구현.
import { GaugeUpdate } from './progress.types';

export const progressMock = {
  /** Mock 화면에서는 Stage1 뱃지를 보유한 가입 직후 상태를 반환한다. */
  getMyBadges: async () => [
    {
      badgeId: 1,
      stage: 1,
      name: '프로그래머쓱 LEVEL 1',
      imageUrl: null,
      acquiredAt: '2026-07-21T00:00:00Z',
    },
  ],

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
            acquiredAt: '2026-07-21T00:00:00Z',
          },
        });
      }, 1000);
    });
  },
};
