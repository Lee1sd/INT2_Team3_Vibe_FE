import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '../api/client';
import { authService } from '../domains/auth/auth.service';
import {
  engineService,
  getInterviewerAvatarByLevel,
  getInterviewBackgroundByLevel,
  isLevel4ChallengeInterviewerId,
  pickSessionSpriteFromOrder,
  shufflePoseOrder,
} from '../domains/interview/interview.service';
import { pickOpeningGreeting } from '../domains/interview/openingGreetings';
import { evaluateSubmitPrecondition } from '../domains/interview/submit-precondition';
import { isSessionExpiredError } from '../domains/auth/session-error';
import { saveReturnUrl } from '../domains/auth/return-url';
import { evaluationService } from '../domains/progress/progress.service';
import { fileService, markResumeAsSelected } from '../domains/resume/resume.service';
import {
  getFinalEvaluationCount,
  saveFinalInterviewResult,
  toFinalInterviewResult,
} from '../domains/interview/interview-result.storage';
import { isPostSubmitFailure } from '../domains/interview/submit-failure';
import {
  createInterviewClosingMessage,
  getInterviewerTone,
  getSessionFeedback,
} from '../domains/interview/interview-closing-message';
import { InterviewResponse, Answer, FinalInterviewResult, Interviewer } from '../types';
import { AlertCircle, Loader2, Send, ArrowLeft } from 'lucide-react';
import { InterviewerAvatar } from '../components/InterviewerAvatar';
import ChallengeInterviewProcess from './ChallengeInterviewProcess';

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

/**
 * 제출은 성공했는데 결과 화면을 준비하지 못한 경우의 안내. (#95)
 * 재제출을 유도하지 않는다 — 이미 완료된 세션에 다시 제출하면 409가 난다.
 */
const POST_SUBMIT_ERROR_MESSAGE =
  '답변은 정상적으로 제출되었지만 결과 화면을 준비하지 못했습니다. 다시 제출하지 마시고 마이페이지의 면접 기록에서 결과를 확인해 주세요.';

type InterviewerView = Pick<Interviewer, 'name' | 'level' | 'avatar'>;

function interviewerFromRouteState(state: unknown, interviewerId: string | undefined): InterviewerView | null {
  const candidate = (state as { interviewer?: Interviewer } | null)?.interviewer;
  if (!candidate) return null;
  if (interviewerId && candidate.id !== interviewerId) return null;
  return {
    name: candidate.name,
    level: candidate.level,
    // 세션은 전신 스프라이트를 쓴다(확대샷은 던전 카드 전용).
    avatar: getInterviewerAvatarByLevel(candidate.level),
  };
}

export default function InterviewProcess() {
  const { interviewerId } = useParams();

  // Lv.4 챌린지는 기존 4문항+꼬리1 흐름과 분리된 전용 화면으로 보낸다.
  if (isLevel4ChallengeInterviewerId(interviewerId)) {
    return <ChallengeInterviewProcess />;
  }

  return <StandardInterviewProcess />;
}

function StandardInterviewProcess() {
  const { interviewerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKeyword = location.state?.keyword || 'Spring Boot';
  const interviewStartKey = location.key;
  
  const [session, setSession] = useState<InterviewResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** 토큰 미복구 등으로 제출을 막았을 때 잠깐 띄우는 안내. (#87) */
  const [submitNotice, setSubmitNotice] = useState('');
  /** 제출 성공 후 결과 화면 준비에 실패했을 때의 안내 — 자동으로 사라지지 않는다. (#95) */
  const [postSubmitError, setPostSubmitError] = useState('');
  const [phases, setPhases] = useState<string[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isInterviewFinished, setIsInterviewFinished] = useState(false);
  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);
  const [finalResult, setFinalResult] = useState<FinalInterviewResult | null>(null);
  const [initializationError, setInitializationError] = useState<'MISSING_RESUME' | 'FAILED' | null>(null);
  const [interviewer, setInterviewer] = useState<InterviewerView>(
    () =>
      interviewerFromRouteState(location.state, interviewerId) ?? {
        name: '면접관',
        level: 1,
        avatar: getInterviewerAvatarByLevel(1),
      }
  );
  /** 세션 스테이지에 그리는 전신 스프라이트(질문마다 셔플 큐 순서로 갱신). */
  const [stageSprite, setStageSprite] = useState(
    () => interviewerFromRouteState(location.state, interviewerId)?.avatar || getInterviewerAvatarByLevel(1)
  );
  /** 세션당 1회 셔플한 포즈 큐 — 질문마다 앞에서부터 소진(빠진 포즈 없이). */
  const [poseOrder, setPoseOrder] = useState<string[]>([]);
  /** 본문항 개수(꼬리질문 슬롯 오프셋용). */
  const [mainQuestionCount, setMainQuestionCount] = useState(0);

  // startInterview 응답의 실제 sessionId를 사용한다 (#11: 하드코딩된 'session_123' 제거).
  const [sessionId, setSessionId] = useState('');
  /** 세션 입장 시 1회 고른 오프닝 인사 — phase effect가 다시 돌아도 문구가 바뀌지 않게 고정한다. */
  const [openingGreeting, setOpeningGreeting] = useState('');
  // effect cleanup은 initInterview 내부 await 흐름을 막고, generation은 submit 같은 effect 밖 비동기 응답까지 막는다.
  const interviewGenerationRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const initInterview = async () => {
      const generation = interviewGenerationRef.current + 1;
      interviewGenerationRef.current = generation;
      const isStale = () => cancelled || interviewGenerationRef.current !== generation;

      setSession(null);
      setAnswers({});
      setIsLoading(true);
      setIsSubmitting(false);
      // 현재 세션 동안은 유지되지만, 새 세션 시작 시엔 이전 세션의 안내가 남지 않게 지운다. (#95)
      setPostSubmitError('');
      setPhases([]);
      setPhaseIndex(0);
      setCurrentQuestionIndex(0);
      setIsInterviewFinished(false);
      setIsAbandonModalOpen(false);
      setFinalResult(null);
      setInitializationError(null);
      setSessionId('');
      setOpeningGreeting('');

      try {
        // 라우트 id는 BE 숫자 id(String)다 — 구 mock키(iv1) 하드코딩 맵을 쓰지 않는다.
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

        // 최신 파싱 완료 이력서를 사용해 mock 전용 ID가 실제 API로 전달되지 않게 한다.
        const resumeId = await fileService.getLatestCompletedResumeId();
        if (isStale()) return;
        if (!resumeId) {
          setInitializationError('MISSING_RESUME');
          return;
        }
        const res = await engineService.startInterview(interviewerId || '1', resumeId, selectedKeyword);
        if (isStale()) return;
        // 방금 사용한 이력서를 다음 새로고침에도 선택 상태로 유지한다.
        markResumeAsSelected(resumeId);
        setSession(res);
        setSessionId(res.sessionId || '');
        if (res.sessionId) {
          try {
            await evaluationService.captureSnapshot(res.sessionId);
            // await 중 unmount/abandon이면 stale 스냅샷이 sessionStorage에 남지 않게 한다.
            if (isStale()) {
              sessionStorage.removeItem(`career-dungeon:progress-snapshot:${res.sessionId}`);
              return;
            }
          } catch (snapshotError) {
            // 스냅샷 실패가 면접 시작 자체를 막지 않도록 결과 비교 기능만 비활성화한다.
            console.error(snapshotError);
          }
        }
      } catch (e) {
        console.error(e);
        if (!isStale()) setInitializationError('FAILED');
      } finally {
        if (!isStale()) {
          setIsLoading(false);
        }
      }
    };
    initInterview();

    return () => {
      cancelled = true;
      // handleSubmit 등 effect 밖 async도 stale로 무효화한다 (abandoned/unmount 후 저장·setState 방지).
      interviewGenerationRef.current += 1;
    };
  }, [interviewerId, selectedKeyword, interviewStartKey]);

  const isFollowUp = session?.nextTurn.turn === 2;
  const isLastQuestion = session?.questions ? currentQuestionIndex === session.questions.length - 1 : true;
  // 첫 인사(오프닝 문구)만 기본 포즈 — 질문 본문부터 셔플 큐 사용
  const isOpeningGreeting = !isFollowUp && currentQuestionIndex === 0 && phaseIndex === 0;
  const questionSlot = isFollowUp ? mainQuestionCount + currentQuestionIndex : currentQuestionIndex;

  // 면접관/세션이 정해지면 포즈 큐를 한 번 셔플한다.
  useEffect(() => {
    setPoseOrder(shufflePoseOrder(interviewer.level));
  }, [interviewer.level, sessionId]);

  useEffect(() => {
    if (session?.questions && !isFollowUp) {
      setMainQuestionCount(session.questions.length);
    }
  }, [session, isFollowUp]);

  useEffect(() => {
    setStageSprite(
      pickSessionSpriteFromOrder(interviewer.level, poseOrder, {
        isOpeningGreeting,
        questionSlot,
      }),
    );
  }, [interviewer.level, poseOrder, isOpeningGreeting, questionSlot]);

  useEffect(() => {
    if (session) {
      if (session.nextTurn.type === 'END') {
        setPhases([createInterviewClosingMessage(getInterviewerTone(interviewer.level))]);
        setPhaseIndex(0);
        return;
      }

      if (session.questions && session.questions.length > 0) {
        const q = session.questions[currentQuestionIndex];
        if (isFollowUp && currentQuestionIndex === 0) {
          const feedback = getSessionFeedback(session);
          setPhases([feedback, `[추가 질문]\n${q.content}`]);
        } else {
          if (!isFollowUp && currentQuestionIndex === 0) {
            const greeting =
              openingGreeting || pickOpeningGreeting('지원자');
            setPhases([greeting, `[질문 ${currentQuestionIndex + 1}]\n${q.content}`]);
          } else {
            setPhases([`[질문 ${currentQuestionIndex + 1}]\n${q.content}`]);
          }
        }
        setPhaseIndex(0);
      }
    }
  }, [session, isFollowUp, currentQuestionIndex, openingGreeting, interviewer.level]);

  const { displayedText, isComplete: isTypewriterComplete, skip: skipTypewriter } = useTypewriter(phases[phaseIndex] || '', 35);
  
  const isLastPhase = phases.length > 0 && phaseIndex === phases.length - 1;
  const isUserTurn = isLastPhase && isTypewriterComplete && !isInterviewFinished;

  const handleDialogClick = () => {
    if (!isTypewriterComplete) {
      skipTypewriter();
    } else if (!isLastPhase) {
      setPhaseIndex(prev => prev + 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleDialogClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTypewriterComplete, isLastPhase, phaseIndex]);

  const handleAnswerChange = (qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  useEffect(() => {
    if (!submitNotice) return;
    const timer = window.setTimeout(() => setSubmitNotice(''), 3000);
    return () => window.clearTimeout(timer);
  }, [submitNotice]);

  const handleNextOrSubmit = () => {
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!session || !session.questions) return;

    // 토큰 복구(restoreSession) 미완/배경 refresh 중에는 accessToken이 null이라
    // Authorization 헤더 없이 나가 401이 된다. 이 경우 제출을 막고 재시도를 안내한다. (#87)
    const precondition = evaluateSubmitPrecondition(getAccessToken());
    if (!precondition.canSubmit) {
      setSubmitNotice(precondition.notice ?? '');
      return;
    }
    setSubmitNotice('');

    const generation = interviewGenerationRef.current;
    const activeSessionId = sessionId;
    const isStale = () => interviewGenerationRef.current !== generation;

    setIsSubmitting(true);
    try {
      // 1단계: API 호출. 여기서 실패한 것만 "제출 실패"다 — 재시도해도 된다.
      let res: InterviewResponse;
      try {
        if (!isFollowUp) {
          const payload: Answer[] = session.questions.map(q => ({
            questionId: q.id,
            content: answers[q.id]
          }));
          res = await engineService.submitAnswers(activeSessionId, payload);
        } else {
          const q = session.questions[0];
          res = await engineService.submitFollowUp(activeSessionId, {
            questionId: q.id,
            content: answers[q.id]
          });
        }
      } catch (e) {
        console.error(e);
        if (isStale()) return;
        // 여기까지 온 401 = client.ts의 자동 refresh까지 실패한 완전 만료다(access+refresh 모두).
        // 복구 불가하므로 복귀 경로를 저장하고 로그인으로 유도한다. (#89)
        if (isSessionExpiredError(e)) {
          saveReturnUrl(location.pathname);
          alert('세션이 만료되었습니다. 다시 로그인해 주세요.');
          navigate('/', { replace: true });
          return;
        }
        // 2xx를 받은 뒤 응답을 쓸 수 없는 경우(계약 위반, JSON 파싱 실패)는 제출이
        // 이미 성공한 상태다. 재제출을 유도하면 완료된 세션에 다시 제출해 409가 난다. (#95)
        if (isPostSubmitFailure(e)) {
          setPostSubmitError(POST_SUBMIT_ERROR_MESSAGE);
          return;
        }
        alert('답변 제출 중 오류가 발생했습니다.');
        return;
      }
      if (isStale()) return;

      // 2단계: 응답 후처리. 서버는 이미 답변을 받아들였으므로 실패해도 제출 실패가 아니다.
      try {
        if (!isFollowUp) {
          setAnswers({});
          setCurrentQuestionIndex(0);
          setSession(res);
          return;
        }

        if (res.nextTurn.type === 'END') {
          // 최종 응답을 먼저 검증·저장한 뒤 종료 상태를 한 번에 반영해 불완전한 END 화면을 방지한다.
          // 본문항 수를 알고 있으면 evaluations 개수를 정확히 검사한다(본문항 N + 꼬리질문 1). (#95)
          const completedResult = toFinalInterviewResult(
            res,
            mainQuestionCount > 0 ? getFinalEvaluationCount(mainQuestionCount) : undefined,
          );
          saveFinalInterviewResult(activeSessionId, completedResult);
          setFinalResult(completedResult);
          setIsInterviewFinished(true);
        }
        setSession(res);
      } catch (e) {
        console.error(e);
        if (isStale()) return;
        setPostSubmitError(POST_SUBMIT_ERROR_MESSAGE);
      }
    } finally {
      if (!isStale()) setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-blue-grey-940">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-blue-grey-500 font-bold">면접관이 지원자의 이력서를 검토하고 있습니다...</p>
      </div>
    );
  }

  if (initializationError) {
    const isMissingResume = initializationError === 'MISSING_RESUME';

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-blue-grey-940 px-6 text-center">
        <AlertCircle className="w-12 h-12 text-warning mb-4" />
        <h2 className="text-[20px] leading-[28px] font-bold text-white mb-3">
          {isMissingResume ? '면접에 사용할 이력서가 없습니다.' : '면접을 시작하지 못했습니다.'}
        </h2>
        <p className="text-blue-grey-300 text-[14px] leading-[20px] font-normal mb-8">
          {isMissingResume
            ? '파싱이 완료된 이력서를 등록한 뒤 다시 면접을 시작해 주세요.'
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

  return (
    <div className="fixed inset-0 z-50 bg-blue-grey-940 flex flex-col h-screen overflow-hidden font-sans">
      {/* z: 배경 → 캐릭터(전신·불투명) → 채팅 UI(반투명) */}
      {sessionBackground ? (
        <img
          src={sessionBackground}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover z-0 brightness-[1.08] contrast-[1.02]"
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-grey-940 to-blue-grey-999" />
      )}

      {/*
        스테이지 캐릭터 통일 슬롯
        - 에셋: 동일 캔버스(560x640)·동일 실루엣 높이로 정규화됨
        - 위치: absolute bottom 중앙 앵커
      */}
      <div className="pointer-events-none absolute left-1/2 z-10 h-[min(52vh,500px)] w-[min(45.5vw,438px)] -translate-x-1/2 bottom-[min(26vh,220px)]">
        <InterviewerAvatar
          avatar={stageSprite || interviewer.avatar}
          name={interviewer.name}
          className="h-full w-full opacity-100"
          imgClassName="h-full w-full object-contain object-bottom opacity-100"
        />
      </div>

      {/* Exit Button */}
      <div className="absolute top-6 left-6 z-40">
        <button 
          onClick={() => setIsAbandonModalOpen(true)} 
          className="flex items-center px-4 py-2 bg-blue-grey-900/50 hover:bg-blue-grey-900/80 border border-white/20 text-white/90 hover:text-white rounded-lg transition-colors text-[14px] leading-[20px] font-bold backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          면접 포기하기
        </button>
      </div>

      {/* Abandon Warning Modal */}
      {isAbandonModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-blue-grey-920 border border-blue-grey-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-3 text-center">정말 면접을 포기하시겠습니까?</h3>
            <p className="text-blue-grey-300 text-[15px] leading-relaxed mb-8 text-center">
              지금 면접을 나가게 되면 현재까지의 대화 내용과 기록이 저장되지 않고 모두 사라집니다.
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

      {/* 하단 UI: 반투명 채팅박스가 캐릭터 하반신 위에 올라감 */}
      <div className="relative z-20 mt-auto w-full max-w-4xl mx-auto px-6 pb-6 md:pb-8 flex flex-col gap-4 shrink-0 min-h-[38vh] pt-4">
        
        <div className="flex items-center gap-2 px-1 shrink-0">
          <span className="bg-primary/20 text-primary text-[14px] leading-[20px] font-bold font-mono px-2 py-1 rounded-md">
            Lv.{interviewer.level}
          </span>
          <span className="text-white text-[14px] leading-[20px] font-bold tracking-wide drop-shadow-md">
            {interviewer.name}
          </span>
        </div>

        {/* Dialog Box — 반투명이라 뒤 캐릭터 하반신이 비침 */}
        <div 
          className="flex-1 bg-blue-grey-920/65 backdrop-blur-[2px] border border-white/15 rounded-2xl p-6 md:p-8 pb-10 shadow-[0_8px_40px_rgba(0,0,0,0.25)] flex flex-col relative cursor-pointer"
          onClick={handleDialogClick}
        >
          {isSubmitting && (
            <div className="absolute inset-0 bg-blue-grey-920/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-2xl">
              <InterviewerAvatar
                avatar={stageSprite || interviewer.avatar}
                name={interviewer.name}
                className="w-20 h-20 mb-4 animate-bounce"
                imgClassName="w-20 h-20"
              />
              <p className="text-white font-bold animate-pulse">면접관이 답변을 날카롭게 검토하고 있습니다...</p>
            </div>
          )}

          <div className="flex-1 min-h-[120px] flex items-start">
            <p className="text-white text-[16px] leading-[28px] font-normal md:text-[20px] md:leading-[28px] md:font-bold leading-relaxed whitespace-pre-wrap font-medium drop-shadow-sm">
              {displayedText}
              {!isTypewriterComplete && <span className="animate-pulse">|</span>}
            </p>
          </div>

          {isTypewriterComplete && !isLastPhase && (
            <div className="absolute bottom-6 right-8 text-primary animate-bounce font-bold">
              ▼ 계속 (클릭)
            </div>
          )}
          {isTypewriterComplete && isLastPhase && (
            <div className="absolute bottom-6 right-8 text-primary animate-pulse font-bold">
              ■
            </div>
          )}
        </div>

        {submitNotice && (
          <div
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-blue-grey-990/90 border border-white/15 text-white text-[14px] font-bold px-4 py-3 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
            style={{ animation: 'fadeIn 0.3s ease-in-out' }}
            role="status"
          >
            <AlertCircle className="w-5 h-5 text-primary shrink-0" />
            {submitNotice}
          </div>
        )}

        {/* Input Area / Result Button */}
        {postSubmitError ? (
          // 제출은 이미 성공했으므로 입력창을 내려 재제출을 막는다. (#95)
          <div
            className="shrink-0 mt-4 bg-blue-grey-920/70 backdrop-blur-[2px] border border-white/15 rounded-2xl p-4 md:p-6 flex flex-col items-center gap-4 text-center shadow-[0_8px_40px_rgba(0,0,0,0.2)]"
            style={{ animation: 'fadeIn 0.3s ease-in-out' }}
            role="alert"
          >
            <div className="flex items-start gap-2 text-left">
              <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-[2px]" />
              <p className="text-white text-[14px] leading-[20px] font-normal md:text-[16px] md:leading-[28px]">
                {postSubmitError}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/mypage')}
              className="px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-[#005bb5] transition-colors text-[14px] leading-[20px] md:text-[16px] md:leading-[28px]"
            >
              마이페이지에서 면접 기록 확인하기
            </button>
          </div>
        ) : isInterviewFinished ? (
          isTypewriterComplete && (
            <div className="shrink-0 flex justify-center mt-4">
              <button
                onClick={() => navigate(`/result/${sessionId}`, { state: { finalResult } })}
                className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-[#005bb5] transition-colors flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,120,255,0.4)] text-[16px] md:text-[18px]"
                style={{ animation: 'fadeIn 0.5s ease-in-out' }}
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
                placeholder="답변을 입력하세요..."
                value={answers[session.questions[currentQuestionIndex]?.id] || ''}
                onChange={(e) => handleAnswerChange(session.questions[currentQuestionIndex].id, e.target.value)}
                disabled={isSubmitting}
              />
              <button
                onClick={handleNextOrSubmit}
                disabled={isSubmitting || !answers[session.questions[currentQuestionIndex]?.id]?.trim()}
                className="w-[100px] md:w-[140px] shrink-0 bg-primary text-white rounded-2xl font-bold hover:bg-[#005bb5] transition-colors flex flex-col items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,120,255,0.3)] disabled:opacity-32 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5 md:w-6 md:h-6" />}
                <span className="text-[14px] leading-[20px] md:text-[16px] md:leading-[28px] font-normal">{isLastQuestion ? (isFollowUp ? '최종 제출' : '답변 제출') : '다음 질문'}</span>
              </button>
            </div>
          )
        )}
        
      </div>
    </div>
  );
}
