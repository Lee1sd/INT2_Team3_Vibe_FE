// 백엔드 domain.auth 패키지(표지민 담당)와 짝을 이루는 타입 정의.
// 근거: INT2_Team3_Vibe_BE/docs/api/api-spec.md AU-001~004, UP-001~003 / docs/erd/entity-definition.md User.
// level/gauge는 UP-003이 아니라 UM-001(/api/users/me/progress) 값을 auth.service에서 합친다.
// photoUrl은 UP-003/프로필 업로드 응답의 presigned(또는 조회) URL이다.

export interface User {
  id: string;
  name: string;
  level: number;
  gauge: number; // 0 to 100
  hasResume?: boolean;
  email?: string;
  displayName?: string;
  /** 프로필 이미지 URL (BE `photoUrl`). */
  photoUrl?: string;
  /** @deprecated `photoUrl`을 사용한다. 하위 호환용. */
  photoURL?: string;
}

/** 프로필 이미지 업로드 FE 검증 (BE 계약과 맞춤). */
export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PROFILE_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PROFILE_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
