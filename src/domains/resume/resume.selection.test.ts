import assert from 'node:assert/strict';
import test from 'node:test';
import type { ResumeApiResponse } from './resume.api';

// node:test 환경엔 전역 localStorage가 없다. getStoredSelectedResumeId/setStoredSelectedResumeId의
// try/catch가 이를 흡수해버려서, 저장된 선택값이 실제로 우선되는지(특히 삭제 시나리오)는
// 최소한의 in-memory 폴리필 없이는 검증할 수 없다.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

(globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();

import { resolveActiveResumeId, markResumeAsSelected, getStoredSelectedResumeId } from './resume.types';

test.beforeEach(() => {
  localStorage.clear();
});

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

test('resolveActiveResumeId prefers the stored selection over isLastUsed', () => {
  markResumeAsSelected('1');
  const resumes = [
    makeResume({ resumeId: 1, isLastUsed: false }),
    makeResume({ resumeId: 2, isLastUsed: true }),
  ];
  assert.equal(resolveActiveResumeId(resumes), '1');
});

test('resolveActiveResumeId falls back to isLastUsed when the stored resume was deleted', () => {
  markResumeAsSelected('1');
  // 이력서 1은 삭제되어 더 이상 목록에 없다 — 남은 이력서 중 isLastUsed로 폴백해야 한다.
  const resumes = [
    makeResume({ resumeId: 2, isLastUsed: true }),
  ];
  assert.equal(resolveActiveResumeId(resumes), '2');
});

test('resolveActiveResumeId returns null when the stored resume was deleted and nothing else qualifies', () => {
  markResumeAsSelected('1');
  assert.equal(resolveActiveResumeId([]), null);
});

test('markResumeAsSelected right after upload makes the resume immediately usable for a new interview', () => {
  // 신규 사용자가 방금 업로드해서 자동 선택된 이력서로, 새로고침 없이 바로 면접을 시작할 수 있어야 한다.
  markResumeAsSelected('42');
  const resumes = [makeResume({ resumeId: 42, isLastUsed: false })];
  assert.equal(resolveActiveResumeId(resumes), '42');
  assert.equal(getStoredSelectedResumeId(), '42');
});
