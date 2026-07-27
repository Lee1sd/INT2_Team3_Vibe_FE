// 백엔드 /api/auth/*, /api/users/me 가 준비되기 전까지 화면 흐름을 검증하기 위한 목업 구현.
// 실제 구현은 auth.api.ts, 어느 쪽을 쓸지는 auth.service.ts에서 결정한다.
import { setAccessToken } from '../../api/client';
import { clearReturnUrl } from './return-url';
import { User } from './auth.types';

/** RequireAuth가 getAccessToken()으로 가드하므로 mock도 가짜 토큰을 맞춘다. */
const MOCK_ACCESS_TOKEN = 'mock-access-token';

let memoryHasResume = false;
let memoryName = '주니어 머쓱이';
let memoryPhotoUrl: string | undefined;
let memoryPhotoObjectUrl: string | undefined;

function currentMockUser(): User {
  let hasResume = memoryHasResume;
  try {
    if (localStorage.getItem('hasResume') === 'true') hasResume = true;
  } catch (e) {}

  return {
    id: 'u1',
    name: memoryName,
    displayName: memoryName,
    level: 1,
    gauge: 30,
    hasResume,
    email: 'mock@careerdungeon.local',
    photoUrl: memoryPhotoUrl,
    photoURL: memoryPhotoUrl,
  };
}

export const authMock = {
  /**
   * mock에는 refresh 쿠키가 없다. 이전에 mock 로그인한 적이 있으면 메모리 토큰을 유지하고,
   * 없으면 미로그인으로 둔다(RequireAuth → 로그인 화면).
   */
  restoreSession: async (_signal?: AbortSignal): Promise<boolean> => {
    // AuthBootstrap만 기다리게 하고, 토큰은 login에서만 발급한다.
    return false;
  },

  login: async (): Promise<{ user: User }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setAccessToken(MOCK_ACCESS_TOKEN);
        resolve({ user: currentMockUser() });
      }, 1000);
    });
  },

  getCurrentUser: async (): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(currentMockUser()), 500);
    });
  },

  updateName: async (name: string): Promise<{ id: number; name: string }> => {
    memoryName = name;
    return { id: 1, name };
  },

  uploadProfilePhoto: async (file: File): Promise<{ photoUrl: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (memoryPhotoObjectUrl) {
          URL.revokeObjectURL(memoryPhotoObjectUrl);
        }
        memoryPhotoObjectUrl = URL.createObjectURL(file);
        memoryPhotoUrl = memoryPhotoObjectUrl;
        resolve({ photoUrl: memoryPhotoUrl });
      }, 400);
    });
  },

  deleteProfilePhoto: async (): Promise<void> => {
    if (memoryPhotoObjectUrl) {
      URL.revokeObjectURL(memoryPhotoObjectUrl);
      memoryPhotoObjectUrl = undefined;
    }
    memoryPhotoUrl = undefined;
  },

  setHasResume: (hasResume: boolean) => {
    memoryHasResume = hasResume;
    try {
      localStorage.setItem('hasResume', String(hasResume));
    } catch (e) {}
  },

  logout: async (): Promise<void> => {
    return new Promise((resolve) => {
      memoryHasResume = false;
      setAccessToken(null);
      clearReturnUrl();
      try {
        localStorage.removeItem('hasResume');
      } catch (e) {}
      setTimeout(() => resolve(), 500);
    });
  },

  // mock 상에서는 탈퇴와 로그아웃이 동일한 로컬 상태 초기화만 하면 되므로 logout을 재사용한다.
  withdraw: async (): Promise<void> => {
    return authMock.logout();
  },
};
