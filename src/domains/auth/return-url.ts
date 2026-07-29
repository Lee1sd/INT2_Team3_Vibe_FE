/** OAuth 풀페이지 리다이렉트 후에도 복귀 경로를 유지하기 위한 sessionStorage 키. */
const RETURN_URL_KEY = 'career-dungeon:return-url';
/** Strict Mode 이중 consume용 — 목적지 도착(RequireAuth) 또는 clear 전까지 유지. */
const PENDING_RETURN_URL_KEY = 'career-dungeon:return-url:pending';
/** 명시적 로그아웃 중 보호 라우트가 현재 경로를 다시 저장하지 못하게 하는 표식. */
const AUTH_EXIT_IN_PROGRESS_KEY = 'career-dungeon:auth-exit-in-progress';

/** 오픈 리다이렉트 방지: 앱 내부 상대 경로만 허용. */
export function isSafeReturnUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (value.startsWith('/oauth')) return false;
  return true;
}

export function saveReturnUrl(path: string): void {
  if (isAuthExitInProgress() || !isSafeReturnUrl(path) || path === '/') return;
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

/** 로그아웃을 시작하기 전에 기존 복귀 경로를 지우고 후속 저장을 잠시 차단한다. */
export function beginAuthExit(): void {
  clearReturnUrl();
  try {
    sessionStorage.setItem(AUTH_EXIT_IN_PROGRESS_KEY, 'true');
  } catch {
    // private mode 등에서는 라우터 state 기반 초기화를 보조 경로로 사용한다.
  }
}

/** 현재 인증 종료 흐름인지 확인하되 로그인 버튼을 누르기 전까지 표식을 유지한다. */
export function isAuthExitInProgress(): boolean {
  try {
    return sessionStorage.getItem(AUTH_EXIT_IN_PROGRESS_KEY) === 'true';
  } catch {
    return false;
  }
}

/** 새 로그인을 시작할 때 실제 인증 종료 흐름에서만 표식과 복귀 경로를 함께 제거한다. */
export function completeAuthExit(): boolean {
  if (!isAuthExitInProgress()) {
    return false;
  }
  clearReturnUrl();
  try {
    sessionStorage.removeItem(AUTH_EXIT_IN_PROGRESS_KEY);
  } catch {
    // ignore
  }
  return true;
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
