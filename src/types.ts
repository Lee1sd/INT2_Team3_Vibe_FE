// 하위 호환을 위한 배럴(barrel) 파일. 실제 타입 정의는 도메인별로
// src/domains/<domain>/<domain>.types.ts 에 있다 — 새 코드는 거기서 바로 import 하는 것을 권장한다.
export type { User, AuthCallbackResponse } from './domains/auth/auth.types';
export type { UploadResponse } from './domains/resume/resume.types';
export type {
  Interviewer,
  Question,
  Answer,
  EvaluationDetail,
  NextTurn,
  InterviewResponse,
} from './domains/interview/interview.types';
export type { GaugeUpdate } from './domains/progress/progress.types';
