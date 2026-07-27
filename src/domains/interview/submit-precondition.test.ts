import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateSubmitPrecondition } from './submit-precondition';

test('토큰이 null이면 제출을 막고 안내 문구를 반환한다 (#87)', () => {
  const result = evaluateSubmitPrecondition(null);
  assert.equal(result.canSubmit, false);
  assert.ok(result.notice && result.notice.length > 0);
});

test('토큰이 빈 문자열이어도 제출을 막는다', () => {
  const result = evaluateSubmitPrecondition('');
  assert.equal(result.canSubmit, false);
  assert.ok(result.notice && result.notice.length > 0);
});

test('유효한 토큰이면 제출을 허용하고 안내가 없다', () => {
  const result = evaluateSubmitPrecondition('header.payload.signature');
  assert.equal(result.canSubmit, true);
  assert.equal(result.notice, undefined);
});
