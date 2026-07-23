import assert from 'node:assert/strict';
import test from 'node:test';
import { selectAcquiredBadges } from './progress.badges';
import { UserBadge } from './progress.types';

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
