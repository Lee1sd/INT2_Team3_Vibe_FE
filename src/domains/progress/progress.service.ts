// 페이지 컴포넌트가 실제로 import하는 진입점. VITE_USE_MOCK으로 mock/실제 API를 스위칭한다.
import { progressMock } from './progress.mock';
import { GaugeUpdate } from './progress.types';

interface ProgressService {
  getGaugeUpdate: (sessionId: string) => Promise<GaugeUpdate>;
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const realProgressService: ProgressService = {
  getGaugeUpdate: async () => {
    // UM-001은 "현재" 절대 게이지 값만 준다. "이전 값과 비교해 얼마나 올랐는지"는
    // IS-002b(면접 제출) 응답의 passed/totalScore와, 면접 시작 전에 프론트가 미리
    // 기억해둔 이전 게이지 값을 조합해서 계산해야 한다. 최용성(③)과 화면 흐름을
    // 다시 설계해야 이 함수를 구현할 수 있다.
    throw new Error(
      'sessionId 기준으로 게이지 변화량을 알려주는 API가 없습니다(UM-001은 현재 절대값만 반환). ' +
        '백엔드팀(최용성)과 화면 흐름을 다시 설계하세요.'
    );
  },
};

export const evaluationService: ProgressService = USE_MOCK ? progressMock : realProgressService;
