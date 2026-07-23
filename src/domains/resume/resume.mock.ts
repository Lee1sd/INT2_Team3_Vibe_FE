// 백엔드 /api/resumes 가 준비되기 전까지 업로드/파싱 흐름을 검증하기 위한 목업 구현.
import { UploadResponse } from './resume.types';
import {ResumeApiResponse} from "@/src/domains/resume/resume.api.ts";

let memoryMockUploaded = false;

export const resumeMock = {
  uploadResume: async (file: File, type: 'RESUME' | 'PORTFOLIO' = 'RESUME'): Promise<UploadResponse> => {
    console.log('Uploading file:', file.name, 'type:', type);
    memoryMockUploaded = true;
    try {
      localStorage.setItem('mock_resume_uploaded', 'true');
      localStorage.setItem('hasResume', 'true');
    } catch (e) {}

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          fileId: 'f123',
          status: 'PROCESSING',
        });
      }, 1500);
    });
  },

  checkParseStatus: async (fileId: string): Promise<UploadResponse> => {
    console.log('Checking status for file:', fileId);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          fileId,
          status: 'COMPLETED',
        });
      }, 1000);
    });
  },

  checkResumeStatus: async (): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let isUploaded = memoryMockUploaded;
        try {
          if (localStorage.getItem('mock_resume_uploaded') === 'true') {
            isUploaded = true;
          }
        } catch (e) {}
        resolve(isUploaded);
      }, 300);
    });
  },
  getResumeList: async (): Promise<ResumeApiResponse[]> => {
    return [];
  },
  /** 실제 서비스와 동일하게 면접에 사용할 최신 완료 이력서 ID를 반환한다. */
  getLatestCompletedResumeId: async (): Promise<string | null> => {
    const hasResume = await resumeMock.checkResumeStatus();
    return hasResume ? 'f123' : null;
  },
  deleteResume: async (_resumeId: string): Promise<void> => {
    memoryMockUploaded = false;
    try {
      localStorage.removeItem('mock_resume_uploaded');
      localStorage.removeItem('hasResume');
    } catch (e) {}
  },
};
