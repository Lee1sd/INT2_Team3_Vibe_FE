import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInterviewClosingMessage,
  getInterviewerTone,
  getSessionFeedback,
} from './interview-closing-message';
import { InterviewResponse } from './interview.types';

const endSession: InterviewResponse = {
  passed: true,
  nextTurn: { type: 'END', turn: 2 },
  evaluations: [
    {
      questionId: 'q1',
      score: 20,
      feedback: '개별 문항 피드백입니다.',
    },
  ],
  overallFeedback: '캐싱 정합성 설명이 명확했습니다.',
};

test('lenient closing message uses persona tone without feedback', () => {
  const message = createInterviewClosingMessage(getInterviewerTone(1));

  assert.equal(message, '수고하셨어요~ 오늘 답변 잘 들었습니다. 자세한 평가는 결과지에서 확인해보세요~');
  assert.doesNotMatch(message, /캐싱 정합성/);
});

test('strict closing message uses persona tone without feedback', () => {
  const message = createInterviewClosingMessage(getInterviewerTone(2));

  assert.equal(message, '수고하셨습니다. 상세 평가는 결과지를 참고하시기 바랍니다.');
  assert.doesNotMatch(message, /캐싱 정합성/);
});

test('level 3 interviewer uses strict closing tone', () => {
  const message = createInterviewClosingMessage(getInterviewerTone(3));

  assert.equal(message, '수고하셨습니다. 상세 평가는 결과지를 참고하시기 바랍니다.');
});

test('session feedback prefers overall feedback over evaluation feedback', () => {
  assert.equal(getSessionFeedback(endSession), '캐싱 정합성 설명이 명확했습니다.');
});

test('session feedback falls back to evaluation feedback when overall feedback is missing', () => {
  const sessionWithoutOverallFeedback: InterviewResponse = {
    ...endSession,
    overallFeedback: undefined,
  };

  assert.equal(getSessionFeedback(sessionWithoutOverallFeedback), '개별 문항 피드백입니다.');
});

test('session feedback returns empty string when no feedback is available', () => {
  const sessionWithoutFeedback: InterviewResponse = {
    passed: true,
    nextTurn: { type: 'END', turn: 2 },
    evaluations: [],
  };

  assert.equal(getSessionFeedback(sessionWithoutFeedback), '');
});
