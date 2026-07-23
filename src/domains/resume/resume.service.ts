// 페이지 컴포넌트가 실제로 import하는 진입점. VITE_USE_MOCK으로 mock/실제 API를 스위칭한다.
import { resumeApi, ResumeApiResponse } from './resume.api';
import { resumeMock } from './resume.mock';
import { UploadResponse } from './resume.types';

interface ResumeService {
  uploadResume: (file: File, type?: 'RESUME' | 'PORTFOLIO') => Promise<UploadResponse>;
  checkParseStatus: (fileId: string) => Promise<UploadResponse>;
  checkResumeStatus: () => Promise<boolean>;
  getResumeList: () => Promise<ResumeApiResponse[]>;
  getLatestCompletedResumeId: () => Promise<string | null>;
  deleteResume: (resumeId: string) => Promise<void>;
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/** 백엔드(resumeId/parseStatus)와 프론트(fileId/status) 필드명 차이를 매핑한다. */
function toUploadResponse(res: ResumeApiResponse): UploadResponse {
  return {
    fileId: String(res.resumeId),
    status: res.parseStatus === 'DONE'
      ? 'COMPLETED'
      : res.parseStatus === 'EXPIRED'
        ? 'FAILED'
        : res.parseStatus,
  };
}

const realResumeService: ResumeService = {
  uploadResume: async (file, type = 'RESUME') => toUploadResponse(await resumeApi.upload(file, type)),
  checkParseStatus: async (fileId) => toUploadResponse(await resumeApi.getStatus(Number(fileId))),
  checkResumeStatus: async () => {
   const resumes = await  resumeApi.getList();
   return resumes.some(r => r.type === 'RESUME' && r.parseStatus !== 'FAILED');
  },

  // 목록 조회: 배열 반환 (화면에 3개 뿌릴 때)
  getResumeList: async () => {
    return await resumeApi.getList();
  },
  /** 최신 파싱 완료 이력서를 면접 입력으로 선택한다. */
  getLatestCompletedResumeId: async () => {
    const resumes = await resumeApi.getList();
    const resume = resumes.find((item) => item.type === 'RESUME' && item.parseStatus === 'DONE');
    return resume ? String(resume.resumeId) : null;
  },
  deleteResume: async (resumeId) => {
    await resumeApi.delete(Number(resumeId));
  },
};

export const fileService: ResumeService = USE_MOCK ? resumeMock : realResumeService;
