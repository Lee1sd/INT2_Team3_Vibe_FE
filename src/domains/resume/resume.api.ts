// 백엔드 domain.resume 실제 엔드포인트 연동 구현.
// 근거: INT2_Team3_Vibe_BE/docs/api/api-spec.md RS-001, RS-002.
// 백엔드 컨트롤러가 아직 구현되지 않았으므로(2026-07-15 기준) 지금 호출하면 404가 난다.
import { apiClient } from '../../api/client';

export interface ResumeApiResponse {
  resumeId: number;
  type: 'RESUME' | 'PORTFOLIO';
  parseStatus: 'PROCESSING' | 'DONE' | 'FAILED' | 'EXPIRED';
  extractedText?: string;
  lastUploadedAt?: string;
}

export const resumeApi = {
  /** RS-001 — multipart/form-data 업로드. */
  upload: (file: File, type: 'RESUME' | 'PORTFOLIO' = 'RESUME'): Promise<ResumeApiResponse> => {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);
    return apiClient.postForm('/api/resumes', formData);
  },

  /** RS-002 — 파싱 상태 폴링. */
  getStatus: (resumeId: number): Promise<ResumeApiResponse> => apiClient.get(`/api/resumes/${resumeId}`),

  /** RS-003 — 이력서 목록 조회 (createdAt 내림차순).
   * [], "ResumeApiResponse(이력서 객체) 여러 개짜리 배열 */
  getList: (): Promise<ResumeApiResponse[]> => apiClient.get('/api/resumes'),

  /** RS-004 — 로그인한 사용자가 소유한 이력서/포트폴리오 삭제. */
  delete: (resumeId: number): Promise<void> => apiClient.delete(`/api/resumes/${resumeId}`),

};
