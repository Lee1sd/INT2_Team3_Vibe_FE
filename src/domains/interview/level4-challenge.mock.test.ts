import {
  scoreAnswerMock,
  LEVEL4_CLOSING,
  level4ChallengeMock,
} from './level4-challenge.mock';
import { InterviewResponse } from './interview.types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const short = scoreAnswerMock('네');
assert(short.quality === 'weak' && short.delta === -18, `짧은 답변 delta=-18 기대, 실제=${short.delta}`);

const strong = scoreAnswerMock(
  '때문에 캐시 미스 폭주가 있었고 그래서 p99 latency를 모니터링하며 재시도와 타임아웃을 조정했습니다. 예를 들어 처리량 지표로 트레이드오프를 설득했습니다.',
);
assert(strong.quality === 'strong' && strong.delta === 14, `구체적 답변 delta=14 기대, 실제=${strong.delta}`);

assert(LEVEL4_CLOSING.FAIL === '더이상 들을 필요도 없을 것 같군요', 'FAIL 종료 멘트 불일치');
assert(
  LEVEL4_CLOSING.PASS === '충분히 들은 것 같습니다. 결과 화면 확인해주시면 될 것 같아요. 고생 많으셨습니다.',
  'PASS 종료 멘트 불일치',
);
assert(
  LEVEL4_CLOSING.MAX === '제한된 발화 횟수 안에 판단을 마쳤습니다. 결과 화면을 확인해 주세요.',
  'MAX 종료 멘트 불일치',
);

function makeEndResponse(endReason: 'PASS' | 'FAIL' | 'MAX_UTTERANCES', gauge: number): InterviewResponse {
  return {
    passed: endReason === 'PASS',
    nextTurn: { type: 'END', turn: 3 },
    evaluations: [{ questionId: 'lv4-q1', score: 20, feedback: 'ok' }],
    totalScore: gauge,
    challenge: {
      mode: 'level4-challenge',
      challengeGauge: gauge,
      utteranceCount: 3,
      maxUtterances: 20,
      followUpStreak: 0,
      maxFollowUps: 3,
      failThreshold: 25,
      passThreshold: 80,
      endReason,
    },
  };
}

const passFinal = level4ChallengeMock.buildFinalResult(makeEndResponse('PASS', 85));
assert(passFinal.endReason === 'PASS' && passFinal.closingMessage === LEVEL4_CLOSING.PASS, 'PASS buildFinalResult');

const failFinal = level4ChallengeMock.buildFinalResult(makeEndResponse('FAIL', 20));
assert(failFinal.endReason === 'FAIL' && failFinal.closingMessage === LEVEL4_CLOSING.FAIL, 'FAIL buildFinalResult');

const maxFinal = level4ChallengeMock.buildFinalResult(makeEndResponse('MAX_UTTERANCES', 50));
assert(maxFinal.endReason === 'MAX_UTTERANCES' && maxFinal.closingMessage === LEVEL4_CLOSING.MAX, 'MAX buildFinalResult');

console.log('level4-challenge.mock.test.ts: ok');
