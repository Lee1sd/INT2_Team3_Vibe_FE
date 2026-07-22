import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { evaluationService } from '../domains/progress/progress.service';
import { authService } from '../domains/auth/auth.service';
import { engineService } from '../domains/interview/interview.service';
import {
  isFinalInterviewResult,
  loadFinalInterviewResult,
} from '../domains/interview/interview-result.storage';
import { GaugeUpdate, User, Interviewer, FinalInterviewResult } from '../types';
import { Award, ChevronRight, Zap, MessageSquare, AlertCircle } from 'lucide-react';
import { InfoTooltip } from '../components/InfoTooltip';

export default function Result() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [result, setResult] = useState<GaugeUpdate | null>(null);
  const [judgmentResult, setJudgmentResult] = useState<FinalInterviewResult | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [unlockedInterviewer, setUnlockedInterviewer] = useState<Interviewer | null>(null);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // 컴포넌트 언마운트/sessionId 변경 시 정리해야 하는 게이지 애니메이션 타이머(#16).
    let gaugeTimer: ReturnType<typeof setTimeout> | undefined;

    const fetchResult = async () => {
      setError(null);
      try {
        const routedResult = (location.state as { finalResult?: unknown } | null)?.finalResult;
        const finalResult = isFinalInterviewResult(routedResult)
          ? routedResult
          : loadFinalInterviewResult(sessionId || '');
        if (!finalResult) {
          throw new Error('세션의 최종 채점 결과를 찾을 수 없습니다.');
        }

        const [userData, resData, interviewers] = await Promise.all([
          authService.getCurrentUser(),
          evaluationService.getGaugeUpdate(sessionId || ''),
          engineService.getInterviewers(),
        ]);
        if (cancelled) return;

        setUser(userData);
        setResult(resData);
        setJudgmentResult(finalResult);
        setDisplayedScore(0);
        setUnlockedInterviewer(
          resData.levelUp
            ? interviewers.find((iv) => iv.level === resData.unlockedLevel) ?? null
            : null
        );

        // BG-001 전후 목록에서 실제 신규 뱃지가 확인된 경우에만 기존 모달을 연다.
        if (resData.newlyAcquiredBadge) {
          setShowBadgeModal(true);
        }

        gaugeTimer = setTimeout(() => {
          if (!cancelled) setDisplayedScore(finalResult.totalScore);
        }, 800);
      } catch (e) {
        console.error(e);
        // 실패 시 무한 로딩 대신 명시적인 에러 상태를 보여준다(#16).
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

  if (!result || !user || !judgmentResult) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="w-16 h-16 border-4 border-blue-grey-75 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-2xl mx-auto mt-16 px-6 text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-grey-25 rounded-md text-blue-grey-500 font-mono text-[14px] leading-[20px] font-bold mb-6 border border-blue-grey-75">
          <Zap className="w-3 h-3 text-warning fill-warning" />
          분석 완료
        </div>
        <h2 className="text-[32px] leading-[46px] font-bold text-blue-grey-900 mb-3 tracking-tight">면접 결과 보고서</h2>
        <p className="text-blue-grey-500 text-[14px] leading-[20px] font-normal mb-10">당신의 답변을 바탕으로 신뢰도가 평가되었습니다.</p>

        <div className="bg-white border border-blue-grey-75 rounded-2xl p-10 shadow-sm mb-10">
          <div className="flex flex-col items-center">
            <div className="text-[14px] leading-[20px] font-bold text-primary mb-4 px-3 py-1 bg-primary/10 rounded-md flex items-center">
              면접 점수
              <InfoTooltip 
                question="Q. 면접 점수는 무슨 기준으로 산출되나요?" 
                answer="A. AI 면접관이 답변의 직무 적합성, 논리력, 명확성 등을 종합하여 100점 만점으로 평가한 수치입니다." 
              />
            </div>
            
            <div className="text-6xl font-bold text-blue-grey-900 mb-8 font-mono tracking-tighter flex items-end justify-center">
              {displayedScore}<span className="text-2xl text-blue-grey-400 ml-1 mb-1">점</span>
            </div>

            <div className="w-full max-w-md bg-white border border-blue-grey-75 rounded-2xl p-1 mb-4 relative">
              <div className="w-full h-4 bg-blue-grey-50 rounded-lg overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-info rounded-lg transition-all duration-1000 relative z-10"
                  style={{ width: `${Math.min(displayedScore, 100)}%` }}
                >
                </div>
                {/* 80% Divider Line */}
                <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-blue-grey-300 z-20"></div>
              </div>
              {/* 80% Divider Label */}
              <div className="absolute -top-6 left-[80%] -translate-x-1/2 text-[12px] font-bold text-blue-grey-400 whitespace-nowrap">
                레벨업 기준 (80점)
              </div>
            </div>

            <div className="flex justify-between w-full max-w-md text-[14px] leading-[20px] font-bold text-blue-grey-400 px-1 relative">
              <span className="w-12 text-left">0점</span>
              <span className="absolute left-[50%] -translate-x-1/2">50점</span>
              <span className={`w-24 text-right ${displayedScore >= 100 ? 'text-primary' : ''}`}>100점 (레벨업)</span>
            </div>
          </div>
        </div>

        {/* 종합 면접 피드백 박스 (항상 노출) */}
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

      {/* 뱃지 획득 모달 */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden animate-bounceIn">
            <div className="absolute inset-0 bg-warning/5"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-warning/20 rounded-full blur-3xl z-0 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-lg mb-6 border border-blue-grey-50 animate-badge-3d hover:scale-110 transition-transform duration-500">
                <Award className="w-12 h-12 text-warning fill-warning" />
              </div>
              <h3 className="text-[26px] leading-[32px] font-bold text-blue-grey-900 mb-2">새로운 뱃지 획득!</h3>
              <p className="text-blue-grey-900 text-[14px] leading-[20px] font-normal mb-6">
                {unlockedInterviewer
                  ? `Lv.${unlockedInterviewer.level} ${unlockedInterviewer.name} 면접관이 해금되었습니다.`
                  : '축하합니다! 레벨업에 성공했습니다.'}
              </p>
              
              <div className="w-full text-[14px] leading-[20px] font-normal bg-blue-grey-25 text-blue-grey-900 p-5 rounded-2xl border border-blue-grey-75 shadow-inner mb-8 italic">
                "트레이드오프를 설명할 줄 아는군요. 다음 단계로 오시죠."
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
