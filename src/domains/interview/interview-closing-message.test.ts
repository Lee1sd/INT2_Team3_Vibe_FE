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

test('lenient closing message uses overall feedback with casual guidance', () => {
  const message = createInterviewClosingMessage(endSession, getInterviewerTone(1));

  assert.match(message, /수고하셨어요~/);
  assert.match(message, /캐싱 정합성 설명이 명확했습니다\./);
  assert.match(message, /확인해보세요!/);
});

test('strict closing message uses overall feedback with formal guidance', () => {
  const message = createInterviewClosingMessage(endSession, getInterviewerTone(2));

  assert.match(message, /답변 잘 들었습니다\./);
  assert.match(message, /캐싱 정합성 설명이 명확했습니다\./);
  assert.match(message, /결과지를 참고하시죠\./);
});

test('session feedback prefers overall feedback over evaluation feedback', () => {
  assert.equal(getSessionFeedback(endSession), '캐싱 정합성 설명이 명확했습니다.');
});
