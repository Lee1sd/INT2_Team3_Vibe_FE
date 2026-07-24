// 페이지 컴포넌트가 실제로 import하는 진입점. VITE_USE_MOCK으로 mock/실제 API를 스위칭한다.
import { interviewApi, InterviewerApiItem, SubmitAnswersApiResponse } from './interview.api';
import { interviewMock } from './interview.mock';
import {
  getLevel4ChallengeInterviewerStub,
  isLevel4ChallengeInterviewerId,
  level4ChallengeMock,
} from './level4-challenge.mock';
import { Interviewer, InterviewResponse, Question, Answer, NextTurn } from './interview.types';

interface InterviewService {
  getInterviewers: () => Promise<Interviewer[]>;
  startInterview: (interviewerId: string, resumeId: string, selectedKeyword: string) => Promise<InterviewResponse>;
  submitAnswers: (sessionId: string, answers: Answer[]) => Promise<InterviewResponse>;
  submitFollowUp: (sessionId: string, answer: Answer) => Promise<InterviewResponse>;
  /** Lv.4 챌린지 전용 — 답변 1건마다 채점·게이지 갱신. */
  submitChallengeTurn: (sessionId: string, answer: Answer) => Promise<InterviewResponse>;
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/**
 * IV-001 응답에는 description/achievement/avatar가 없다 — 이건 의도된 설계다
 * (docs/erd/entity-definition.md 비고: "등급 참고텍스트는 프론트 정적 매핑(FR-13), 백엔드 필드 없음").
 * requiredGauge도 API에 없지만, UM-001 비고의 레벨별 게이지 증가폭(Lv1 클리어 +30 / Lv2 +30 / Lv3 +40)을
 * 프론트에서 상수로 계산한 값이라 여기서 정적으로 관리한다.
 */
const STATIC_CONTENT_BY_LEVEL: Record<
  number,
  Pick<Interviewer, 'requiredGauge' | 'description' | 'achievement' | 'avatar'>
> = {
  1: {
    requiredGauge: 0,
    description: '코드 가독성과 기본기를 중요하게 생각합니다.',
    achievement: '기본적인 CS 지식과 이력서 내용의 사실 관계를 설명할 수 있습니다.',
    avatar: '/interviewers/lv1-casual.png',
  },
  2: {
    requiredGauge: 30,
    description: '아키텍처와 예외 처리를 날카롭게 파고듭니다.',
    achievement: '실무 수준의 트러블슈팅과 기술적 트레이드오프를 논리적으로 방어할 수 있습니다.',
    avatar: '/interviewers/lv2-strict.png',
  },
  3: {
    requiredGauge: 60,
    description: '극한의 상황에서 멘탈과 문제 해결 능력을 봅니다.',
    achievement: '스트레스 상황에서도 침착하게 근본적인 원인을 분석하고 대안을 제시할 수 있습니다.',
    // Lv.3 세션 전신/포즈는 미제작 — 메인 카드는 bust 경로를 쓴다.
    avatar: '',
  },
  4: {
    requiredGauge: 100,
    description: '챌린지 모드(목업). 답변마다 채점되며 게이지로 즉시 합격/탈락이 갈립니다.',
    achievement: '제한된 발화 안에서 설득력 있는 근거로 임원을 납득시킬 수 있습니다.',
    avatar: '/interviewers/lv4-executive.png',
  },
};

/** BE에 아직 없는 Lv.4를 FE에 주입한다. 기존 레벨 API 응답은 건드리지 않는다. */
function withLevel4ChallengeInterviewer(interviewers: Interviewer[]): Interviewer[] {
  const withoutLv4 = interviewers.filter((iv) => iv.level !== 4 && iv.id !== getLevel4ChallengeInterviewerStub().id);
  const stub = getLevel4ChallengeInterviewerStub(true);
  const staticContent = STATIC_CONTENT_BY_LEVEL[4]!;
  return [
    ...withoutLv4,
    {
      id: stub.id,
      name: stub.name,
      level: stub.level,
      isUnlocked: stub.isUnlocked,
      ...staticContent,
    },
  ];
}

function toInterviewer(item: InterviewerApiItem): Interviewer {
  const staticContent = STATIC_CONTENT_BY_LEVEL[item.level] ?? STATIC_CONTENT_BY_LEVEL[1];
  return {
    id: String(item.id),
    name: item.name,
    level: item.level,
    isUnlocked: item.unlocked,
    ...staticContent,
  };
}

/** 면접 세션용 전신 기본 포즈. */
export function getInterviewerAvatarByLevel(level: number): string {
  return STATIC_CONTENT_BY_LEVEL[level]?.avatar ?? '';
}

/** 던전/메인 레벨 카드용 확대샷(누끼). */
export function getInterviewerBustByLevel(level: number): string {
  if (level === 1) return '/interviewers/lv1-casual-bust.png';
  if (level === 2) return '/interviewers/lv2-strict-bust.png';
  if (level === 3) return '/interviewers/lv3-pressure-bust.png';
  if (level === 4) return '/interviewers/lv4-executive-bust.png';
  return '';
}

/** Lv.1 대리님 추가 포즈(인사 이후 질문마다 셔플 순서로 1회씩). */
export const LV1_CASUAL_POSE_PATHS = [
  '/interviewers/poses/lv1-casual-pose-01.png',
  '/interviewers/poses/lv1-casual-pose-02.png',
  '/interviewers/poses/lv1-casual-pose-03.png',
  '/interviewers/poses/lv1-casual-pose-04.png',
] as const;

/** Lv.2 과장님 추가 포즈. */
export const LV2_STRICT_POSE_PATHS = [
  '/interviewers/poses/lv2-strict-pose-01.png',
  '/interviewers/poses/lv2-strict-pose-02.png',
  '/interviewers/poses/lv2-strict-pose-03.png',
  '/interviewers/poses/lv2-strict-pose-04.png',
] as const;

/**
 * Lv.4 세션 중 랜덤 포즈.
 * 메인 미리보기(이중인격 임원님)와 bad2는 제외 — pose2/3 + bad1만 사용.
 */
export const LV4_EXECUTIVE_SESSION_POSE_PATHS = [
  '/interviewers/poses/lv4-executive-pose-02.png',
  '/interviewers/poses/lv4-executive-pose-03.png',
  '/interviewers/poses/lv4-executive-pose-bad1.png',
] as const;

/** Lv.4 합격 종료 시 — 파일명에 bad가 없는 이미지만. */
export const LV4_EXECUTIVE_GOOD_POSE_PATHS = [
  '/interviewers/poses/lv4-executive-pose-good-01.png',
  '/interviewers/poses/lv4-executive-pose-good-02.png',
  '/interviewers/poses/lv4-executive-pose-good-03.png',
] as const;

/** Lv.4 불합격 종료 시 — bad2 고정. */
export const LV4_EXECUTIVE_BAD_END_POSE = '/interviewers/poses/lv4-executive-pose-bad2.png';

export function getSessionPosePaths(level: number): string[] {
  if (level === 1) return [...LV1_CASUAL_POSE_PATHS];
  if (level === 2) return [...LV2_STRICT_POSE_PATHS];
  if (level === 4) return [...LV4_EXECUTIVE_SESSION_POSE_PATHS];
  return [];
}

/** 세션 시작 시 1회 셔플 — 질문은 이 순서로만 돌아가며 같은 포즈가 빠지지 않게 한다. */
export function shufflePoseOrder(level: number): string[] {
  const poses = getSessionPosePaths(level);
  for (let i = poses.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = poses[i];
    poses[i] = poses[j]!;
    poses[j] = tmp!;
  }
  return poses;
}

/** Lv.4 종료 연출용 스프라이트. */
export function pickLevel4ResultSprite(passed: boolean): string {
  if (!passed) return LV4_EXECUTIVE_BAD_END_POSE;
  const goods = [...LV4_EXECUTIVE_GOOD_POSE_PATHS];
  return goods[Math.floor(Math.random() * goods.length)] ?? getInterviewerAvatarByLevel(4);
}

/**
 * 면접 세션 스프라이트.
 * - 첫 인사: 기본 전신
 * - 이후 질문(본문항·꼬리질문): 셔플된 포즈 큐에서 슬롯 순서대로(중복 없이, 부족하면 순환)
 */
export function pickSessionSpriteFromOrder(
  level: number,
  poseOrder: string[],
  options: { isOpeningGreeting: boolean; questionSlot: number },
): string {
  const base = getInterviewerAvatarByLevel(level);
  if (!base) return '';
  if (options.isOpeningGreeting || poseOrder.length === 0) return base;
  return poseOrder[options.questionSlot % poseOrder.length] ?? base;
}

/** 면접 세션 최후방 사무실 배경. */
export function getInterviewBackgroundByLevel(level: number): string {
  if (level === 1) return '/interviewers/backgrounds/lv1-programmers.png';
  if (level === 2) return '/interviewers/backgrounds/lv2-grepp.png';
  if (level === 4) return '/interviewers/backgrounds/lv4-grepp-hq.png';
  return '';
}

function toStringId(id: number | null | undefined): string | undefined {
  return id == null ? undefined : String(id);
}

function toNumberId(id: string | undefined): number | undefined {
  if (id == null || id.trim() === '') return undefined;

  const numericId = Number(id);
  return Number.isFinite(numericId) ? numericId : undefined;
}

function toApiAnswers(answers: Answer[], fallbackQuestionId?: string): { questionId: number; answerText: string }[] {
  return answers.map((answer) => ({
    questionId: toNumberId(answer.questionId) ?? toNumberId(fallbackQuestionId) ?? (() => {
      throw new Error('Question ID is required to submit an interview answer.');
    })(),
    answerText: answer.content,
  }));
}

function toNextTurn(res: SubmitAnswersApiResponse, turn: number): NextTurn {
  if (!res.nextTurn || res.nextTurn.type === 'END') {
    return { type: 'END', turn };
  }

  const questionId = toStringId(res.nextTurn.targetQuestionId);
  if (!questionId || !res.nextTurn.question) {
    return { type: 'END', turn };
  }

  return {
    type: 'FOLLOW_UP',
    turn,
    questionId,
    question: res.nextTurn.question,
  };
}

function toInterviewResponse(res: SubmitAnswersApiResponse, turn: number): InterviewResponse {
  const nextTurn = toNextTurn(res, turn);
  const weakestQuestionId = toStringId(res.weakestQuestionId);

  return {
    evaluations: res.evaluations.map((evaluation) => ({
      questionId: String(evaluation.questionId),
      score: evaluation.score,
      feedback: evaluation.feedback,
    })),
    totalScore: res.totalScore,
    weakestQuestionId,
    overallFeedback: res.overallFeedback,
    passed: res.passed,
    nextTurn,
    questions:
      nextTurn.type === 'FOLLOW_UP' && nextTurn.question
        ? [
            {
              // targetQuestionId는 최저점 원문항이고, 새 꼬리질문의 외부 questionId는 항상 turn 4다.
              id: '4',
              content: nextTurn.question,
              type: 'FOLLOW_UP',
            },
          ]
        : undefined,
  };
}

const realInterviewService = {
  getInterviewers: async () => {
    const res = await interviewApi.getInterviewers();
    return res.interviewers.map(toInterviewer);
  },

  startInterview: async (interviewerId: string, resumeId: string, selectedKeyword: string) => {
    // interviewApi.createSession의 시그니처는 (resumeId, interviewerId, keyword) 순서다 — 이전에
    // 인자가 뒤바뀌어 전달되던 버그(#11)를 수정.
    const res = await interviewApi.createSession(Number(resumeId), Number(interviewerId), selectedKeyword);
    const questions: Question[] = res.questions.map((q) => ({
      id: String(q.questionId),
      content: q.question,
      type: 'MAIN',
    }));
    return {
      sessionId: String(res.sessionId),
      passed: false,
      nextTurn: { type: 'FOLLOW_UP' as const, turn: 1 },
      questions,
    };
  },

  submitAnswers: async (sessionId: string, answers: Answer[]) => {
    const res = await interviewApi.submitAnswers(Number(sessionId), toApiAnswers(answers));
    return toInterviewResponse(res, 2);
  },

  submitFollowUp: async (sessionId: string, answer: Answer) => {
    const res = await interviewApi.submitAnswers(Number(sessionId), toApiAnswers([answer], answer.questionId));
    return toInterviewResponse(res, 3);
  },
};

const baseService = USE_MOCK ? interviewMock : realInterviewService;

/**
 * Lv.4만 프론트 챌린지 mock으로 분기한다.
 * VITE_USE_MOCK=false여도 Lv1~3 실API는 유지하고, Lv.4만 목업한다.
 */
export const engineService: InterviewService = {
  getInterviewers: async () => withLevel4ChallengeInterviewer(await baseService.getInterviewers()),

  startInterview: async (interviewerId, resumeId, selectedKeyword) => {
    if (isLevel4ChallengeInterviewerId(interviewerId)) {
      return level4ChallengeMock.startInterview(interviewerId, resumeId, selectedKeyword);
    }
    return baseService.startInterview(interviewerId, resumeId, selectedKeyword);
  },

  submitAnswers: (sessionId, answers) => baseService.submitAnswers(sessionId, answers),

  submitFollowUp: (sessionId, answer) => baseService.submitFollowUp(sessionId, answer),

  submitChallengeTurn: (sessionId, answer) => level4ChallengeMock.submitTurn(sessionId, answer),
};

export { isLevel4ChallengeInterviewerId, LEVEL4_INTERVIEWER_ID } from './level4-challenge.mock';
