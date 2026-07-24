// 백엔드 domain.resume 패키지(이건희 담당)와 짝을 이루는 타입 정의.
// 근거: INT2_Team3_Vibe_BE/docs/api/api-spec.md RS-001, RS-002.
//
// 주의(FE/BE 불일치, 실제 연동 전 정리 필요): 백엔드 응답은 resumeId/parseStatus(PROCESSING|DONE|FAILED)
// 필드를 쓰지만, 프론트는 예전부터 fileId/status(UPLOADING|PROCESSING|COMPLETED|FAILED)를 써왔다.
// resume.service.ts의 실제 구현(realResumeService)에서 이 차이를 매핑하고 있다.
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

/** 바이트 단위 용량을 "1.23 MB" 같은 사람이 읽기 좋은 형식으로 변환한다. 예전 데이터는 fileSize가 없을 수 있다. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return '';
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(2)} ${units[exponent]}`;
}
