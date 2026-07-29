/**
 * 서버가 답변을 받아들인 뒤(2xx)에 발생한 실패를 "제출 실패"와 구분한다. (#95)
 *
 * 답변이 이미 기록된 상태이므로 재제출을 유도하면 안 된다 — 이미 완료된 세션에
 * 다시 제출해 409가 난다. 응답 파싱, 계약 검증, 결과 화면 준비 단계의 실패만
 * 여기에 해당한다.
 *
 * api/client.ts의 ApiError를 instanceof로 보지 않고 형태(name/code)로 판별한다 —
 * client.ts는 모듈 로드 시 import.meta.env를 읽어, node 기반 단위 테스트(tsx)에서
 * import하면 깨지기 때문이다. (session-error.ts와 같은 이유)
 */

export const POST_SUBMIT_ERROR_NAME = 'InterviewPostSubmitError';

/** 2xx인데 본문이 JSON이 아닐 때 client.ts가 쓰는 에러 코드. */
export const INVALID_JSON_RESPONSE_CODE = 'INVALID_JSON_RESPONSE';

/** 제출은 성공했지만 응답을 결과로 쓸 수 없을 때 던진다. */
export class InterviewPostSubmitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = POST_SUBMIT_ERROR_NAME;
  }
}

export function isPostSubmitFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error as { name?: unknown; code?: unknown };
  if (candidate.name === POST_SUBMIT_ERROR_NAME) return true;

  // 2xx 응답의 JSON 파싱 실패도 제출 자체는 성공한 경우다.
  return candidate.name === 'ApiError' && candidate.code === INVALID_JSON_RESPONSE_CODE;
}
