/** OAuth 풀페이지 리다이렉트 후에도 복귀 경로를 유지하기 위한 sessionStorage 키. */
const RETURN_URL_KEY = 'career-dungeon:return-url';
/** Strict Mode 이중 consume용 — 목적지 도착(RequireAuth) 또는 clear 전까지 유지. */
const PENDING_RETURN_URL_KEY = 'career-dungeon:return-url:pending';

/** 오픈 리다이렉트 방지: 앱 내부 상대 경로만 허용. */
export function isSafeReturnUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (value.startsWith('/oauth')) return false;
  return true;
}

/**
 * 사용자가 스스로 나간 경우(로그아웃/탈퇴) 표시.
 * 세션 만료(#89)는 복귀 경로를 남겨야 하지만 로그아웃은 남기면 안 되므로,
 * 토큰이 사라진 이유를 가드가 구분할 수 있어야 한다.
 * 다음 로그인 성공 시 RequireAuth가 해제한다.
 */
let intentionalSignOut = false;

export function markIntentionalSignOut(): void {
  intentionalSignOut = true;
}

export function clearIntentionalSignOut(): void {
  intentionalSignOut = false;
}

export function isIntentionalSignOut(): boolean {
  return intentionalSignOut;
}

export function saveReturnUrl(path: string): void {
  if (!isSafeReturnUrl(path) || path === '/') return;
  try {
    sessionStorage.removeItem(PENDING_RETURN_URL_KEY);
    sessionStorage.setItem(RETURN_URL_KEY, path);
  } catch {
    // private mode 등에서 sessionStorage 실패해도 가드 자체는 동작해야 한다.
  }
}

export function clearReturnUrl(): void {
  try {
    sessionStorage.removeItem(RETURN_URL_KEY);
    sessionStorage.removeItem(PENDING_RETURN_URL_KEY);
  } catch {
    // ignore
  }
}

/**
 * returnUrl을 한 번 읽고 지운다.
 * Strict Mode에서 effect/렌더가 두 번 돌아도 같은 목적지를 주기 위해,
 * 소비 직후 값을 pending 키에 잠깐 남긴다(도착 후 clearReturnUrl로 제거).
 */
export function consumeReturnUrl(fallback = '/dungeon'): string {
  try {
    const stored = sessionStorage.getItem(RETURN_URL_KEY);
    if (stored !== null) {
      sessionStorage.removeItem(RETURN_URL_KEY);
      const value = isSafeReturnUrl(stored) ? stored : fallback;
      sessionStorage.setItem(PENDING_RETURN_URL_KEY, value);
      return value;
    }
    const pending = sessionStorage.getItem(PENDING_RETURN_URL_KEY);
    if (isSafeReturnUrl(pending)) return pending;
  } catch {
    // ignore
  }
  return fallback;
}
