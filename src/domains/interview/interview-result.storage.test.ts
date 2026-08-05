import assert from 'node:assert/strict';
import test from 'node:test';

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key: () => null,
  } satisfies Storage,
  configurable: true,
});

const {
  getFinalEvaluationCount,
  isFinalInterviewResult,
  loadFinalInterviewResult,
  passingScoreForLevel,
  saveFinalInterviewResult,
  toFinalInterviewResult,
} = await import('./interview-result.storage');

/** 본문항 N개 + 꼬리질문 1개가 모두 평가된 최종 판정 응답을 만든다. */
function finalResultWith(evaluationCount: number, totalScore = 90) {
  return {
    evaluations: Array.from({ length: evaluationCount }, (_, index) => ({
      questionId: String(index + 1),
      score: 18,
      feedback: '피드백',
    })),
    totalScore,
    passed: totalScore >= 80,
    overallFeedback: '전반적으로 좋았습니다.',
  };
}

test('꼬리질문 questionId는 본문항 수에서 유도한다 (본문항 4개 → 최종 5개)', () => {
  assert.equal(getFinalEvaluationCount(4), 5);
  assert.equal(getFinalEvaluationCount(3), 4);
});

/** toFinalInterviewResult는 IS-002b 화면 응답을 받으므로 nextTurn까지 갖춘 형태로 감싼다. */
function endResponseWith(evaluationCount: number, totalScore = 90) {
  return {
    ...finalResultWith(evaluationCount, totalScore),
    nextTurn: { type: 'END' as const, turn: 3 },
  };
}

test('본문항 4개 + 꼬리질문 1개인 최종 판정 응답을 통과시킨다 (#95 회귀)', () => {
  const expected = finalResultWith(5);
  assert.equal(isFinalInterviewResult(expected, getFinalEvaluationCount(4)), true);
  // 응답에 섞인 nextTurn은 걸러내고 최종 판정 필드만 남긴다.
  assert.deepEqual(toFinalInterviewResult(endResponseWith(5), getFinalEvaluationCount(4)), expected);
});

test('개수를 알고 있으면 불일치를 거부한다', () => {
  assert.equal(isFinalInterviewResult(finalResultWith(4), getFinalEvaluationCount(4)), false);
  assert.equal(isFinalInterviewResult(finalResultWith(6), getFinalEvaluationCount(4)), false);
});

test('개수를 모르면 하한만 검사해 문항 수 변경에도 깨지지 않는다', () => {
  // 저장소/라우터에서 읽은 값은 본문항 수를 알 수 없다 — 개수를 하드코딩하지 않는다.
  assert.equal(isFinalInterviewResult(finalResultWith(4)), true);
  assert.equal(isFinalInterviewResult(finalResultWith(5)), true);
  assert.equal(isFinalInterviewResult(finalResultWith(6)), true);
  assert.equal(isFinalInterviewResult(finalResultWith(1)), false);
});

test('questionId가 중복이면 거부한다', () => {
  const duplicated = finalResultWith(5);
  duplicated.evaluations[4].questionId = duplicated.evaluations[0].questionId;
  assert.equal(isFinalInterviewResult(duplicated, 5), false);
});

test('Lv.1 합격선 하한(60점) 응답을 결과로 변환·저장할 수 있다 (ADR-023 회귀)', () => {
  // BE는 Lv.1에서 totalScore=60, passed=true 를 줄 수 있다.
  // FE가 80점 고정으로 대조하면 결과 화면 준비 실패(#95)가 난다.
  const response = {
    ...endResponseWith(5, 60),
    passed: true,
  };
  const lv1Pass = toFinalInterviewResult(response, 5, 1);

  assert.equal(isFinalInterviewResult(lv1Pass, 5), true);
  assert.equal(lv1Pass.totalScore, 60);
  assert.equal(lv1Pass.passed, true);
  assert.equal(lv1Pass.interviewLevel, 1);

  store.clear();
  saveFinalInterviewResult('lv1-boundary', lv1Pass);
  assert.deepEqual(loadFinalInterviewResult('lv1-boundary'), lv1Pass);
});

test('passed가 boolean이 아니면 거부한다', () => {
  const invalid = { ...finalResultWith(5, 90), passed: 'yes' as unknown as boolean };
  assert.equal(isFinalInterviewResult(invalid, 5), false);
});

test('레벨별 합격선을 BE StageGaugePolicy와 맞춘다', () => {
  assert.equal(passingScoreForLevel(1), 60);
  assert.equal(passingScoreForLevel(2), 80);
  assert.equal(passingScoreForLevel(3), 80);
  assert.equal(passingScoreForLevel(undefined), 80);
});

test('계약 위반은 제출 실패와 구분되는 후처리 에러로 던진다', () => {
  assert.throws(
    () => toFinalInterviewResult(endResponseWith(4), getFinalEvaluationCount(4)),
    (error: Error) => error.name === 'InterviewPostSubmitError',
  );
});

test('최종 판정을 세션별로 저장하고 다시 읽는다', () => {
  store.clear();
  const response = finalResultWith(5);
  saveFinalInterviewResult('42', response);
  assert.deepEqual(loadFinalInterviewResult('42'), response);
  assert.equal(loadFinalInterviewResult('43'), null);
});

test('저장된 값이 계약을 어기면 사용하지 않는다', () => {
  store.clear();
  sessionStorage.setItem('career-dungeon:interview-result:42', JSON.stringify({ evaluations: [] }));
  assert.equal(loadFinalInterviewResult('42'), null);
});
