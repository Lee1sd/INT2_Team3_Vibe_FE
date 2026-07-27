// 백엔드 /api/resumes 가 준비되기 전까지 업로드/파싱 흐름을 검증하기 위한 목업 구현.
import { UploadResponse, validateResumeFile, getStoredSelectedResumeId, clearStoredSelectedResumeId } from './resume.types';
import {ResumeApiResponse} from "@/src/domains/resume/resume.api.ts";

let memoryMockUploaded = false;

export const resumeMock = {
  uploadResume: async (file: File, type: 'RESUME' | 'PORTFOLIO' = 'RESUME'): Promise<UploadResponse> => {
    const validationError = validateResumeFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

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
  /** 실제 서비스와 동일하게 localStorage 선택을 우선하되, 이력서가 삭제된 경우엔 그 값을 신뢰하지 않는다. */
  getLatestCompletedResumeId: async (): Promise<string | null> => {
    const hasResume = await resumeMock.checkResumeStatus();
    if (!hasResume) return null;
    return getStoredSelectedResumeId() || 'f123';
  },
  deleteResume: async (resumeId: string): Promise<void> => {
    memoryMockUploaded = false;
    try {
      localStorage.removeItem('mock_resume_uploaded');
      localStorage.removeItem('hasResume');
    } catch (e) {}
    if (getStoredSelectedResumeId() === resumeId) {
      clearStoredSelectedResumeId();
    }
  },
};
