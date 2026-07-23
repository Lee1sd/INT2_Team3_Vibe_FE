// 페이지 컴포넌트가 실제로 import하는 진입점. VITE_USE_MOCK으로 mock/실제 API를 스위칭한다.
import { progressMock } from './progress.mock';
import { progressApi } from './progress.api';
import { GaugeUpdate, UserBadge } from './progress.types';

interface ProgressService {
  captureSnapshot: (sessionId: string) => Promise<void>;
  getGaugeUpdate: (sessionId: string) => Promise<GaugeUpdate>;
  getMyBadges: () => Promise<UserBadge[]>;
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
const SNAPSHOT_STORAGE_PREFIX = 'career-dungeon:progress-snapshot:';

interface ProgressSnapshot {
  unlockedLevel: number;
  progressGauge: number;
  badgeIds: number[];
}

/** 면접 시작 시점의 진행도와 보유 뱃지를 세션별로 기록한다. */
function saveSnapshot(sessionId: string, snapshot: ProgressSnapshot): void {
  sessionStorage.setItem(`${SNAPSHOT_STORAGE_PREFIX}${sessionId}`, JSON.stringify(snapshot));
}

/** 결과 조회 시 비교할 면접 시작 시점의 스냅샷을 복원한다. */
function loadSnapshot(sessionId: string): ProgressSnapshot | null {
  try {
    const serialized = sessionStorage.getItem(`${SNAPSHOT_STORAGE_PREFIX}${sessionId}`);
    if (!serialized) return null;

    const parsed = JSON.parse(serialized) as Partial<ProgressSnapshot>;
    if (!Number.isInteger(parsed.unlockedLevel) || !Number.isInteger(parsed.progressGauge)) return null;
    if (parsed.unlockedLevel! < 1 || parsed.unlockedLevel! > 4) return null;
    if (parsed.progressGauge! < 0 || parsed.progressGauge! > 100) return null;
    if (!Array.isArray(parsed.badgeIds) || !parsed.badgeIds.every(Number.isInteger)) return null;

    return parsed as ProgressSnapshot;
  } catch {
    return null;
  }
}

const realProgressService: ProgressService = {
  /** 마이페이지가 BG-001의 S3 이미지 URL을 그대로 사용할 수 있도록 목록을 노출한다. */
  getMyBadges: async () => (await progressApi.getMyBadges()).badges,

  captureSnapshot: async (sessionId) => {
    const [progress, badgeList] = await Promise.all([
      progressApi.getProgress(),
      progressApi.getMyBadges(),
    ]);

    saveSnapshot(sessionId, {
      unlockedLevel: progress.unlockedLevel,
      progressGauge: progress.progressGauge,
      badgeIds: badgeList.badges.map((badge) => badge.badgeId),
    });
  },

  getGaugeUpdate: async (sessionId) => {
    const [progress, badgeList] = await Promise.all([
      progressApi.getProgress(),
      progressApi.getMyBadges(),
    ]);
    const snapshot = loadSnapshot(sessionId);
    const previousBadgeIds = new Set(snapshot?.badgeIds ?? badgeList.badges.map((badge) => badge.badgeId));
    const newlyAcquiredBadge = badgeList.badges
      .filter((badge) => !previousBadgeIds.has(badge.badgeId))
      .sort((left, right) => right.stage - left.stage)[0];

    return {
      previousGauge: snapshot?.progressGauge ?? progress.progressGauge,
      newGauge: progress.progressGauge,
      levelUp: snapshot ? progress.unlockedLevel > snapshot.unlockedLevel : false,
      unlockedLevel: progress.unlockedLevel,
      newlyAcquiredBadge,
    };
  },
};

export const progressService: ProgressService = USE_MOCK ? progressMock : realProgressService;

// 기존 결과 화면 import와의 호환성을 유지한다.
export const evaluationService = progressService;
