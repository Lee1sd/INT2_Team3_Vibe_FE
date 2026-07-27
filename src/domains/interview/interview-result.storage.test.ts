import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isFinalInterviewResult,
  toFinalInterviewResult,
} from './interview-result.storage';
import { getInterviewPassingScore } from './interview-score-policy';
import { InterviewResponse } from './interview.types';

const fiveEvaluations = [1, 2, 3, 4, 5].map((questionId) => ({
  questionId: String(questionId),
  score: 20,
  feedback: `${questionId}번 피드백`,
}));

test('5문항·문항당 20점인 IS-002b 최종 결과를 허용한다', () => {
  assert.equal(isFinalInterviewResult({
    evaluations: fiveEvaluations,
    totalScore: 100,
    passed: true,
    overallFeedback: '종합 피드백',
    passingScore: 80,
  }), true);
});

test('기존 4문항 결과와 20점 초과 문항을 거부한다', () => {
  assert.equal(isFinalInterviewResult({
    evaluations: fiveEvaluations.slice(0, 4),
    totalScore: 80,
    passed: true,
    overallFeedback: '종합 피드백',
    passingScore: 80,
  }), false);

  assert.equal(isFinalInterviewResult({
    evaluations: fiveEvaluations.map((evaluation, index) => (
      index === 0 ? { ...evaluation, score: 21 } : evaluation
    )),
    totalScore: 101,
    passed: true,
    overallFeedback: '종합 피드백',
    passingScore: 80,
  }), false);
});

test('Lv.1은 60점, Lv.2는 80점 합격선을 적용한다', () => {
  assert.equal(getInterviewPassingScore(1), 60);
  assert.equal(getInterviewPassingScore(2), 80);

  const levelOneResponse: InterviewResponse = {
    evaluations: fiveEvaluations.map((evaluation) => ({ ...evaluation, score: 14 })),
    totalScore: 70,
    passed: true,
    overallFeedback: 'Lv.1 합격',
    nextTurn: { type: 'END', turn: 3 },
  };

  assert.equal(toFinalInterviewResult(levelOneResponse, 1).passingScore, 60);
  assert.throws(
    () => toFinalInterviewResult(levelOneResponse, 2),
    /IS-002b 계약/,
  );
});

test('문항 점수 합계와 totalScore가 다르면 거부한다', () => {
  assert.equal(isFinalInterviewResult({
    evaluations: fiveEvaluations,
    totalScore: 99,
    passed: true,
    overallFeedback: '종합 피드백',
    passingScore: 80,
  }), false);
});
