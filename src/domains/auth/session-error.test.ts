import assert from 'node:assert/strict';
import test from 'node:test';
import { isSessionExpiredError } from './session-error';

/** ApiError(api/client.ts)는 name='ApiError'와 status를 보장한다. 형태로 모사한다. */
const apiError = (status: number) => ({ name: 'ApiError', status });

test('401 ApiError는 세션 만료로 식별한다 (#89)', () => {
  assert.equal(isSessionExpiredError(apiError(401)), true);
});

test('401이 아닌 ApiError는 세션 만료가 아니다', () => {
  assert.equal(isSessionExpiredError(apiError(500)), false);
  assert.equal(isSessionExpiredError(apiError(403)), false);
});

test('ApiError가 아닌 일반 Error/객체는 세션 만료가 아니다', () => {
  assert.equal(isSessionExpiredError(new Error('network')), false);
  assert.equal(isSessionExpiredError({ status: 401 }), false);
});

test('null/undefined/원시값은 세션 만료가 아니다', () => {
  assert.equal(isSessionExpiredError(null), false);
  assert.equal(isSessionExpiredError(undefined), false);
  assert.equal(isSessionExpiredError('401'), false);
});
