// 백엔드 domain.progress/judgment 패키지(최용성 담당)와 짝을 이루는 타입.
// 근거: docs/api/api-spec.md UM-001, BG-001.
//
// 주의(FE/BE 불일치, 실제 연동 전 정리 필요): 백엔드에는 "이 세션 결과로 게이지가 얼마나
// 올랐는지" 하나로 알려주는 API가 없다. UM-001은 현재 시점의 절대값(unlockedLevel/progressGauge)만
// 반환하고, "이전 값"과의 비교(previousGauge)나 unlockedInterviewerId는 세션 제출 응답(IS-002b의
// passed/totalScore)과 프론트에서 직접 조합해야 한다.
export interface GaugeUpdate {
  previousGauge: number;
  newGauge: number;
  levelUp: boolean;
  unlockedInterviewerId?: string;
}
