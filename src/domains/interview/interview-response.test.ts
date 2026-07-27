import assert from 'node:assert/strict';
import test from 'node:test';
import { toFollowUpQuestion } from './interview-response';

test('꼬리질문은 최저점 원문항과 구분해 turn 5로 매핑한다', () => {
  const mapped = toFollowUpQuestion('캐시 정합성을 어떻게 보장했나요?');

  assert.equal(mapped.id, '5');
  assert.equal(mapped.content, '캐시 정합성을 어떻게 보장했나요?');
  assert.equal(mapped.type, 'FOLLOW_UP');
});
