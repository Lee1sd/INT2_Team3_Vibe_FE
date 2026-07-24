import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../domains/auth/auth.service';
import {
  engineService,
  getInterviewerAvatarByLevel,
  getInterviewBackgroundByLevel,
  pickLevel4ResultSprite,
  pickSessionSpriteFromOrder,
  shufflePoseOrder,
} from '../domains/interview/interview.service';
import { pickOpeningGreeting } from '../domains/interview/openingGreetings';
import { fileService } from '../domains/resume/resume.service';
import { level4ChallengeMock } from '../domains/interview/level4-challenge.mock';
import { saveChallengeFinalResult } from '../domains/interview/level4-challenge.storage';
import {
  Answer,
  ChallengeFinalResult,
  ChallengeTurnMeta,
  Interviewer,
  InterviewResponse,
} from '../types';
import { AlertCircle, Loader2, Send, ArrowLeft, Info } from 'lucide-react';
import { InterviewerAvatar } from '../components/InterviewerAvatar';

function useTypewriter(text: string, speed = 35) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    if (!text) return;

    let i = 0;
    const timer = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(timer);
        setIsComplete(true);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  const skip = () => {
    if (!isComplete) {
      setDisplayedText(text);
      setIsComplete(true);
    }
  };

  return { displayedText, isComplete, skip };
}

type InterviewerView = Pick<Interviewer, 'name' | 'level' | 'avatar'>;

function interviewerFromRouteState(state: unknown, interviewerId: string | undefined): InterviewerView | null {
  const candidate = (state as { interviewer?: Interviewer } | null)?.interviewer;
  if (!candidate) return null;
  if (interviewerId && candidate.id !== interviewerId) return null;
  return {
    name: candidate.name,
    level: candidate.level,
    avatar: getInterviewerAvatarByLevel(candidate.level),
  };
}

function gaugeBarColor(gauge: number, failAt: number, passAt: number): string {
  if (gauge <= failAt) return 'bg-red-500';
  if (gauge >= passAt) return 'bg-emerald-500';
  if (gauge >= (failAt + passAt) / 2) return 'bg-primary';
  return 'bg-amber-500';
}

type TutorialStep = {
  id: 'gauge' | 'dialog' | 'flow';
  title: string;
  body: string;
  /** 하이라이트 영역 — 뷰포트 기준 */
  hole: CSSProperties;
  /** 설명 박스 위치 — 스포트라이트와 겹치지 않게 */
  panel: CSSProperties;
};

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'gauge',
    title: '성과 게이지',
    body: '답변할 때마다 즉시 채점되어 게이지가 오르내립니다. 탈락선(25) 이하 또는 합격선(80) 이상이면 그 즉시 면접이 종료됩니다.',
    hole: { top: '1.25rem', right: '1.25rem', width: 'min(92vw, 320px)', height: '7.75rem' },
    // 게이지는 우상단 → 설명은 좌측 중앙
    panel: { left: '1.25rem', top: '50%', transform: 'translateY(-50%)', width: 'min(92vw, 380px)' },
  },
  {
    id: 'dialog',
    title: '턴바이턴 대화',
    body: '질문이 하나씩 주어집니다. 대화창을 클릭하거나 Space로 대사를 넘기고, 답변을 입력한 뒤 제출하세요. 꼬리질문은 연속 최대 3회입니다.',
    hole: { left: '50%', bottom: '1.5rem', width: 'min(100% - 3rem, 56rem)', height: 'min(38vh, 360px)', transform: 'translateX(-50%)' },
    // 대화창은 하단 → 설명은 상단 중앙
    panel: { left: '50%', top: '1.5rem', transform: 'translateX(-50%)', width: 'min(92vw, 420px)' },
  },
  {
    id: 'flow',
    title: '진행 방식 (목업)',
    body: '전체 발화는 최대 20회입니다. 채점은 프론트 목업이며 던전 신뢰도/뱃지에는 반영되지 않습니다. 결과가 좋으면 밝은 임원, 나쁘면 bad2 연출이 나옵니다.',
    hole: {
      left: '50%',
      bottom: 'min(26vh, 220px)',
      width: 'min(45.5vw, 438px)',
      height: 'min(52vh, 500px)',
      transform: 'translateX(-50%)',
    },
    // 캐릭터는 중앙 → 설명은 우측
    panel: { right: '1.25rem', top: '50%', transform: 'translateY(-50%)', width: 'min(92vw, 360px)' },
  },
];

function FocusMaskTutorial({
  stepIndex,
  onNext,
  onSkip,
}: {
  stepIndex: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const step = TUTORIAL_STEPS[stepIndex]!;
  const isLast = stepIndex >= TUTORIAL_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="lv4-tutorial-title">
      {/*
        전체 dim 레이어를 따로 깔지 않는다.
        스포트라이트 구멍만 box-shadow로 주변을 어둡게 해, 하이라이트 영역은 원본 밝기 그대로 보이게 한다.
      */}
      <div
        className="absolute z-[61] rounded-2xl pointer-events-none"
        style={{
          ...step.hole,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72), 0 0 28px 6px rgba(56, 189, 248, 0.55)',
          border: '2px dashed rgba(125, 211, 252, 1)',
          background: 'transparent',
          outline: '3px solid rgba(255, 255, 255, 0.35)',
          outlineOffset: '2px',
        }}
      />

      <div
        className="absolute z-[62] bg-blue-grey-920/95 backdrop-blur-md border border-sky-400/50 rounded-2xl p-5 shadow-2xl"
        style={step.panel}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-mono text-sky-300">
            STEP {stepIndex + 1}/{TUTORIAL_STEPS.length}
          </p>
          <button type="button" onClick={onSkip} className="text-[12px] text-white/50 hover:text-white">
            건너뛰기
          </button>
        </div>
        <h3 id="lv4-tutorial-title" className="text-[18px] font-bold text-white mb-2">
          {step.title}
        </h3>
        <p className="text-[14px] leading-relaxed text-blue-grey-100 mb-5">{step.body}</p>
        <button
          type="button"
          onClick={onNext}
          className="w-full py-3 px-4 bg-primary hover:bg-[#005bb5] text-white rounded-xl font-bold transition-colors"
        >
          {isLast ? '챌린지 시작하기' : '다음'}
        </button>
      </div>
    </div>
  );
}

export default function ChallengeInterviewProcess() {
  const { interviewerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKeyword = location.state?.keyword || '시스템설계';
  const interviewStartKey = location.key;

  const [session, setSession] = useState<InterviewResponse | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phases, setPhases] = useState<string[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isInterviewFinished, setIsInterviewFinished] = useState(false);
  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const [finalResult, setFinalResult] = useState<ChallengeFinalResult | null>(null);
  const [initializationError, setInitializationError] = useState<'MISSING_RESUME' | 'FAILED' | null>(null);
  const [interviewer, setInterviewer] = useState<InterviewerView>(
    () =>
      interviewerFromRouteState(location.state, interviewerId) ?? {
        name: '이중인격 임원',
        level: 4,
        avatar: getInterviewerAvatarByLevel(4),
      },
  );
  const [sessionId, setSessionId] = useState('');
  const [openingGreeting, setOpeningGreeting] = useState('');
  const [displayedGauge, setDisplayedGauge] = useState(50);
  const [poseOrder, setPoseOrder] = useState<string[]>([]);
  const [stageSprite, setStageSprite] = useState(() => getInterviewerAvatarByLevel(4));
  const [questionSlot, setQuestionSlot] = useState(0);
  const interviewGenerationRef = useRef(0);

  const challenge: ChallengeTurnMeta | undefined = session?.challenge;

  useEffect(() => {
    let cancelled = false;

    const initInterview = async () => {
      const generation = interviewGenerationRef.current + 1;
      interviewGenerationRef.current = generation;
      const isStale = () => cancelled || interviewGenerationRef.current !== generation;

      setSession(null);
      setAnswerText('');
      setIsLoading(true);
      setIsSubmitting(false);
      setPhases([]);
      setPhaseIndex(0);
      setIsInterviewFinished(false);
      setIsAbandonModalOpen(false);
      setFinalResult(null);
      setInitializationError(null);
      setSessionId('');
      setOpeningGreeting('');
      setDisplayedGauge(50);
      setIsGuideOpen(true);
      setTutorialStep(0);
      setQuestionSlot(0);
      setPoseOrder(shufflePoseOrder(4));
      setStageSprite(getInterviewerAvatarByLevel(4));

      try {
        try {
          const interviewers = await engineService.getInterviewers();
          if (isStale()) return;
          const matched = interviewers.find((iv) => iv.id === String(interviewerId));
          if (matched) {
            setInterviewer({
              name: matched.name,
              level: matched.level,
              avatar: getInterviewerAvatarByLevel(matched.level),
            });
          }
        } catch (e) {
          console.error(e);
        }

        let userName = '지원자';
        try {
          const user = await authService.getCurrentUser();
          if (isStale()) return;
          userName = user.displayName || user.name || '지원자';
        } catch (e) {
          console.error(e);
        }
        if (isStale()) return;
        setOpeningGreeting(pickOpeningGreeting(userName));

        const resumeId = await fileService.getLatestCompletedResumeId();
        if (isStale()) return;
        if (!resumeId) {
          setInitializationError('MISSING_RESUME');
          return;
        }

        const res = await engineService.startInterview(interviewerId || '-4', resumeId, selectedKeyword);
        if (isStale()) return;
        setSession(res);
        setSessionId(res.sessionId || '');
        setDisplayedGauge(res.challenge?.challengeGauge ?? 50);
      } catch (e) {
        console.error(e);
        if (!isStale()) setInitializationError('FAILED');
      } finally {
        if (!isStale()) setIsLoading(false);
      }
    };

    initInterview();
    return () => {
      cancelled = true;
      interviewGenerationRef.current += 1;
    };
  }, [interviewerId, selectedKeyword, interviewStartKey]);

  useEffect(() => {
    if (!session) return;

    if (session.nextTurn.type === 'END' && finalResult) {
      setPhases([finalResult.closingMessage]);
      setPhaseIndex(0);
      setStageSprite(pickLevel4ResultSprite(finalResult.passed));
      return;
    }

    if (session.questions && session.questions.length > 0) {
      const q = session.questions[0]!;
      const label = q.type === 'FOLLOW_UP' ? '[꼬리질문]' : `[질문 ${(session.challenge?.utteranceCount ?? 0) + 1}]`;
      const feedback = session.overallFeedback?.trim();
      const uttered = session.challenge?.utteranceCount ?? 0;
      if (feedback && uttered > 0) {
        setPhases([feedback, `${label}\n${q.content}`]);
      } else if (uttered === 0) {
        setPhases([openingGreeting || '시작하겠습니다.', `${label}\n${q.content}`]);
      } else {
        setPhases([`${label}\n${q.content}`]);
      }
      setPhaseIndex(0);

      const isOpening = uttered === 0;
      setStageSprite(
        pickSessionSpriteFromOrder(4, poseOrder, {
          isOpeningGreeting: isOpening,
          questionSlot,
        }),
      );
    }
  }, [session, openingGreeting, finalResult, poseOrder, questionSlot]);

  useEffect(() => {
    if (challenge) setDisplayedGauge(challenge.challengeGauge);
  }, [challenge?.challengeGauge, challenge]);

  const { displayedText, isComplete: isTypewriterComplete, skip: skipTypewriter } = useTypewriter(
    phases[phaseIndex] || '',
    35,
  );
  const isLastPhase = phases.length > 0 && phaseIndex === phases.length - 1;
  const isUserTurn = isLastPhase && isTypewriterComplete && !isInterviewFinished && !isGuideOpen;

  const handleDialogClick = () => {
    if (isGuideOpen) return;
    if (!isTypewriterComplete) {
      skipTypewriter();
    } else if (!isLastPhase) {
      setPhaseIndex((prev) => prev + 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGuideOpen) return;
      if (e.code === 'Space' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleDialogClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTypewriterComplete, isLastPhase, phaseIndex, isGuideOpen]);

  const handleSubmit = async () => {
    if (!session || !session.questions?.[0] || !answerText.trim()) return;

    const generation = interviewGenerationRef.current;
    const activeSessionId = sessionId;
    const isStale = () => interviewGenerationRef.current !== generation;
    const question = session.questions[0];

    setIsSubmitting(true);
    try {
      const payload: Answer = { questionId: question.id, content: answerText.trim() };
      const res = await engineService.submitChallengeTurn(activeSessionId, payload);
      if (isStale()) return;

      setAnswerText('');
      setQuestionSlot((prev) => prev + 1);
      setSession(res);

      if (res.nextTurn.type === 'END') {
        const completed = level4ChallengeMock.buildFinalResult(res);
        saveChallengeFinalResult(activeSessionId, completed);
        setFinalResult(completed);
        setIsInterviewFinished(true);
      }
    } catch (e) {
      console.error(e);
      if (!isStale()) alert('답변 제출 중 오류가 발생했습니다.');
    } finally {
      if (!isStale()) setIsSubmitting(false);
    }
  };

  const closeTutorial = () => {
    setIsGuideOpen(false);
    setTutorialStep(0);
  };

  const advanceTutorial = () => {
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
      closeTutorial();
      return;
    }
    setTutorialStep((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-blue-grey-940">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-blue-grey-500 font-bold">임원이 지원자의 이력을 훑어보고 있습니다...</p>
      </div>
    );
  }

  if (initializationError) {
    const isMissingResume = initializationError === 'MISSING_RESUME';
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-blue-grey-940 px-6 text-center">
        <AlertCircle className="w-12 h-12 text-warning mb-4" />
        <h2 className="text-[20px] leading-[28px] font-bold text-white mb-3">
          {isMissingResume ? '면접에 사용할 이력서가 없습니다.' : '챌린지를 시작하지 못했습니다.'}
        </h2>
        <p className="text-blue-grey-300 text-[14px] leading-[20px] font-normal mb-8">
          {isMissingResume
            ? '파싱이 완료된 이력서를 등록한 뒤 다시 시작해 주세요.'
            : '잠시 후 던전 맵에서 다시 시도해 주세요.'}
        </p>
        <button
          onClick={() => navigate(isMissingResume ? '/mypage' : '/dungeon', { replace: true })}
          className="px-6 py-3 bg-primary text-white rounded-2xl text-[14px] leading-[20px] font-bold hover:bg-[#005bb5] transition-colors shadow-sm"
        >
          {isMissingResume ? '이력서 등록하러 가기' : '던전 맵으로 돌아가기'}
        </button>
      </div>
    );
  }

  if (!session) return null;
  if (!isInterviewFinished && !session.questions) return null;

  const sessionBackground = getInterviewBackgroundByLevel(interviewer.level);
  const failAt = challenge?.failThreshold ?? 25;
  const passAt = challenge?.passThreshold ?? 80;
  const utterance = challenge?.utteranceCount ?? 0;
  const maxUtterances = challenge?.maxUtterances ?? 20;
  const lastDelta = challenge?.lastDelta;

  return (
    <div className="fixed inset-0 z-50 bg-blue-grey-940 flex flex-col h-screen overflow-hidden font-sans">
      {sessionBackground ? (
        <img
          src={sessionBackground}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover z-0 brightness-[1.08] contrast-[1.02]"
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_#1a2332_0%,_#0b0f14_55%,_#05070a_100%)]" />
      )}

      <div className="pointer-events-none absolute left-1/2 z-10 h-[min(52vh,500px)] w-[min(45.5vw,438px)] -translate-x-1/2 bottom-[min(26vh,220px)]">
        <InterviewerAvatar
          avatar={stageSprite || interviewer.avatar}
          name={interviewer.name}
          className="h-full w-full opacity-100"
          imgClassName="h-full w-full object-contain object-bottom opacity-100"
        />
      </div>

      <div className="absolute top-6 left-6 z-40">
        <button
          onClick={() => setIsAbandonModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-grey-900/50 hover:bg-blue-grey-900/80 border border-white/20 text-white/90 hover:text-white rounded-lg transition-colors text-[14px] leading-[20px] font-bold backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          면접 포기하기
        </button>
      </div>

      <div className="absolute top-6 right-6 z-40 w-[min(92vw,320px)]" data-tutorial-target="gauge">
        <div className="bg-blue-grey-920/75 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-white/90 tracking-wide">성과 게이지 · MOCK</span>
            <button
              type="button"
              onClick={() => {
                setTutorialStep(0);
                setIsGuideOpen(true);
              }}
              className="text-white/70 hover:text-white"
              aria-label="챌린지 규칙 안내"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-end justify-between mb-2">
            <span className="text-[22px] font-mono font-bold text-white leading-none">{displayedGauge}</span>
            <span className="text-[11px] font-mono text-white/60">
              발화 {utterance}/{maxUtterances}
              {lastDelta != null && (
                <span className={lastDelta >= 0 ? ' text-emerald-400 ml-2' : ' text-red-400 ml-2'}>
                  {lastDelta >= 0 ? `+${lastDelta}` : lastDelta}
                </span>
              )}
            </span>
          </div>
          <div className="relative h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full transition-all duration-700 ease-out ${gaugeBarColor(displayedGauge, failAt, passAt)}`}
              style={{ width: `${displayedGauge}%` }}
            />
            <div className="absolute top-0 bottom-0 w-px bg-red-400/80" style={{ left: `${failAt}%` }} />
            <div className="absolute top-0 bottom-0 w-px bg-emerald-400/80" style={{ left: `${passAt}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-[10px] font-mono text-white/45">
            <span>탈락 {failAt}</span>
            <span>합격 {passAt}</span>
          </div>
        </div>
      </div>

      {isGuideOpen && (
        <FocusMaskTutorial stepIndex={tutorialStep} onNext={advanceTutorial} onSkip={closeTutorial} />
      )}

      {isAbandonModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-blue-grey-920 border border-blue-grey-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-3 text-center">정말 면접을 포기하시겠습니까?</h3>
            <p className="text-blue-grey-300 text-[15px] leading-relaxed mb-8 text-center">
              지금 나가면 현재까지의 대화와 게이지가 저장되지 않습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsAbandonModalOpen(false)}
                className="flex-1 py-3 px-4 bg-blue-grey-800 hover:bg-blue-grey-700 text-white rounded-xl font-bold transition-colors"
              >
                취소(계속 진행)
              </button>
              <button
                onClick={() => navigate('/dungeon')}
                className="flex-1 py-3 px-4 bg-red-600/90 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
              >
                포기하고 나가기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-20 mt-auto w-full max-w-4xl mx-auto px-6 pb-6 md:pb-8 flex flex-col gap-4 shrink-0 min-h-[38vh] pt-4">
        <div className="flex items-center gap-2 px-1 shrink-0">
          <span className="bg-amber-500/20 text-amber-300 text-[14px] leading-[20px] font-bold font-mono px-2 py-1 rounded-md">
            Lv.{interviewer.level} · CHALLENGE
          </span>
          <span className="text-white text-[14px] leading-[20px] font-bold tracking-wide drop-shadow-md">
            {interviewer.name}
          </span>
        </div>

        <div
          className="flex-1 bg-blue-grey-920/65 backdrop-blur-[2px] border border-white/15 rounded-2xl p-6 md:p-8 pb-10 shadow-[0_8px_40px_rgba(0,0,0,0.25)] flex flex-col relative cursor-pointer"
          onClick={handleDialogClick}
        >
          {isSubmitting && (
            <div className="absolute inset-0 bg-blue-grey-920/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-2xl">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-white font-bold animate-pulse">임원이 답변을 평가하고 있습니다...</p>
            </div>
          )}

          <div className="flex-1 min-h-[120px] flex items-start">
            <p className="text-white text-[16px] leading-[28px] font-normal md:text-[20px] md:leading-[28px] md:font-bold whitespace-pre-wrap drop-shadow-sm">
              {displayedText}
              {!isTypewriterComplete && <span className="animate-pulse">|</span>}
            </p>
          </div>

          {isTypewriterComplete && !isLastPhase && (
            <div className="absolute bottom-6 right-8 text-primary animate-bounce font-bold">▼ 계속 (클릭)</div>
          )}
          {isTypewriterComplete && isLastPhase && (
            <div className="absolute bottom-6 right-8 text-primary animate-pulse font-bold">■</div>
          )}
        </div>

        {isInterviewFinished ? (
          isTypewriterComplete && (
            <div className="shrink-0 flex justify-center mt-4">
              <button
                onClick={() =>
                  navigate(`/result/${sessionId}`, {
                    state: { challengeFinalResult: finalResult },
                  })
                }
                className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-[#005bb5] transition-colors flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,120,255,0.4)] text-[16px] md:text-[18px]"
              >
                상세 결과 보고서 확인하기
              </button>
            </div>
          )
        ) : (
          isUserTurn && (
            <div
              className="shrink-0 h-[140px] md:h-[150px] bg-blue-grey-920/70 backdrop-blur-[2px] border border-white/15 rounded-2xl p-3 md:p-4 flex gap-3 md:gap-4 shadow-[0_8px_40px_rgba(0,0,0,0.2)]"
              style={{ animation: 'fadeIn 0.3s ease-in-out' }}
            >
              <textarea
                className="flex-1 w-full bg-blue-grey-990/60 border border-blue-grey-700 rounded-2xl p-4 text-white text-[16px] leading-[28px] font-normal focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-colors"
                placeholder="근거·사례·수치를 넣어 답변해 보세요..."
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                disabled={isSubmitting}
              />
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !answerText.trim()}
                className="w-[100px] md:w-[140px] shrink-0 bg-primary text-white rounded-2xl font-bold hover:bg-[#005bb5] transition-colors flex flex-col items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,120,255,0.3)] disabled:opacity-32 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5 md:w-6 md:h-6" />}
                <span className="text-[14px] leading-[20px] md:text-[16px] md:leading-[28px] font-normal">제출</span>
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
