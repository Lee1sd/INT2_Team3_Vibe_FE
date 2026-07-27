/**
 * 답변 제출 전 인증 상태를 점검하는 순수 함수. (#87)
 *
 * accessToken은 메모리에만 보관되므로(src/api/client.ts), 새로고침 후
 * restoreSession 미완(부트 안전 타이머 초과) 또는 배경 refresh 중에는 null이 될 수 있다.
 * 이때 제출하면 Authorization 헤더 없이 요청이 나가 401이 되므로, 미리 막고 안내한다.
 */
export interface SubmitPrecondition {
  canSubmit: boolean;
  notice?: string;
}

/** 토큰 미복구(null/빈 문자열) 시 제출을 막고 재시도 안내를 반환한다. */
export function evaluateSubmitPrecondition(token: string | null): SubmitPrecondition {
  if (!token) {
    return {
      canSubmit: false,
      notice: '인증 정보를 복구하고 있습니다. 잠시 후 다시 시도해 주세요.',
    };
  }
  return { canSubmit: true };
}
