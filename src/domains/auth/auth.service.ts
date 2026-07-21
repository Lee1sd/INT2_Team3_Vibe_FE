// 페이지 컴포넌트가 실제로 import하는 진입점.
// VITE_USE_MOCK 환경변수로 mock(auth.mock.ts) / 실제 API(auth.api.ts) 구현을 스위칭한다.
import { authApi } from './auth.api';
import { authMock } from './auth.mock';
import { progressApi } from '../progress/progress.api';
import { restoreSession, setAccessToken } from '../../api/client';
import { User } from './auth.types';

interface AuthService {
  /** 앱 시작/새로고침 시 refresh 쿠키로 accessToken을 복구한다. */
  restoreSession: () => Promise<boolean>;
  login: () => Promise<{ user: User } | void>;
  getCurrentUser: () => Promise<User>;
  updateName: (name: string) => Promise<{ id: number; name: string }>;
  setHasResume: (hasResume: boolean) => void;
  logout: () => Promise<void>;
  withdraw: () => Promise<void>;
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/**
 * UP-003(프로필) + UM-001(진행도)를 화면용 User로 합친다.
 * level/gauge는 auth 응답에 없고 progress 도메인 값이므로, 진행도 조회 실패 시
 * 가입 직후 기본값(Lv.1 / 0)으로 둔다.
 */
async function fetchCurrentUser(): Promise<User> {
  const me = await authApi.getMe();

  let level = 1;
  let gauge = 0;
  try {
    const progress = await progressApi.getProgress();
    level = progress.unlockedLevel;
    gauge = progress.progressGauge;
  } catch (e) {
    console.error(e);
  }

  return {
    id: String(me.id),
    name: me.name,
    email: me.email,
    displayName: me.name,
    level,
    gauge,
  };
}

const realAuthService: AuthService = {
  restoreSession,
  login: async () => {
    // AU-001: 브라우저를 백엔드로 이동시키면 구글 로그인 → 콜백 → JWT 발급까지 백엔드가 처리한다.
    // (fetch가 아니라 페이지 이동이라 이 함수는 정상적으로 값을 반환하지 않는다.)
    window.location.href = authApi.googleLoginUrl;
  },
  getCurrentUser: fetchCurrentUser,
  updateName: (name: string) => authApi.updateName(name),
  setHasResume: () => {
    // 백엔드 명세에는 이 개념이 없다. 이력서 보유 여부는 RS-002(파싱 상태 조회) 결과로 판단해야 한다.
  },
  logout: async () => {
    // 로그아웃 API가 실패해도 로컬 accessToken은 항상 정리해야 무효한 토큰이 남지 않는다.
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
    }
  },
  withdraw: async () => {
    try {
      await authApi.withdraw();
    } finally {
      setAccessToken(null);
    }
  },
};

export const authService: AuthService = USE_MOCK ? authMock : realAuthService;
