// 백엔드 domain.auth 실제 엔드포인트 연동 구현.
// 근거: INT2_Team3_Vibe_BE/docs/api/api-spec.md AU-001~004, UP-001~003, ADR-017.
// 프로필 이미지: POST /api/users/me/photo (multipart) — BE ADR-018 예정 계약.
import { apiClient } from '../../api/client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/** UP-003 — GET /api/users/me 응답 (BE UserResponse). */
export interface UserMeApiResponse {
  id: number;
  name: string;
  email: string;
  /** 없으면 null/생략. presigned GET 또는 조회용 URL. */
  photoUrl?: string | null;
}

export interface ProfilePhotoUploadResponse {
  photoUrl: string;
}

export const authApi = {
  /**
   * AU-001은 브라우저를 이 주소로 이동(location.href = ...)시키는 용도다.
   * fetch로 호출하는 API가 아니라 "302 리다이렉트 체인의 시작점"이라는 점에 주의.
   */
  googleLoginUrl: `${API_BASE_URL}/api/auth/oauth2/google`,

  /**
   * AU-002(구글 콜백)는 브라우저가 자동으로 이동하는 리다이렉트라 프론트가 직접 fetch로
   * 호출하지 않는다. 백엔드는 콜백 처리가 끝나면 `/oauth/callback#accessToken=...`으로
   * 프론트를 리다이렉트하고(쿼리 파라미터가 아니라 URL fragment — ADR-017 참고), 프론트는
   * `src/pages/OAuthCallback.tsx`에서 그 값을 읽어 setAccessToken을 호출한다
   * (refreshToken은 별도로 HttpOnly 쿠키에 담겨 전달됨).
   */

  /**
   * AU-003 — Access Token 재발급 (Refresh Token은 쿠키로 자동 전송).
   * 앱 부트/401 재시도의 기본 경로는 `api/client.ts`의 restoreSession·tryRefresh다.
   * 이 메서드는 명시적 재발급이 필요할 때 사용한다.
   */
  refresh: (): Promise<{ accessToken: string }> => apiClient.post('/api/auth/refresh'),

  /** AU-004 — 로그아웃. */
  logout: (): Promise<{ message: string }> => apiClient.post('/api/auth/logout'),

  /** UP-003 — 로그인한 유저 프로필 조회. */
  getMe: (): Promise<UserMeApiResponse> => apiClient.get('/api/users/me'),

  /** UP-001 — 마이페이지 이름 수정. */
  updateName: (name: string): Promise<{ id: number; name: string }> =>
    apiClient.patch('/api/users/me', { name }),

  /**
   * UP-004 — 프로필 이미지 업로드. multipart field name: `photo` (BE ADR-020)
   * BE: S3 PutObject 후 photoUrl(presigned GET) 반환.
   */
  uploadProfilePhoto: (file: File): Promise<ProfilePhotoUploadResponse> => {
    const formData = new FormData();
    formData.append('photo', file);
    return apiClient.postForm('/api/users/me/photo', formData);
  },

  /** 프로필 이미지 삭제 (선택 API). */
  deleteProfilePhoto: (): Promise<{ message: string }> =>
    apiClient.delete('/api/users/me/photo'),

  /** UP-002 — 회원 탈퇴. */
  withdraw: (): Promise<{ message: string }> => apiClient.delete('/api/users/me'),
};
