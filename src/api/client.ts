/**
 * 모든 도메인의 실제 API 호출(*.api.ts)이 공통으로 거쳐가는 통신 계층이다.
 * 백엔드 주소, 인증 토큰 첨부, 공통 에러 파싱(docs/api/api-contract.md 형식)을 한 곳에서 관리한다.
 * 각 도메인의 mock 구현(*.mock.ts)은 이 파일을 사용하지 않는다.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

let accessToken: string | null = null;

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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    // Refresh Token은 HttpOnly/Secure/Strict 쿠키로 발급되므로(AU-002), 모든 요청에 쿠키를 함께 보낸다.
    credentials: 'include',
    headers: {
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
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
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  postForm: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', body: formData }),
};
