import { scoreAnswerMock, LEVEL4_CLOSING } from './level4-challenge.mock';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const short = scoreAnswerMock('네');
assert(short.quality === 'weak' && short.delta < 0, '짧은 답변은 감점이어야 합니다');

const strong = scoreAnswerMock(
  '때문에 캐시 미스 폭주가 있었고 그래서 p99 latency를 모니터링하며 재시도와 타임아웃을 조정했습니다. 예를 들어 처리량 지표로 트레이드오프를 설득했습니다.',
);
assert(strong.quality === 'strong' && strong.delta > 0, '구체적 답변은 가점이어야 합니다');

assert(LEVEL4_CLOSING.FAIL.includes('들을 필요'), '실패 종료 멘트가 있어야 합니다');
assert(LEVEL4_CLOSING.PASS.includes('충분히 들은'), '성공 종료 멘트가 있어야 합니다');

console.log('level4-challenge.mock.test.ts: ok');
