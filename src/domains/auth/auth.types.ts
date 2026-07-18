// 백엔드 domain.auth 패키지(표지민 담당)와 짝을 이루는 타입 정의.
// 근거: INT2_Team3_Vibe_BE/docs/api/api-spec.md AU-001~004, UP-001 / docs/erd/entity-definition.md User.

export interface User {
  id: string;
  name: string;
  level: number;
  gauge: number; // 0 to 100
  hasResume?: boolean;
  // 마이페이지(MyPage.tsx)에서 이미 사용 중인 필드. 백엔드 User 엔티티(googleId/email/name)와
  // 실제 API 응답 형태가 확정되면 아래 필드명이 맞는지 다시 확인해야 한다.
  email?: string;
  displayName?: string;
  photoURL?: string;
}

/** AU-002 콜백 응답 형태. */
export interface AuthCallbackResponse {
  accessToken: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}
