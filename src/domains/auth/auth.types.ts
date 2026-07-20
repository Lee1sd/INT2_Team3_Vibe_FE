// 백엔드 domain.auth 패키지(표지민 담당)와 짝을 이루는 타입 정의.
// 근거: INT2_Team3_Vibe_BE/docs/api/api-spec.md AU-001~004, UP-001~003 / docs/erd/entity-definition.md User.
// level/gauge는 UP-003이 아니라 UM-001(/api/users/me/progress) 값을 auth.service에서 합친다.

export interface User {
  id: string;
  name: string;
  level: number;
  gauge: number; // 0 to 100
  hasResume?: boolean;
  email?: string;
  displayName?: string;
  photoURL?: string;
}
