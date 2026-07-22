// 백엔드 domain.progress 실제 엔드포인트 연동 구현.
// 근거: docs/api/api-spec.md UM-001, BG-001.
import { apiClient } from '../../api/client';
import { UserBadge } from './progress.types';

export interface ProgressApiResponse {
  unlockedLevel: number;
  progressGauge: number;
}

export const progressApi = {
  /** UM-001 */
  getProgress: (): Promise<ProgressApiResponse> => apiClient.get('/api/users/me/progress'),

  /** BG-001 */
  getMyBadges: (): Promise<{ badges: UserBadge[] }> => apiClient.get('/api/badges/me'),
};
