import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getInterviewerKeyword,
  selectInterviewerKeyword,
} from './interviewer-keyword-selection';

test('Lv.2 키워드를 선택해도 Lv.1 선택 상태는 변경되지 않는다', () => {
  const levelOneSelected = selectInterviewerKeyword({}, 'lv1-interviewer', 'DB');
  const levelTwoSelected = selectInterviewerKeyword(
    levelOneSelected,
    'lv2-interviewer',
    '시스템설계',
  );

  assert.equal(getInterviewerKeyword(levelTwoSelected, 'lv1-interviewer'), 'DB');
  assert.equal(getInterviewerKeyword(levelTwoSelected, 'lv2-interviewer'), '시스템설계');
});

test('같은 키워드도 면접관별 선택 여부를 독립적으로 판단한다', () => {
  const selections = selectInterviewerKeyword({}, 'lv2-interviewer', '보안');

  assert.equal(getInterviewerKeyword(selections, 'lv1-interviewer'), '');
  assert.equal(getInterviewerKeyword(selections, 'lv2-interviewer'), '보안');
});
