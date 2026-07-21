// 페이지 컴포넌트가 실제로 import하는 진입점. VITE_USE_MOCK으로 mock/실제 API를 스위칭한다.
import { interviewApi, InterviewerApiItem, SubmitAnswersApiResponse } from './interview.api';
import { interviewMock } from './interview.mock';
import { Interviewer, InterviewResponse, Question, Answer, NextTurn } from './interview.types';

interface InterviewService {
  getInterviewers: () => Promise<Interviewer[]>;
  startInterview: (interviewerId: string, resumeId: string, selectedKeyword: string) => Promise<InterviewResponse>;
  submitAnswers: (sessionId: string, answers: Answer[]) => Promise<InterviewResponse>;
  submitFollowUp: (sessionId: string, answer: Answer) => Promise<InterviewResponse>;
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
    avatar: '🐣',
  },
  2: {
    requiredGauge: 30,
    description: '아키텍처와 예외 처리를 날카롭게 파고듭니다.',
    achievement: '실무 수준의 트러블슈팅과 기술적 트레이드오프를 논리적으로 방어할 수 있습니다.',
    avatar: '🦅',
  },
  3: {
    requiredGauge: 60,
    description: '극한의 상황에서 멘탈과 문제 해결 능력을 봅니다.',
    achievement: '스트레스 상황에서도 침착하게 근본적인 원인을 분석하고 대안을 제시할 수 있습니다.',
    avatar: '🦖',
  },
  4: {
    requiredGauge: 100,
    description: '회사의 인재상과 컬처핏을 날카롭게 검증합니다.',
    achievement: '조직의 비전에 부합하며 거시적인 관점에서의 엔지니어링 가치를 증명할 수 있습니다.',
    avatar: '🐉',
  },
};

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

  return {
    type: 'FOLLOW_UP',
    turn,
    questionId: toStringId(res.nextTurn.targetQuestionId),
    question: res.nextTurn.question,
  };
}

function toInterviewResponse(res: SubmitAnswersApiResponse, turn: number): InterviewResponse {
  const nextTurn = toNextTurn(res, turn);
  const weakestQuestionId = toStringId(res.weakestQuestionId);
  const followUpQuestionId = nextTurn.questionId ?? weakestQuestionId;

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
      nextTurn.type === 'FOLLOW_UP' && res.nextTurn?.question && followUpQuestionId
        ? [
            {
              id: followUpQuestionId,
              content: res.nextTurn.question,
              type: 'FOLLOW_UP',
            },
          ]
        : undefined,
  };
}

const realInterviewService: InterviewService = {
  getInterviewers: async () => {
    const res = await interviewApi.getInterviewers();
    return res.interviewers.map(toInterviewer);
  },

  startInterview: async (interviewerId, resumeId, selectedKeyword) => {
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
      nextTurn: { type: 'FOLLOW_UP', turn: 1 },
      questions,
    };
  },

  submitAnswers: async (sessionId, answers) => {
    const res = await interviewApi.submitAnswers(Number(sessionId), toApiAnswers(answers));
    return toInterviewResponse(res, 2);
  },

  submitFollowUp: async (sessionId, answer) => {
    const res = await interviewApi.submitAnswers(Number(sessionId), toApiAnswers([answer], answer.questionId));
    return toInterviewResponse(res, 3);
  },
};

export const engineService: InterviewService = USE_MOCK ? interviewMock : realInterviewService;
