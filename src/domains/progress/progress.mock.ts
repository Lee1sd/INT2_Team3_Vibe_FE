// 백엔드 게이지/뱃지 API가 준비되기 전까지 결과 화면을 검증하기 위한 목업 구현.
import { GaugeUpdate } from './progress.types';

export const progressMock = {
  /** Fetches the updated gauge and unlock status after a completed interview session. */
  getGaugeUpdate: async (sessionId: string): Promise<GaugeUpdate> => {
    console.log('Fetching gauge update for session', sessionId);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          previousGauge: 30,
          newGauge: 100,
          levelUp: true,
          unlockedInterviewerId: 'iv2',
        });
      }, 1000);
    });
  },
};
