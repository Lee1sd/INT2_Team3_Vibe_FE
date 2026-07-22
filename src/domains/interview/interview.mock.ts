// 백엔드 /api/interviewers, /api/interviews 등이 준비되기 전까지 면접 흐름을 검증하기 위한 목업 구현.
import { Interviewer, InterviewResponse, Question, Answer } from './interview.types';
import { staticAssetUrl } from '../../lib/staticAssetUrl';

export const interviewMock = {
  getInterviewers: async (): Promise<Interviewer[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 'iv1',
            name: '널널한 대리',
            level: 1,
            requiredGauge: 0,
            isUnlocked: true,
            description: '코드 가독성과 기본기를 중요하게 생각합니다.',
            achievement: '기본적인 CS 지식과 이력서 내용의 사실 관계를 설명할 수 있습니다.',
            avatar: staticAssetUrl('/interviewers/lv1-casual.png'),
          },
          {
            id: 'iv2',
            name: '깐깐한 과장',
            level: 2,
            requiredGauge: 30,
            isUnlocked: false,
            description: '아키텍처와 예외 처리를 날카롭게 파고듭니다.',
            achievement: '실무 수준의 트러블슈팅과 기술적 트레이드오프를 논리적으로 방어할 수 있습니다.',
            avatar: staticAssetUrl('/interviewers/lv2-strict.png'),
          },
          {
            id: 'iv3',
            name: '압박 부장',
            level: 3,
            requiredGauge: 60,
            isUnlocked: false,
            description: '극한의 상황에서 멘탈과 문제 해결 능력을 봅니다.',
            achievement: '스트레스 상황에서도 침착하게 근본적인 원인을 분석하고 대안을 제시할 수 있습니다.',
            avatar: '',
          },
          {
            id: 'iv4',
            name: '냉철한 임원',
            level: 4,
            requiredGauge: 100,
            isUnlocked: false,
            description: '회사의 인재상과 컬처핏을 날카롭게 검증합니다.',
            achievement: '조직의 비전에 부합하며 거시적인 관점에서의 엔지니어링 가치를 증명할 수 있습니다.',
            avatar: '',
          },
        ]);
      }, 500);
    });
  },

  startInterview: async (
    interviewerId: string,
    resumeId: string,
    selectedKeyword: string
  ): Promise<InterviewResponse> => {
    console.log(`Starting interview with ${interviewerId} using resume ${resumeId} for keyword ${selectedKeyword}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          sessionId: 'session_123',
          passed: false,
          nextTurn: {
            type: 'FOLLOW_UP',
            turn: 1,
          },
          questions: [
            { id: 'q1', content: '이력서에 작성하신 캐싱 전략에서 정합성 문제는 어떻게 해결하셨나요?', type: 'MAIN' },
            { id: 'q2', content: '데이터베이스 락(Lock)을 사용하지 않은 특별한 이유가 있나요?', type: 'MAIN' },
            { id: 'q3', content: '트래픽이 갑자기 10배 증가한다면 현재 아키텍처에서 가장 먼저 병목이 발생할 곳은 어디인가요?', type: 'MAIN' },
          ],
        });
      }, 1500);
    });
  },

  submitAnswers: async (sessionId: string, answers: Answer[]): Promise<InterviewResponse> => {
    console.log(`Submitting answers for session ${sessionId}:`, answers);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          evaluations: [
            {
              questionId: 'q1',
              score: 15,
              feedback: '첫 번째 답변(Q1)에 대한 설명이 가장 부족합니다. 구체적인 해결 방안이 없네요.',
            },
            {
              questionId: 'q2',
              score: 25,
              feedback: '데이터베이스 락을 쓰지 않은 이유는 비교적 명확하게 설명했습니다.',
            },
            {
              questionId: 'q3',
              score: 20,
              feedback: '병목 지점은 짚었지만 트래픽 증가 상황의 대응 순서가 조금 더 필요합니다.',
            },
          ],
          totalScore: 60,
          weakestQuestionId: 'q1',
          passed: false,
          nextTurn: {
            type: 'FOLLOW_UP',
            turn: 2,
            questionId: 'q4',
          },
          questions: [
            {
              id: 'q4',
              content: '캐싱 정합성 문제에 대해 구체적인 해결 경험이 없으신가요? 예를 들어, Write-Through나 Cache Aside 패턴을 고려해보셨나요?',
              type: 'FOLLOW_UP',
            },
          ],
        });
      }, 2000); // Simulate some thought process
    });
  },

  submitFollowUp: async (sessionId: string, answer: Answer): Promise<InterviewResponse> => {
    console.log(`Submitting follow up answer for session ${sessionId}:`, answer);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          evaluations: [
            {
              questionId: 'q1',
              score: 15,
              feedback: '첫 번째 답변은 해결 방안의 구체성이 부족했습니다.',
            },
            {
              questionId: 'q2',
              score: 25,
              feedback: '락을 선택하지 않은 근거를 명확하게 설명했습니다.',
            },
            {
              questionId: 'q3',
              score: 20,
              feedback: '병목 지점과 대응 순서를 적절하게 설명했습니다.',
            },
            {
              questionId: 'q4',
              score: 20,
              feedback: '꼬리질문 방어에 성공했습니다. 트레이드오프를 잘 이해하고 있군요.',
            },
          ],
          totalScore: 80,
          overallFeedback: '꼬리질문 방어에 성공했습니다. 트레이드오프를 잘 이해하고 있군요.',
          passed: true,
          nextTurn: {
            type: 'END',
            turn: 3,
          },
        });
      }, 2000);
    });
  },
};
