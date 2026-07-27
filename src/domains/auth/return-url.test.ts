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

const { clearReturnUrl, consumeReturnUrl, isSafeReturnUrl, saveReturnUrl } = await import('./return-url');

test('같은 출처 상대 경로만 허용한다', () => {
  assert.equal(isSafeReturnUrl('/mypage'), true);
  assert.equal(isSafeReturnUrl('/interview/1'), true);
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

test('clearReturnUrl 이후에는 fallback으로 돌아간다', () => {
  store.clear();
  saveReturnUrl('/result/1');
  assert.equal(consumeReturnUrl('/dungeon'), '/result/1');
  clearReturnUrl();
  assert.equal(consumeReturnUrl('/dungeon'), '/dungeon');
});
