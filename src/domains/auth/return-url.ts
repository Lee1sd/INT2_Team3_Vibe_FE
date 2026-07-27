/** OAuth 풀페이지 리다이렉트 후에도 복귀 경로를 유지하기 위한 sessionStorage 키. */
const RETURN_URL_KEY = 'career-dungeon:return-url';

/** 오픈 리다이렉트 방지: 앱 내부 상대 경로만 허용. */
export function isSafeReturnUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (value.startsWith('/oauth')) return false;
  return true;
}

export function saveReturnUrl(path: string): void {
  if (!isSafeReturnUrl(path) || path === '/') return;
  try {
    sessionStorage.setItem(RETURN_URL_KEY, path);
  } catch {
    // private mode 등에서 sessionStorage 실패해도 가드 자체는 동작해야 한다.
  }
}

export function consumeReturnUrl(fallback = '/dungeon'): string {
  try {
    const stored = sessionStorage.getItem(RETURN_URL_KEY);
    sessionStorage.removeItem(RETURN_URL_KEY);
    if (isSafeReturnUrl(stored)) return stored;
  } catch {
    // ignore
  }
  return fallback;
}
