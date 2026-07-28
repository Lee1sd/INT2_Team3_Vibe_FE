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
  clearIntentionalSignOut,
  clearReturnUrl,
  consumeReturnUrl,
  isIntentionalSignOut,
  isSafeReturnUrl,
  markIntentionalSignOut,
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

test('의도적 로그아웃 표시는 다음 로그인까지 유지되고 해제할 수 있다', () => {
  store.clear();
  clearIntentionalSignOut();
  assert.equal(isIntentionalSignOut(), false);
  markIntentionalSignOut();
  assert.equal(isIntentionalSignOut(), true);
  // Strict Mode처럼 가드 effect가 두 번 돌아도 표시가 사라지지 않아야 한다.
  assert.equal(isIntentionalSignOut(), true);
  clearIntentionalSignOut();
  assert.equal(isIntentionalSignOut(), false);
});

test('새 returnUrl을 저장하면 이전 pending 값을 덮어쓴다', () => {
  store.clear();
  saveReturnUrl('/mypage');
  assert.equal(consumeReturnUrl('/dungeon'), '/mypage');
  saveReturnUrl('/interview/2?from=list');
  assert.equal(consumeReturnUrl('/dungeon'), '/interview/2?from=list');
});
