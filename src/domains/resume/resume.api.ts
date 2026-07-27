// 백엔드 domain.resume 실제 엔드포인트 연동 구현.
// 근거: INT2_Team3_Vibe_BE/docs/api/api-spec.md RS-001, RS-002.
import { apiClient, getAccessToken } from '../../api/client';
import { buildResumeUploadHeaders } from './resume.upload';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export interface ResumeApiResponse {
  resumeId: number;
  type: 'RESUME' | 'PORTFOLIO';
  parseStatus: 'PROCESSING' | 'DONE' | 'FAILED' | 'EXPIRED';
  extractedText?: string;
  lastUploadedAt?: string;
  /** 예전에 업로드된 이력서는 이 필드가 없을 수 있다(null). */
  originalFileName?: string | null;
  /** 예전에 업로드된 이력서는 이 필드가 없을 수 있다(null). */
  fileSize?: number | null;
  /** 이 사용자가 마지막으로 면접에 사용한 이력서인지. 면접 이력이 없는 신규 사용자는 전부 false. */
  isLastUsed?: boolean;
}

export interface UploadUrlRequest {
  type: 'RESUME' | 'PORTFOLIO';
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
  expiresInSeconds: number;
}

export interface UploadCompleteRequest {
  type: 'RESUME' | 'PORTFOLIO';
  s3Key: string;
  originalFileName: string;
}

export interface UploadCompleteResponse {
  resumeId: number;
  extractedText: string | null;
}

export const resumeApi = {
  /** RS-001a — presigned PUT URL 발급. */
  getUploadUrl: (params: UploadUrlRequest): Promise<UploadUrlResponse> =>
    apiClient.post('/api/resumes/upload-url', params),

  /**
   * RS-001b — 운영은 S3로, 로컬 시연은 인증된 백엔드 임시 저장소로 직접 PUT한다.
   * 외부 S3 URL에는 JWT를 보내지 않고 로컬 백엔드 업로드 URL에만 현재 토큰을 첨부한다.
   */
  uploadToStorage: async (uploadUrl: string, file: File, contentType: string): Promise<void> => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: buildResumeUploadHeaders(uploadUrl, API_BASE_URL, contentType, getAccessToken()),
      body: file,
    });

    if (!res.ok) {
      throw new Error(`이력서 파일 업로드에 실패했습니다. (status: ${res.status})`);
    }
  },

  /** RS-001c — S3 업로드 완료를 백엔드에 통지하고 파싱을 시작시킨다. */
  completeUpload: (params: UploadCompleteRequest): Promise<UploadCompleteResponse> =>
    apiClient.post('/api/resumes/upload-complete', params),

  /** RS-002 — 파싱 상태 폴링. */
  getStatus: (resumeId: number): Promise<ResumeApiResponse> => apiClient.get(`/api/resumes/${resumeId}`),

  /** RS-003 — 이력서 목록 조회 (createdAt 내림차순).
   * [], "ResumeApiResponse(이력서 객체) 여러 개짜리 배열 */
  getList: (): Promise<ResumeApiResponse[]> => apiClient.get('/api/resumes'),

  /** RS-004 — 로그인한 사용자가 소유한 이력서/포트폴리오 삭제. */
  delete: (resumeId: number): Promise<void> => apiClient.delete(`/api/resumes/${resumeId}`),
};
