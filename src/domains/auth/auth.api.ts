// 백엔드 domain.auth 실제 엔드포인트 연동 구현.
// 근거: INT2_Team3_Vibe_BE/docs/api/api-spec.md AU-001~004, UP-001.
// 백엔드 컨트롤러가 아직 하나도 구현되지 않았으므로(2026-07-15 기준), 이 파일의 함수들은
// "명세는 있지만 실제로 호출하면 404/미구현"인 상태다. 백엔드 배포가 끝나면 VITE_USE_MOCK=false로
// 전환해 이 구현을 실제로 사용한다.
import { apiClient } from '../../api/client';
import { User } from './auth.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const authApi = {
  /**
   * AU-001은 브라우저를 이 주소로 이동(location.href = ...)시키는 용도다.
   * fetch로 호출하는 API가 아니라 "302 리다이렉트 체인의 시작점"이라는 점에 주의.
   */
  googleLoginUrl: `${API_BASE_URL}/api/auth/oauth2/google`,

  /**
   * AU-002(구글 콜백)는 브라우저가 자동으로 이동하는 리다이렉트라 프론트가 직접 fetch로
   * 호출하지 않는다. 문제는 콜백 처리가 끝난 뒤 백엔드가 accessToken을 프론트에 어떻게
   * 전달할지가 api-spec.md에 아직 명시되어 있지 않다는 점이다 (쿼리 파라미터로 붙여서
   * 프론트 페이지로 리다이렉트 / 별도 프론트 콜백 페이지에서 재조회 등 여러 방식이 가능).
   * 표지민(백엔드 인증 담당)에게 확인 후 이 자리에 실제 처리 로직(예: URL의 accessToken을
   * 읽어 setAccessToken 호출)을 채워야 한다.
   */

  /** AU-003 — Access Token 재발급 (Refresh Token은 쿠키로 자동 전송). */
  refresh: (): Promise<{ accessToken: string }> => apiClient.post('/api/auth/refresh'),

  /** AU-004 — 로그아웃. */
  logout: (): Promise<{ message: string }> => apiClient.post('/api/auth/logout'),

  /** UP-001 — 마이페이지 이름 수정. */
  updateName: (name: string): Promise<{ id: number; name: string }> =>
    apiClient.patch('/api/users/me', { name }),

  /**
   * 로그인한 유저 정보를 다시 조회하는 GET 엔드포인트가 api-spec.md에 없다.
   * (AU-002 응답에는 user가 포함되지만, 새로고침 후 다시 조회할 방법이 명세에 없음)
   * 이 자리는 백엔드팀과 협의해 예: GET /api/users/me 추가가 필요하다.
   */
  getCurrentUser: (): Promise<User> => {
    throw new Error(
      'GET /api/users/me 같은 프로필 조회 API가 아직 api-spec.md에 없습니다. 백엔드팀(표지민)에게 확인하세요.'
    );
  },
};
