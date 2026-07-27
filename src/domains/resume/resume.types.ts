// 백엔드 domain.resume 패키지(이건희 담당)와 짝을 이루는 타입 정의.
// 근거: INT2_Team3_Vibe_BE/docs/api/api-spec.md RS-001, RS-002.
//
// 주의(FE/BE 불일치, 실제 연동 전 정리 필요): 백엔드 응답은 resumeId/parseStatus(PROCESSING|DONE|FAILED)
// 필드를 쓰지만, 프론트는 예전부터 fileId/status(UPLOADING|PROCESSING|COMPLETED|FAILED)를 써왔다.
// resume.service.ts의 실제 구현(realResumeService)에서 이 차이를 매핑하고 있다.
//
// import type만 사용한다 — resume.api.ts는 import.meta.env를 쓰는 apiClient를 거쳐가서,
// 값으로 import하면 Vite 밖(node:test)에서 모듈 로드 자체가 죽는다.
import type { ResumeApiResponse } from './resume.api';
export interface UploadResponse {
  fileId: string;
  status: 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

export const RESUME_ALLOWED_EXTENSIONS = ['pdf', 'txt', 'md'] as const;
export const RESUME_MAX_BYTES = 10 * 1024 * 1024;

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

/** 확장자/용량을 검사해 presigned URL을 요청하기 전에 걸러낸다. */
export function validateResumeFile(file: File): string | null {
  const ext = getFileExtension(file.name);
  if (!RESUME_ALLOWED_EXTENSIONS.includes(ext as (typeof RESUME_ALLOWED_EXTENSIONS)[number])) {
    return 'PDF, TXT, MD 파일만 업로드할 수 있습니다.';
  }
  if (file.size > RESUME_MAX_BYTES) {
    return '파일 크기는 최대 10MB까지 업로드할 수 있습니다.';
  }
  return null;
}

/** 브라우저가 .md 파일의 file.type을 비워서 주는 경우가 있어 확장자로 보정한다. */
export function resolveResumeContentType(file: File): string {
  if (file.type) return file.type;
  return getFileExtension(file.name) === 'md' ? 'text/markdown' : 'application/octet-stream';
}

const SELECTED_RESUME_ID_STORAGE_KEY = 'selectedResumeId';

/** 새로고침해도 유지되는 마지막 선택 이력서 ID. 다른 기기 동기화는 백엔드의 isLastUsed가 담당한다. */
export function getStoredSelectedResumeId(): string | null {
  try {
    return localStorage.getItem(SELECTED_RESUME_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredSelectedResumeId(resumeId: string): void {
  try {
    localStorage.setItem(SELECTED_RESUME_ID_STORAGE_KEY, resumeId);
  } catch {
    // localStorage 접근 불가 환경(시크릿 모드 등)에서도 앱이 죽지 않게 무시한다.
  }
}

/**
 * 면접에 사용할 이력서를 고른다.
 * 우선순위: localStorage에 저장된 선택(방금 클릭했거나 방금 그걸로 면접을 봄) >
 * 백엔드가 알려주는 마지막 사용 이력서(isLastUsed, 다른 기기 지원용) > 없음.
 * 저장된 선택이 가리키는 이력서가 삭제/누락됐으면 무시하고 다음 우선순위로 내려간다.
 */
export function resolveActiveResumeId(resumes: ResumeApiResponse[]): string | null {
  const completed = resumes.filter((r) => r.type === 'RESUME' && r.parseStatus === 'DONE');

  const stored = getStoredSelectedResumeId();
  if (stored && completed.some((r) => String(r.resumeId) === stored)) {
    return stored;
  }

  const lastUsed = completed.find((r) => r.isLastUsed);
  return lastUsed ? String(lastUsed.resumeId) : null;
}

/** 사용자가 이력서를 클릭해서 선택했거나, 그 이력서로 면접을 시작했을 때 호출해 선택 상태를 유지한다. */
export function markResumeAsSelected(resumeId: string): void {
  setStoredSelectedResumeId(resumeId);
}

/** 바이트 단위 용량을 "1.23 MB" 같은 사람이 읽기 좋은 형식으로 변환한다. 예전 데이터는 fileSize가 없을 수 있다. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1));
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(2)} ${units[exponent]}`;
}
