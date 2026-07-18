// 백엔드 /api/auth/*, /api/users/me 가 준비되기 전까지 화면 흐름을 검증하기 위한 목업 구현.
// 실제 구현은 auth.api.ts, 어느 쪽을 쓸지는 auth.service.ts에서 결정한다.
import { User } from './auth.types';

let memoryHasResume = false;

export const authMock = {
  login: async (): Promise<{ user: User }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let hasResume = memoryHasResume;
        try {
          if (localStorage.getItem('hasResume') === 'true') hasResume = true;
        } catch (e) {}

        resolve({
          user: {
            id: 'u1',
            name: '주니어 머쓱이',
            level: 1,
            gauge: 30,
            hasResume,
          },
        });
      }, 1000);
    });
  },

  getCurrentUser: async (): Promise<User> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let hasResume = memoryHasResume;
        try {
          if (localStorage.getItem('hasResume') === 'true') hasResume = true;
        } catch (e) {}

        resolve({
          id: 'u1',
          name: '주니어 머쓱이',
          level: 1,
          gauge: 30,
          hasResume,
        });
      }, 500);
    });
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

  withdraw: async (): Promise<void> => {
    return new Promise((resolve) => {
      memoryHasResume = false;
      try {
        localStorage.removeItem('hasResume');
      } catch (e) {}
      setTimeout(() => resolve(), 500);
    });
  },
};
