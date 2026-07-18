// 페이지 컴포넌트가 실제로 import하는 진입점.
// VITE_USE_MOCK 환경변수로 mock(auth.mock.ts) / 실제 API(auth.api.ts) 구현을 스위칭한다.
// 백엔드 domain.auth 엔드포인트가 배포되면 .env의 VITE_USE_MOCK=false 로 바꾸기만 하면 된다.
import { authApi } from './auth.api';
import { authMock } from './auth.mock';
import { setAccessToken } from '../../api/client';
import { User } from './auth.types';

interface AuthService {
  login: () => Promise<{ user: User } | void>;
  getCurrentUser: () => Promise<User>;
  setHasResume: (hasResume: boolean) => void;
  logout: () => Promise<void>;
  withdraw: () => Promise<void>;
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const realAuthService: AuthService = {
  login: async () => {
    // AU-001: 브라우저를 백엔드로 이동시키면 구글 로그인 → 콜백 → JWT 발급까지 백엔드가 처리한다.
    // (fetch가 아니라 페이지 이동이라 이 함수는 정상적으로 값을 반환하지 않는다.)
    window.location.href = authApi.googleLoginUrl;
  },
  getCurrentUser: authApi.getCurrentUser,
  setHasResume: () => {
    // 백엔드 명세에는 이 개념이 없다. 이력서 보유 여부는 RS-002(파싱 상태 조회) 결과로 판단해야 한다.
  },
  logout: async () => {
    await authApi.logout();
    setAccessToken(null);
  },
  withdraw: async () => {
    throw new Error('회원 탈퇴 API가 아직 api-spec.md에 정의되어 있지 않습니다. 백엔드팀에 확인하세요.');
  },
};

export const authService: AuthService = USE_MOCK ? authMock : realAuthService;
