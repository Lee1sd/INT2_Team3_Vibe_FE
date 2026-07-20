// 페이지 컴포넌트가 실제로 import하는 진입점. VITE_USE_MOCK으로 mock/실제 API를 스위칭한다.
import { resumeApi, ResumeApiResponse } from './resume.api';
import { resumeMock } from './resume.mock';
import { UploadResponse } from './resume.types';

interface ResumeService {
  uploadResume: (file: File, type?: 'RESUME' | 'PORTFOLIO') => Promise<UploadResponse>;
  checkParseStatus: (fileId: string) => Promise<UploadResponse>;
  checkResumeStatus: () => Promise<boolean>;
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/** 백엔드(resumeId/parseStatus)와 프론트(fileId/status) 필드명 차이를 매핑한다. */
function toUploadResponse(res: ResumeApiResponse): UploadResponse {
  return {
    fileId: String(res.resumeId),
    status: res.parseStatus === 'DONE' ? 'COMPLETED' : res.parseStatus,
  };
}

const realResumeService: ResumeService = {
  uploadResume: async (file, type = 'RESUME') => toUploadResponse(await resumeApi.upload(file, type)),
  checkParseStatus: async (fileId) => toUploadResponse(await resumeApi.getStatus(Number(fileId))),
  checkResumeStatus: async () => {
    // RS-002는 특정 resumeId를 조회하는 API라 "현재 이력서를 보유하고 있는가"를 바로
    // 물어볼 방법이 아직 없다. 백엔드팀(이건희)과 협의해 목록 조회 API가 필요할 수 있다.
    throw new Error('이력서 보유 여부를 조회하는 API가 아직 api-spec.md에 없습니다. 백엔드팀(이건희)에 확인하세요.');
  },
};

export const fileService: ResumeService = USE_MOCK ? resumeMock : realResumeService;
