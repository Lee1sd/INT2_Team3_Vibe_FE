import assert from 'node:assert/strict';
import test from 'node:test';
import { getFollowUpQuestionId } from './followup-question';

test('본문항 4개면 꼬리질문 questionId는 5다 (#146/#93)', () => {
  assert.equal(getFollowUpQuestionId(4), '5');
});

test('구 3문항 체계에서는 4를 유지한다 (회귀 방지)', () => {
  assert.equal(getFollowUpQuestionId(3), '4');
});

test('문항 수가 바뀌어도 N+1로 자동 대응한다', () => {
  assert.equal(getFollowUpQuestionId(5), '6');
  assert.equal(getFollowUpQuestionId(1), '2');
});
