import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveActiveResumeId, markResumeAsSelected } from './resume.types';
import type { ResumeApiResponse } from './resume.api';

// 이 테스트 러너(node:test)에는 전역 localStorage가 없다. getStoredSelectedResumeId/
// setStoredSelectedResumeId의 try/catch가 이를 흡수해 항상 "저장된 선택 없음"으로
// 동작하므로, 여기서는 그 다음 우선순위(isLastUsed)와 필터링 로직만 검증한다.

function makeResume(overrides: Partial<ResumeApiResponse>): ResumeApiResponse {
  return {
    resumeId: 1,
    type: 'RESUME',
    parseStatus: 'DONE',
    ...overrides,
  };
}

test('resolveActiveResumeId falls back to isLastUsed when nothing is stored', () => {
  const resumes = [
    makeResume({ resumeId: 1, isLastUsed: false }),
    makeResume({ resumeId: 2, isLastUsed: true }),
  ];
  assert.equal(resolveActiveResumeId(resumes), '2');
});

test('resolveActiveResumeId returns null for a brand-new user (no isLastUsed, nothing stored)', () => {
  const resumes = [
    makeResume({ resumeId: 1, isLastUsed: false }),
    makeResume({ resumeId: 2, isLastUsed: false }),
  ];
  assert.equal(resolveActiveResumeId(resumes), null);
});

test('resolveActiveResumeId ignores PORTFOLIO entries even if isLastUsed', () => {
  const resumes = [
    makeResume({ resumeId: 1, type: 'PORTFOLIO', isLastUsed: true }),
  ];
  assert.equal(resolveActiveResumeId(resumes), null);
});

test('resolveActiveResumeId ignores non-DONE resumes even if isLastUsed', () => {
  const resumes = [
    makeResume({ resumeId: 1, parseStatus: 'PROCESSING', isLastUsed: true }),
  ];
  assert.equal(resolveActiveResumeId(resumes), null);
});

test('resolveActiveResumeId returns null on an empty list', () => {
  assert.equal(resolveActiveResumeId([]), null);
});

test('markResumeAsSelected does not throw even without localStorage', () => {
  assert.doesNotThrow(() => markResumeAsSelected('123'));
});
