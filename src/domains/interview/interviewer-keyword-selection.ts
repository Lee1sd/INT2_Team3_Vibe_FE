/** 면접관 ID별로 독립적인 키워드 선택 상태를 저장한다. */
export type InterviewerKeywordSelections = Readonly<Record<string, string>>;

/** 다른 면접관의 선택은 유지하면서 지정한 면접관의 키워드만 갱신한다. */
export function selectInterviewerKeyword(
  selections: InterviewerKeywordSelections,
  interviewerId: string,
  keyword: string,
): InterviewerKeywordSelections {
  return {
    ...selections,
    [interviewerId]: keyword,
  };
}

/** 지정한 면접관에게 선택된 키워드가 없으면 빈 문자열을 반환한다. */
export function getInterviewerKeyword(
  selections: InterviewerKeywordSelections,
  interviewerId: string,
): string {
  return selections[interviewerId] ?? '';
}
