import assert from 'node:assert/strict';
import test from 'node:test';
import { selectAcquiredBadges, selectBadgeCatalog } from './progress.badges';
import { BadgeApiItem, UserBadge } from './progress.types';

/** 획득 목록 선택 테스트에서 사용할 잠금 포함 도감 데이터를 생성한다. */
function badge(stage: number, acquired: boolean): UserBadge {
  return {
    badgeId: stage,
    stage,
    name: `프로그래머쓱 LEVEL ${stage}`,
    imageUrl: `/badges/Level${stage}.png`,
    acquired,
    acquiredAt: acquired ? '2026-07-23T00:00:00Z' : null,
  };
}

test('잠금 뱃지는 보유 목록에서 제외하고 획득 뱃지만 Stage 순서로 반환한다', () => {
  const acquiredBadges = selectAcquiredBadges([
    badge(3, false),
    badge(2, true),
    badge(1, true),
    badge(4, false),
  ]);

  assert.deepEqual(acquiredBadges.map((item) => item.stage), [1, 2]);
});

test('구 BG-001 응답은 acquiredAt이 있는 항목을 획득 뱃지로 유지한다', () => {
  const legacyBadge: BadgeApiItem = {
    badgeId: 1,
    stage: 1,
    name: '프로그래머쓱 LEVEL 1',
    imageUrl: '/badges/Level1.png',
    acquiredAt: '2026-07-23T00:00:00Z',
  };

  assert.deepEqual(selectAcquiredBadges([legacyBadge]).map((item) => item.stage), [1]);
});

test('구 BG-001 응답에서 acquiredAt이 없으면 미획득 상태로 정규화한다', () => {
  const legacyLockedBadge: BadgeApiItem = {
    badgeId: 2,
    stage: 2,
    name: '프로그래머쓱 LEVEL 2',
    imageUrl: '/badges/Level2.png',
    acquiredAt: null,
  };

  assert.deepEqual(selectAcquiredBadges([legacyLockedBadge]), []);
});

test('catalog가 없으면 기존 badges를 도감 대체값으로 사용한다', () => {
  const legacyOwnedBadge: BadgeApiItem = {
    badgeId: 1,
    stage: 1,
    name: '프로그래머쓱 LEVEL 1',
    imageUrl: '/badges/Level1.png',
    acquiredAt: '2026-07-23T00:00:00Z',
  };

  const catalog = selectBadgeCatalog({ badges: [legacyOwnedBadge] });

  assert.equal(catalog[0].acquired, true);
  assert.deepEqual(catalog.map((item) => item.stage), [1]);
});

test('신 BG-001 응답은 badges가 아닌 catalog 전체 도감을 사용한다', () => {
  const acquiredBadge = badge(1, true);
  const lockedBadge = badge(2, false);

  const catalog = selectBadgeCatalog({
    badges: [acquiredBadge],
    catalog: [acquiredBadge, lockedBadge],
  });

  assert.deepEqual(catalog.map((item) => item.stage), [1, 2]);
  assert.equal(catalog[1].acquired, false);
});
