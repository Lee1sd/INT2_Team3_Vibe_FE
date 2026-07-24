// 백엔드 /api/auth/*, /api/users/me 가 준비되기 전까지 화면 흐름을 검증하기 위한 목업 구현.
// 실제 구현은 auth.api.ts, 어느 쪽을 쓸지는 auth.service.ts에서 결정한다.
import { User } from './auth.types';

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
  /** mock에는 refresh 쿠키가 없으므로 항상 세션 복구 성공으로 본다. */
  restoreSession: async (_signal?: AbortSignal): Promise<boolean> => true,

  login: async (): Promise<{ user: User }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
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
