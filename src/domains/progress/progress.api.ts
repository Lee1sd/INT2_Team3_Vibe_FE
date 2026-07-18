// 백엔드 domain.progress 실제 엔드포인트 연동 구현.
// 근거: docs/api/api-spec.md UM-001, BG-001.
// 백엔드 컨트롤러가 아직 구현되지 않았으므로(2026-07-15 기준) 지금 호출하면 404가 난다.
import { apiClient } from '../../api/client';

export interface ProgressApiResponse {
  unlockedLevel: number;
  progressGauge: number;
}

export interface BadgeApiItem {
  badgeId: number;
  stage: number;
  name: string;
  imageUrl: string;
  acquiredAt: string;
}

export const progressApi = {
  /** UM-001 */
  getProgress: (): Promise<ProgressApiResponse> => apiClient.get('/api/users/me/progress'),

  /** BG-001 */
  getMyBadges: (): Promise<{ badges: BadgeApiItem[] }> => apiClient.get('/api/badges/me'),
};
