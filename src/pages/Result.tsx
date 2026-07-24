import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { evaluationService } from '../domains/progress/progress.service';
import { engineService } from '../domains/interview/interview.service';
import {
  isFinalInterviewResult,
  loadFinalInterviewResult,
} from '../domains/interview/interview-result.storage';
import {
  isChallengeFinalResult,
  isLevel4ChallengeSessionId,
  loadChallengeFinalResult,
} from '../domains/interview/level4-challenge.storage';
import { level4ChallengeMock } from '../domains/interview/level4-challenge.mock';
import { GaugeUpdate, Interviewer, FinalInterviewResult, ChallengeFinalResult } from '../types';
import { Award, ChevronRight, Zap, MessageSquare, AlertCircle } from 'lucide-react';
import { InfoTooltip } from '../components/InfoTooltip';
import { BadgeImage } from '../components/BadgeImage';

export default function Result() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [result, setResult] = useState<GaugeUpdate | null>(null);
  const [judgmentResult, setJudgmentResult] = useState<FinalInterviewResult | null>(null);
  const [challengeResult, setChallengeResult] = useState<ChallengeFinalResult | null>(null);
  const [unlockedInterviewer, setUnlockedInterviewer] = useState<Interviewer | null>(null);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let gaugeTimer: ReturnType<typeof setTimeout> | undefined;

    const fetchResult = async () => {
      setError(null);
      try {
        const routeState = location.state as {
          finalResult?: unknown;
          challengeFinalResult?: unknown;
        } | null;

        const routedChallenge = isChallengeFinalResult(routeState?.challengeFinalResult)
          ? routeState!.challengeFinalResult
          : loadChallengeFinalResult(sessionId || '');

        if (routedChallenge || isLevel4ChallengeSessionId(sessionId)) {
          const finalChallenge = routedChallenge ?? loadChallengeFinalResult(sessionId || '');
          if (!finalChallenge) {
            throw new Error('챌린지 세션의 최종 결과를 찾을 수 없습니다.');
          }

          if (cancelled) return;

          setChallengeResult(finalChallenge);
          setJudgmentResult({
            evaluations: finalChallenge.evaluations,
            totalScore: finalChallenge.totalScore,
            passed: finalChallenge.passed,
            overallFeedback: finalChallenge.overallFeedback,
          });
          setResult(level4ChallengeMock.getMockGaugeUpdate(finalChallenge));
          setDisplayedScore(0);
          setUnlockedInterviewer(null);
          setShowBadgeModal(false);

          gaugeTimer = setTimeout(() => {
            if (!cancelled) setDisplayedScore(finalChallenge.totalScore);
          }, 800);
          return;
        }

        const routedResult = routeState?.finalResult;
        const finalResult = isFinalInterviewResult(routedResult)
          ? routedResult
          : loadFinalInterviewResult(sessionId || '');
        if (!finalResult) {
          throw new Error('세션의 최종 채점 결과를 찾을 수 없습니다.');
        }

        const [resData, interviewers] = await Promise.all([
          evaluationService.getGaugeUpdate(sessionId || ''),
          engineService.getInterviewers(),
        ]);
        if (cancelled) return;

        setResult(resData);
        setJudgmentResult(finalResult);
        setChallengeResult(null);
        setDisplayedScore(0);
        setUnlockedInterviewer(
          resData.levelUp
            ? interviewers.find((iv) => iv.level === resData.unlockedLevel) ?? null
            : null
        );

        if (resData.newlyAcquiredBadge) {
          setShowBadgeModal(true);
        }

        gaugeTimer = setTimeout(() => {
          if (!cancelled) setDisplayedScore(finalResult.totalScore);
        }, 800);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    };
    fetchResult();

    return () => {
      cancelled = true;
      if (gaugeTimer) clearTimeout(gaugeTimer);
    };
  }, [location.state, sessionId]);

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[70vh] gap-4 px-6 text-center">
        <AlertCircle className="w-12 h-12 text-danger" />
        <p className="text-blue-grey-700 text-[14px] leading-[20px] font-normal">{error}</p>
        <button
          onClick={() => navigate('/dungeon')}
          className="px-6 py-2 border border-blue-grey-75 rounded-lg text-blue-grey-700 text-[14px] leading-[20px] font-bold hover:bg-blue-grey-25 transition-colors"
        >
          던전 맵으로 돌아가기
        </button>
      </div>
    );
  }

  if (!result || !judgmentResult) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="w-16 h-16 border-4 border-blue-grey-75 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const isChallenge = Boolean(challengeResult);

  return (
    <>
      <div className="max-w-2xl mx-auto mt-16 px-6 text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-grey-25 rounded-md text-blue-grey-500 font-mono text-[14px] leading-[20px] font-bold mb-6 border border-blue-grey-75">
          <Zap className="w-3 h-3 text-warning fill-warning" />
          {isChallenge ? '챌린지 분석 완료 (MOCK)' : '분석 완료'}
        </div>
        <h2 className="text-[32px] leading-[46px] font-bold text-blue-grey-900 mb-3 tracking-tight">
          {isChallenge ? 'Lv.4 챌린지 결과' : '면접 결과 보고서'}
        </h2>
        <p className="text-blue-grey-500 text-[14px] leading-[20px] font-normal mb-10">
          {isChallenge
            ? '답변마다 갱신된 성과 게이지 기준의 목업 판정입니다. 던전 신뢰도에는 반영되지 않습니다.'
            : '당신의 답변을 바탕으로 신뢰도가 평가되었습니다.'}
        </p>

        {isChallenge && challengeResult && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 mb-8 text-[13px] leading-[20px] text-left">
            종료 사유: <strong>{challengeResult.endReason}</strong>
            {' · '}
            발화 {challengeResult.utteranceCount}회
            {' · '}
            {challengeResult.passed ? '합격' : '불합격'}
          </div>
        )}

        <div className="bg-white border border-blue-grey-75 rounded-2xl p-10 shadow-sm mb-10">
          <div className="flex flex-col items-center">
            <div className="text-[14px] leading-[20px] font-bold text-primary mb-4 px-3 py-1 bg-primary/10 rounded-md flex items-center">
              {isChallenge ? '최종 성과 게이지' : '면접 점수'}
              <InfoTooltip
                question={isChallenge ? 'Q. 성과 게이지란?' : 'Q. 면접 점수는 무슨 기준으로 산출되나요?'}
                answer={
                  isChallenge
                    ? 'A. Lv.4 챌린지에서 답변마다 가감되는 세션 전용 게이지입니다. (프론트 목업)'
                    : 'A. AI 면접관이 답변의 직무 적합성, 논리력, 명확성 등을 종합하여 100점 만점으로 평가한 수치입니다.'
                }
              />
            </div>

            <div className="text-6xl font-bold text-blue-grey-900 mb-8 font-mono tracking-tighter flex items-end justify-center">
              {displayedScore}
              <span className="text-2xl text-blue-grey-400 ml-1 mb-1">{isChallenge ? '' : '점'}</span>
            </div>

            <div className="w-full max-w-md bg-white border border-blue-grey-75 rounded-2xl p-1 mb-4 relative">
              <div className="w-full h-4 bg-blue-grey-50 rounded-lg overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-primary to-info rounded-lg transition-all duration-1000 relative z-10"
                  style={{ width: `${Math.min(displayedScore, 100)}%` }}
                />
                <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-blue-grey-300 z-20" />
              </div>
              <div className="absolute -top-6 left-[80%] -translate-x-1/2 text-[12px] font-bold text-blue-grey-400 whitespace-nowrap">
                {isChallenge ? '합격선 (80)' : '레벨업 기준 (80점)'}
              </div>
            </div>

            <div className="flex justify-between w-full max-w-md text-[14px] leading-[20px] font-bold text-blue-grey-400 px-1 relative">
              <span className="w-12 text-left">0</span>
              <span className="absolute left-[50%] -translate-x-1/2">50</span>
              <span className={`w-24 text-right ${displayedScore >= 100 ? 'text-primary' : ''}`}>100</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-blue-grey-75 rounded-2xl p-8 mb-10 shadow-sm text-left">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="text-[20px] leading-[28px] font-bold text-blue-grey-900">종합 면접 피드백</h3>
          </div>
          <div className="bg-blue-grey-10 rounded-2xl p-5 border border-blue-grey-50">
            <p className="text-blue-grey-700 text-[14px] leading-[20px] font-normal leading-relaxed whitespace-pre-wrap">
              {judgmentResult.overallFeedback}
            </p>
          </div>
          {isChallenge && challengeResult && challengeResult.evaluations.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-[14px] font-bold text-blue-grey-700">턴별 피드백</h4>
              {challengeResult.evaluations.map((evaluation, index) => (
                <div key={`${evaluation.questionId}-${index}`} className="rounded-xl border border-blue-grey-75 p-3">
                  <div className="text-[12px] font-mono text-blue-grey-400 mb-1">Turn {index + 1}</div>
                  <p className="text-[13px] text-blue-grey-700 leading-relaxed">
                    {evaluation.feedback || '피드백 없음'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center pb-12">
          <button
            onClick={() => navigate('/dungeon')}
            className="px-8 py-3 bg-blue-grey-900 text-white rounded-2xl text-[14px] leading-[20px] font-bold flex items-center gap-2 hover:bg-blue-grey-800 transition-colors shadow-sm"
          >
            던전 맵으로 돌아가기
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showBadgeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden animate-bounceIn">
            <div className="absolute inset-0 bg-warning/5"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-warning/20 rounded-full blur-3xl z-0 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-lg mb-6 border border-blue-grey-50 animate-badge-3d hover:scale-110 transition-transform duration-500">
                <BadgeImage
                  src={result.newlyAcquiredBadge?.imageUrl}
                  alt={`${result.newlyAcquiredBadge?.name ?? '새로 획득한'} 뱃지`}
                  className="w-full h-full object-contain rounded-3xl"
                  fallback={<Award className="w-12 h-12 text-warning fill-warning" />}
                />
              </div>
              <h3 className="text-[26px] leading-[32px] font-bold text-blue-grey-900 mb-2">새로운 뱃지 획득!</h3>
              <p className="text-blue-grey-900 text-[14px] leading-[20px] font-normal mb-6">
                {unlockedInterviewer
                  ? `Lv.${unlockedInterviewer.level} ${unlockedInterviewer.name} 면접관이 해금되었습니다.`
                  : '축하합니다! 레벨업에 성공했습니다.'}
              </p>

              <div className="w-full text-[14px] leading-[20px] font-normal bg-blue-grey-25 text-blue-grey-900 p-5 rounded-2xl border border-blue-grey-75 shadow-inner mb-8 italic">
                &quot;트레이드오프를 설명할 줄 아는군요. 다음 단계로 오시죠.&quot;
              </div>

              <button
                onClick={() => setShowBadgeModal(false)}
                className="w-full py-4 bg-primary text-white rounded-2xl text-[16px] leading-[28px] font-bold hover:bg-[#005bb5] transition-colors shadow-md"
              >
                피드백 확인하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
