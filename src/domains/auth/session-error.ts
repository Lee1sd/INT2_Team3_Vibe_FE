/**
 * access token 만료 + 자동 refresh까지 실패해 표면화된 401(세션 완전 만료)을 식별한다. (#89)
 *
 * api/client.ts의 ApiError를 직접 import하지 않고 형태(name/status)로 판별한다 —
 * client.ts는 모듈 로드 시 import.meta.env를 읽어, node 기반 단위 테스트(tsx)에서
 * import하면 깨지기 때문이다. ApiError는 name='ApiError'와 status 필드를 보장한다.
 */
export function isSessionExpiredError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { name?: unknown; status?: unknown };
  return candidate.name === 'ApiError' && candidate.status === 401;
}
