import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INVALID_JSON_RESPONSE_CODE,
  InterviewPostSubmitError,
  isPostSubmitFailure,
} from './submit-failure';

/** client.ts를 import하지 않고 ApiError의 형태만 흉내낸다 (import.meta.env 의존 회피). */
function apiErrorLike(code: string, status: number) {
  return { name: 'ApiError', code, status, message: 'x' };
}

test('후처리 실패는 제출 실패와 구분된다', () => {
  assert.equal(isPostSubmitFailure(new InterviewPostSubmitError('계약 위반')), true);
  assert.equal(isPostSubmitFailure(apiErrorLike(INVALID_JSON_RESPONSE_CODE, 200)), true);
});

test('일반 API 실패와 세션 만료는 후처리 실패가 아니다', () => {
  assert.equal(isPostSubmitFailure(apiErrorLike('INTERVIEW_ANSWER_TURNS_INVALID', 400)), false);
  assert.equal(isPostSubmitFailure(apiErrorLike('UNAUTHORIZED', 401)), false);
  assert.equal(isPostSubmitFailure(new Error('network down')), false);
});

test('에러가 아닌 값에도 안전하다', () => {
  assert.equal(isPostSubmitFailure(null), false);
  assert.equal(isPostSubmitFailure(undefined), false);
  assert.equal(isPostSubmitFailure('InterviewPostSubmitError'), false);
});
