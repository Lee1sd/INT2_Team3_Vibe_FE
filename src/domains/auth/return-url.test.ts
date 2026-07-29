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
  beginAuthExit,
  clearReturnUrl,
  completeAuthExit,
  consumeReturnUrl,
  isAuthExitInProgress,
  isSafeReturnUrl,
  saveReturnUrl,
} = await import('./return-url');

test('같은 출처 상대 경로만 허용한다', () => {
  assert.equal(isSafeReturnUrl('/mypage'), true);
  assert.equal(isSafeReturnUrl('/interview/1'), true);
  assert.equal(isSafeReturnUrl('/mypage?tab=profile#resume'), true);
  assert.equal(isSafeReturnUrl('https://evil.example/'), false);
  assert.equal(isSafeReturnUrl('//evil.example'), false);
  assert.equal(isSafeReturnUrl('/oauth/callback'), false);
});

test('returnUrl을 저장하고 소비하며 Strict Mode처럼 연속 호출해도 같은 값을 준다', () => {
  store.clear();
  saveReturnUrl('/mypage');
  assert.equal(consumeReturnUrl('/dungeon'), '/mypage');
  assert.equal(consumeReturnUrl('/dungeon'), '/mypage');
});

test('query string과 hash가 포함된 복귀 경로도 그대로 유지한다', () => {
  store.clear();
  const path = '/mypage?tab=profile#resume';
  saveReturnUrl(path);
  assert.equal(consumeReturnUrl('/dungeon'), path);
  assert.equal(consumeReturnUrl('/dungeon'), path);
});

test('clearReturnUrl 이후에는 fallback으로 돌아간다 (로그아웃 후 stale returnUrl 방지)', () => {
  store.clear();
  saveReturnUrl('/result/1');
  assert.equal(consumeReturnUrl('/dungeon'), '/result/1');
  clearReturnUrl();
  assert.equal(consumeReturnUrl('/dungeon'), '/dungeon');
});

test('새 returnUrl을 저장하면 이전 pending 값을 덮어쓴다', () => {
  store.clear();
  saveReturnUrl('/mypage');
  assert.equal(consumeReturnUrl('/dungeon'), '/mypage');
  saveReturnUrl('/interview/2?from=list');
  assert.equal(consumeReturnUrl('/dungeon'), '/interview/2?from=list');
});

test('명시적 로그아웃 중에는 마이페이지를 복귀 경로로 다시 저장하지 않는다', () => {
  store.clear();
  saveReturnUrl('/mypage');

  beginAuthExit();
  assert.equal(isAuthExitInProgress(), true);

  // 로그아웃 직후 RequireAuth effect가 늦게 실행되는 상황을 재현한다.
  saveReturnUrl('/mypage');
  assert.equal(consumeReturnUrl('/dungeon'), '/dungeon');

  completeAuthExit();
  assert.equal(isAuthExitInProgress(), false);
  saveReturnUrl('/interview/2');
  assert.equal(consumeReturnUrl('/dungeon'), '/interview/2');
});

test('로그아웃 흐름이 아니면 로그인 시작 시 기존 복귀 경로를 보존한다', () => {
  store.clear();
  saveReturnUrl('/result/3');

  assert.equal(completeAuthExit(), false);
  assert.equal(consumeReturnUrl('/dungeon'), '/result/3');
});
