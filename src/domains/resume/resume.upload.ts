const LOCAL_RESUME_UPLOAD_PREFIX = '/api/resumes/local-upload/';

/**
 * 로컬 백엔드 업로드 URL에만 JWT를 추가하고, S3를 포함한 외부 origin에는 인증 정보를 보내지 않는다.
 */
export function buildResumeUploadHeaders(
  uploadUrl: string,
  apiBaseUrl: string,
  contentType: string,
  accessToken: string | null
): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': contentType };
  if (!accessToken) {
    return headers;
  }

  try {
    const target = new URL(uploadUrl);
    const backend = new URL(apiBaseUrl);
    const isLocalBackendUpload =
      target.origin === backend.origin && target.pathname.startsWith(LOCAL_RESUME_UPLOAD_PREFIX);
    if (isLocalBackendUpload) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  } catch {
    // 발급 URL 형식 오류는 fetch가 기존 오류 흐름으로 처리하도록 헤더만 안전하게 반환한다.
  }
  return headers;
}
