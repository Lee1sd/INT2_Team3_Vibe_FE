/**
 * 모든 도메인의 실제 API 호출(*.api.ts)이 공통으로 거쳐가는 통신 계층이다.
 * 백엔드 주소, 인증 토큰 첨부, 공통 에러 파싱(docs/api/api-contract.md 형식)을 한 곳에서 관리한다.
 * 각 도메인의 mock 구현(*.mock.ts)은 이 파일을 사용하지 않는다.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/** 앱 부트가 hang 나지 않도록 refresh 요청 상한(ms). */
const REFRESH_TIMEOUT_MS = 5000;

/** 일반 API가 BE 지연/스레드 고갈에 영원히 묶이지 않도록 하는 상한(ms). */
const REQUEST_TIMEOUT_MS = 15000;

let accessToken: string | null = null;

/** 동시에 여러 요청이 401을 받아도 refresh는 한 번만 돌리기 위한 in-flight 공유. */
let refreshInFlight: Promise<boolean> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** docs/api/api-contract.md에 확정된 에러 응답 형식. */
export interface ApiErrorBody {
  code: string;
  message: string;
  status: number;
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(body: Partial<ApiErrorBody>) {
    super(body.message || '알 수 없는 오류가 발생했습니다.');
    this.name = 'ApiError';
    this.code = body.code || 'UNKNOWN_ERROR';
    this.status = body.status ?? 500;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/**
 * AU-003 — Refresh Token 쿠키로 accessToken을 다시 받는다.
 * apiClient.request 경로를 타지 않아 401 재시도 루프에 빠지지 않는다.
 */
async function tryRefreshAccessToken(externalSignal?: AbortSignal): Promise<boolean> {
  // 이미 취소된 신호면 refresh를 시작하지 않는다.
  // 단, abort ≠ 인증 실패이므로 accessToken을 지우지 않는다.
  // (BE는 refresh 시 기존 쿠키를 revoke하므로, 중단된 refresh는 세션을 깨뜨릴 수 있다.)
  if (externalSignal?.aborted) {
    return false;
  }

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
      const onExternalAbort = () => controller.abort();
      if (externalSignal) {
        if (externalSignal.aborted) {
          controller.abort();
        } else {
          externalSignal.addEventListener('abort', onExternalAbort, { once: true });
        }
      }

      let res: Response;
      try {
        res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
        externalSignal?.removeEventListener('abort', onExternalAbort);
      }

      if (!res.ok) {
        setAccessToken(null);
        return false;
      }

      const text = await res.text();
      if (!text) {
        setAccessToken(null);
        return false;
      }

      const body = JSON.parse(text) as { accessToken?: string };
      if (!body.accessToken) {
        setAccessToken(null);
        return false;
      }

      setAccessToken(body.accessToken);
      return true;
    } catch (error) {
      // Abort/timeout으로 끊긴 refresh는 인증 실패로 취급하지 않는다.
      // BE가 이미 토큰을 rotate했을 수 있어, 여기서 null로 지우면 세션이 영구 소실된다.
      if (isAbortError(error) || externalSignal?.aborted) {
        return false;
      }
      setAccessToken(null);
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * 앱 부트(새로고침 포함) 시 메모리 accessToken을 복구한다.
 * 쿠키가 없거나 만료면 false — 호출 측에서 로그인 화면으로내면 된다.
 */
export async function restoreSession(signal?: AbortSignal): Promise<boolean> {
  return tryRefreshAccessToken(signal);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retried = false
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const onExternalAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const cleanup = () => {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', onExternalAbort);
  };

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      // Refresh Token은 HttpOnly 쿠키로 발급되므로(AU-002), 모든 요청에 쿠키를 함께 보낸다.
      credentials: 'include',
      headers: {
        ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });

    if (!res.ok) {
      // accessToken 만료 시 한 번만 refresh 후 동일 요청을 재시도한다.
      // /api/auth/refresh 자체와 이미 재시도한 요청은 제외해 무한 루프를 막는다.
      if (
        res.status === 401 &&
        !retried &&
        path !== '/api/auth/refresh' &&
        path !== '/api/auth/logout'
      ) {
        const refreshed = await tryRefreshAccessToken();
        if (refreshed) {
          cleanup();
          // 페이지 unmount로 원 요청 signal이 abort된 뒤에도,
          // refresh로 받은 새 accessToken으로 재시도는 가능하게 한다.
          const { signal, ...rest } = options;
          const retryOptions = signal?.aborted ? rest : options;
          return request<T>(path, retryOptions, true);
        }
      }

      const body: ApiErrorBody | null = await res.json().catch(() => null);
      throw new ApiError(
        body ?? { code: 'UNKNOWN_ERROR', message: '알 수 없는 오류가 발생했습니다.', status: res.status }
      );
    }

    if (res.status === 204) {
      return undefined as T;
    }

    // 204가 아니어도 body가 빈 응답일 수 있다 — res.json()을 바로 호출하면 파싱 에러가 나므로
    // 먼저 텍스트로 읽어 빈 문자열인지 확인한다.
    const text = await res.text();
    if (!text) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
  } catch (error) {
    if (timedOut && isAbortError(error)) {
      throw new ApiError({
        code: 'REQUEST_TIMEOUT',
        message: `요청 시간이 초과되었습니다. (${path})`,
        status: 408,
      });
    }
    throw error;
  } finally {
    cleanup();
  }
}

export const apiClient = {
  get: <T>(path: string, options: RequestInit = {}) => request<T>(path, options),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', body: formData }),
};
