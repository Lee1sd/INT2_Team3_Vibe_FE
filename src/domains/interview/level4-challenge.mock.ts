/**
 * Lv.4 챌린지 모드 — 프론트 전용 mock 엔진.
 * 턴바이턴 1질문, 답변마다 채점, 게이지 임계값/발화 상한으로 즉시 종료.
 * 백엔드 IS-001/002와 무관하며 세션은 메모리에만 둔다.
 */
import {
  Answer,
  ChallengeFinalResult,
  ChallengeTurnMeta,
  EvaluationDetail,
  InterviewResponse,
  Question,
} from './interview.types';

export const LEVEL4_INTERVIEWER_ID = '-4';
export const LEVEL4_LEVEL = 4;

export const LEVEL4_CLOSING = {
  FAIL: '더이상 들을 필요도 없을 것 같군요',
  PASS: '충분히 들은 것 같습니다. 결과 화면 확인해주시면 될 것 같아요. 고생 많으셨습니다.',
  MAX: '제한된 발화 횟수 안에 판단을 마쳤습니다. 결과 화면을 확인해 주세요.',
} as const;

const MAX_UTTERANCES = 20;
const MAX_FOLLOW_UPS = 3;
const FAIL_THRESHOLD = 25;
const PASS_THRESHOLD = 80;
const START_GAUGE = 50;

type TopicKey = 'cache' | 'scale' | 'tradeoff' | 'incident' | 'culture';

interface TopicBank {
  key: TopicKey;
  main: string;
  weakFollowUps: string[];
  strongFollowUps: string[];
}

const TOPIC_BANKS: TopicBank[] = [
  {
    key: 'cache',
    main: '이력서의 캐싱 전략에서 정합성이 깨진 순간을 어떻게 감지하고 복구하셨나요?',
    weakFollowUps: [
      '감지만 하셨다는 건가요, 아니면 자동 복구 파이프라인까지 만드셨나요?',
      '캐시 미스 폭주 때 TTL과 워밍업은 어떤 기준으로 잡으셨죠?',
      '그렇다면 Write-Through와 Cache-Aside 중 왜 그쪽을 고르셨나요?',
    ],
    strongFollowUps: [
      '그 설계가 잘 통했다고 보시는 근거를 수치로 한 번만 더 말해 주시겠어요?',
      '그 접근을 다른 도메인(세션·권한)에도 그대로 적용할 수 있다고 보시나요?',
      '잘하신 부분을 팀 표준으로 올리려면 어떤 가드레일을 두시겠습니까?',
    ],
  },
  {
    key: 'scale',
    main: '트래픽이 10배 뛰었을 때 현재 아키텍처에서 가장 먼저 무너질 지점은 어디라고 보시나요?',
    weakFollowUps: [
      '병목만 짚고 끝인가요? 그다음 완화 순서를 말씀해 주시죠.',
      'DB가 먼저라면 리드 레플리카와 샤딩 중 무엇을 먼저 검토하시겠습니까?',
      '그 판단의 근거가 되는 메트릭은 구체적으로 무엇인가요?',
    ],
    strongFollowUps: [
      '그 병목 예측이 맞았던 실측 경험이 있다면 짧게 들려주시죠.',
      '그 대응이 비용 측면에서 정당했는지 어떻게 설득하셨나요?',
      '비슷한 부하를 다시 맞닥뜨린다면 무엇을 먼저 바꾸시겠습니까?',
    ],
  },
  {
    key: 'tradeoff',
    main: '최근 프로젝트에서 기술 선택 시 가장 크게 포기한 것과, 그 대신 얻은 것은 무엇인가요?',
    weakFollowUps: [
      '포기한 쪽이 장애로 이어질 가능성은 어떻게 막으셨죠?',
      '그 트레이드오프를 비개발 이해관계자에게는 어떻게 설명하셨나요?',
      '지금 다시 선택한다면 같은 결정을 하시겠습니까?',
    ],
    strongFollowUps: [
      '그 결정이 잘 통한 지점을 한 가지 더 파고들어 볼까요?',
      '팀원이 반대했을 때 어떻게 합의를 이끌어 내셨나요?',
      '그 선택의 한계를 모니터링으로 어떻게 보완하셨는지요?',
    ],
  },
  {
    key: 'incident',
    main: '가장 기억에 남는 장애(또는 준장애)에서 본인이 맡은 역할과 사후 개선을 말씀해 주세요.',
    weakFollowUps: [
      '재발 방지가 문서뿐이라면, 시스템적으로 막은 장치는 없나요?',
      '온콜 핸드오프나 커뮤니케이션에서 아쉬웠던 점은요?',
      '그 장애를 미리 막을 수 있었던 시그널은 무엇이었을까요?',
    ],
    strongFollowUps: [
      '그 사후 개선이 실제로 효과를 낸 지표가 있다면 공유해 주시죠.',
      '그 경험을 신입에게 전수한다면 어떤 체크리스트로 정리하시겠습니까?',
      '비슷한 장애를 다른 팀이 겪을 때 어떤 지원을 하시겠습니까?',
    ],
  },
  {
    key: 'culture',
    main: '의견이 갈리는 기술 토론에서, 본인이 ‘틀린 쪽’이 되었을 때 어떻게 행동하시나요?',
    weakFollowUps: [
      '그 상황에서 감정을 배제하고 의사결정 기록을 남긴 사례가 있나요?',
      '그래도 본인 주장을 한 번 더 밀어붙인 적은 없습니까?',
      '팀 신뢰를 회복하기 위해 구체적으로 무엇을 하셨죠?',
    ],
    strongFollowUps: [
      '그 태도가 팀에 준 긍정적 영향을 한 가지 더 말해 주시겠어요?',
      '같은 상황에서 리더라면 어떤 퍼실리테이션을 하시겠습니까?',
      '그 경험을 채용 면접관 관점에서 어떻게 평가하시겠습니까?',
    ],
  },
];

interface SessionState {
  sessionId: string;
  keyword: string;
  gauge: number;
  utteranceCount: number;
  followUpStreak: number;
  topicIndex: number;
  evaluations: EvaluationDetail[];
  currentQuestion: Question;
  ended: boolean;
  endReason?: ChallengeFinalResult['endReason'];
  turn: number;
}

const sessions = new Map<string, SessionState>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function topicAt(index: number): TopicBank {
  return TOPIC_BANKS[index % TOPIC_BANKS.length]!;
}

function makeQuestionId(turn: number): string {
  return `lv4-q${turn}`;
}

function buildMeta(state: SessionState, lastDelta?: number): ChallengeTurnMeta {
  return {
    mode: 'level4-challenge',
    challengeGauge: state.gauge,
    utteranceCount: state.utteranceCount,
    maxUtterances: MAX_UTTERANCES,
    followUpStreak: state.followUpStreak,
    maxFollowUps: MAX_FOLLOW_UPS,
    failThreshold: FAIL_THRESHOLD,
    passThreshold: PASS_THRESHOLD,
    lastDelta,
    endReason: state.endReason,
  };
}

/**
 * mock 채점: 길이·구체성 키워드로 대략적 품질을 흉내 낸다.
 * (실제 LLM 채점 전 UX/규칙 검증용)
 */
export function scoreAnswerMock(answerText: string): { delta: number; feedback: string; quality: 'weak' | 'ok' | 'strong' } {
  const text = answerText.trim();
  const length = text.length;
  const concreteHints = [
    '때문에', '그래서', '예를', '지표', 'latency', '처리량', '재시도', '타임아웃',
    '샤딩', '캐시', '모니터링', '알림', '롤백', '트레이드오프', 'SLA', 'p99',
  ];
  const hitCount = concreteHints.filter((hint) => text.toLowerCase().includes(hint.toLowerCase())).length;

  if (length < 25) {
    return {
      delta: -18,
      feedback: '답변이 너무 짧습니다. 근거와 구체 사례가 보이지 않습니다.',
      quality: 'weak',
    };
  }
  if (length < 60 && hitCount === 0) {
    return {
      delta: -10,
      feedback: '방향은 보이나 근거가 빈약합니다. 왜 그렇게 했는지가 필요합니다.',
      quality: 'weak',
    };
  }
  if (length >= 90 && hitCount >= 2) {
    return {
      delta: 14,
      feedback: '근거와 구체성이 분명합니다. 그 강점을 조금 더 파고들어 보겠습니다.',
      quality: 'strong',
    };
  }
  if (length >= 60 || hitCount >= 1) {
    return {
      delta: 8,
      feedback: '기본 골격은 갖췄습니다. 한 단계 더 깊은 판단 근거를 듣고 싶습니다.',
      quality: 'ok',
    };
  }
  return {
    delta: -4,
    feedback: '설명은 있으나 설득력이 부족합니다. 보완이 필요합니다.',
    quality: 'weak',
  };
}

function pickNextQuestion(state: SessionState, quality: 'weak' | 'ok' | 'strong'): Question {
  const topic = topicAt(state.topicIndex);
  const wantFollowUp =
    quality !== 'ok'
    && state.followUpStreak < MAX_FOLLOW_UPS
    && state.utteranceCount < MAX_UTTERANCES;

  if (wantFollowUp) {
    const pool = quality === 'weak' ? topic.weakFollowUps : topic.strongFollowUps;
    const idx = Math.min(state.followUpStreak, pool.length - 1);
    state.followUpStreak += 1;
    state.turn += 1;
    return {
      id: makeQuestionId(state.turn),
      content: pool[idx] ?? pool[pool.length - 1]!,
      type: 'FOLLOW_UP',
    };
  }

  state.followUpStreak = 0;
  state.topicIndex += 1;
  state.turn += 1;
  const nextTopic = topicAt(state.topicIndex);
  return {
    id: makeQuestionId(state.turn),
    content: nextTopic.main,
    type: 'MAIN',
  };
}

function toResponse(state: SessionState, options?: {
  lastDelta?: number;
  interviewerLine?: string;
}): InterviewResponse {
  const ended = state.ended;
  return {
    sessionId: state.sessionId,
    evaluations: [...state.evaluations],
    totalScore: state.gauge,
    passed: state.endReason === 'PASS',
    overallFeedback: options?.interviewerLine,
    nextTurn: ended
      ? { type: 'END', turn: state.turn }
      : { type: 'FOLLOW_UP', turn: state.turn, questionId: state.currentQuestion.id, question: state.currentQuestion.content },
    questions: ended ? undefined : [state.currentQuestion],
    challenge: buildMeta(state, options?.lastDelta),
  };
}

export function isLevel4ChallengeInterviewerId(interviewerId: string | undefined | null): boolean {
  return String(interviewerId ?? '') === LEVEL4_INTERVIEWER_ID;
}

export function getLevel4ChallengeInterviewerStub(unlocked = true) {
  return {
    id: LEVEL4_INTERVIEWER_ID,
    name: '이중인격 임원',
    level: LEVEL4_LEVEL,
    requiredGauge: 100,
    isUnlocked: unlocked,
    description: '챌린지 모드(목업). 답변마다 채점되며 게이지로 즉시 합격/탈락이 갈립니다.',
    achievement: '제한된 발화 안에서 설득력 있는 근거로 임원을 납득시킬 수 있습니다.',
    avatar: '',
    comingSoon: false,
  };
}

export const level4ChallengeMock = {
  startInterview: async (
    _interviewerId: string,
    _resumeId: string,
    selectedKeyword: string,
  ): Promise<InterviewResponse> => {
    await delay(700);
    const sessionId = `lv4_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const turn = 1;
    const first: Question = {
      id: makeQuestionId(turn),
      content: `${TOPIC_BANKS[0]!.main}\n(키워드 힌트: ${selectedKeyword})`,
      type: 'MAIN',
    };
    const state: SessionState = {
      sessionId,
      keyword: selectedKeyword,
      gauge: START_GAUGE,
      utteranceCount: 0,
      followUpStreak: 0,
      topicIndex: 0,
      evaluations: [],
      currentQuestion: first,
      ended: false,
      turn,
    };
    sessions.set(sessionId, state);
    return toResponse(state);
  },

  /** 챌린지는 본문항/꼬리 구분 없이 매 답변마다 동일 경로로 채점한다. */
  submitTurn: async (sessionId: string, answer: Answer): Promise<InterviewResponse> => {
    await delay(900);
    const state = sessions.get(sessionId);
    if (!state) {
      throw new Error('Lv.4 챌린지 세션을 찾을 수 없습니다. 면접을 다시 시작해 주세요.');
    }
    if (state.ended) {
      return toResponse(state);
    }

    const scored = scoreAnswerMock(answer.content);
    state.utteranceCount += 1;
    state.gauge = clamp(state.gauge + scored.delta, 0, 100);
    state.evaluations.push({
      questionId: answer.questionId || state.currentQuestion.id,
      score: clamp(Math.round((scored.delta + 20) * 1.2), 0, 25),
      feedback: scored.feedback,
    });

    if (state.gauge <= FAIL_THRESHOLD) {
      state.ended = true;
      state.endReason = 'FAIL';
      return toResponse(state, {
        lastDelta: scored.delta,
        interviewerLine: scored.feedback,
      });
    }
    if (state.gauge >= PASS_THRESHOLD) {
      state.ended = true;
      state.endReason = 'PASS';
      return toResponse(state, {
        lastDelta: scored.delta,
        interviewerLine: scored.feedback,
      });
    }
    if (state.utteranceCount >= MAX_UTTERANCES) {
      state.ended = true;
      state.endReason = state.gauge >= PASS_THRESHOLD ? 'PASS' : 'FAIL';
      // 상한 도달 시 임계 미달이면 FAIL로 본다 (게이지가 애매하면 MAX 멘트로 구분).
      if (state.gauge > FAIL_THRESHOLD && state.gauge < PASS_THRESHOLD) {
        state.endReason = 'MAX_UTTERANCES';
      }
      return toResponse(state, {
        lastDelta: scored.delta,
        interviewerLine: scored.feedback,
      });
    }

    state.currentQuestion = pickNextQuestion(state, scored.quality);
    return toResponse(state, {
      lastDelta: scored.delta,
      interviewerLine: scored.feedback,
    });
  },

  buildFinalResult(response: InterviewResponse): ChallengeFinalResult {
    const challenge = response.challenge;
    if (!challenge) {
      throw new Error('챌린지 메타데이터가 없습니다.');
    }
    const endReason = challenge.endReason ?? (response.passed ? 'PASS' : 'FAIL');
    const closingMessage =
      endReason === 'PASS'
        ? LEVEL4_CLOSING.PASS
        : endReason === 'FAIL'
          ? LEVEL4_CLOSING.FAIL
          : LEVEL4_CLOSING.MAX;

    return {
      mode: 'level4-challenge',
      evaluations: response.evaluations ?? [],
      totalScore: challenge.challengeGauge,
      passed: endReason === 'PASS',
      overallFeedback:
        endReason === 'PASS'
          ? '챌린지 모드에서 성과 게이지가 합격선에 도달했습니다. (프론트 목업 채점)'
          : endReason === 'FAIL'
            ? '챌린지 모드에서 성과 게이지가 탈락선 이하로 내려갔습니다. (프론트 목업 채점)'
            : '발화 상한에 도달해 면접이 종료되었습니다. (프론트 목업 채점)',
      challengeGauge: challenge.challengeGauge,
      utteranceCount: challenge.utteranceCount,
      endReason,
      closingMessage,
    };
  },

  /** 결과 화면용 — BE progress를 건드리지 않는 고정 스냅샷. */
  getMockGaugeUpdate(final: ChallengeFinalResult) {
    return {
      previousGauge: START_GAUGE,
      newGauge: final.challengeGauge,
      levelUp: false,
      unlockedLevel: 4,
      newlyAcquiredBadge: undefined,
    };
  },
};
