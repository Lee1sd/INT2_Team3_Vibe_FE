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
