import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../domains/auth/auth.service';
import { engineService } from '../domains/interview/interview.service';
import { pickOpeningGreeting } from '../domains/interview/openingGreetings';
import { InterviewResponse, Answer } from '../types';
import { Loader2, Send, ArrowLeft } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

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

const getInterviewerDetails = (id: string | undefined) => {
  const map: Record<string, {name: string, level: number, avatar: string}> = {
    'iv1': { name: '널널한 대리', level: 1, avatar: '🐣' },
    'iv2': { name: '깐깐한 과장', level: 2, avatar: '🐥' },
    'iv3': { name: '압박면접 팀장', level: 3, avatar: '🦅' },
    'iv4': { name: '최종보스 임원', level: 4, avatar: '👑' },
  };
  return map[id || ''] || { name: '알 수 없는 면접관', level: 1, avatar: '👤' };
};

export default function InterviewProcess() {
  const { interviewerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKeyword = location.state?.keyword || 'Spring Boot';
  
  const [session, setSession] = useState<InterviewResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phases, setPhases] = useState<string[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isInterviewFinished, setIsInterviewFinished] = useState(false);
  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);

  // startInterview 응답의 실제 sessionId를 사용한다 (#11: 하드코딩된 'session_123' 제거).
  const [sessionId, setSessionId] = useState('');
  /** 세션 입장 시 1회 고른 오프닝 인사 — phase effect가 다시 돌아도 문구가 바뀌지 않게 고정한다. */
  const [openingGreeting, setOpeningGreeting] = useState('');

  useEffect(() => {
    let cancelled = false;

    const initInterview = async () => {
      try {
        let userName = '지원자';
        try {
          const user = await authService.getCurrentUser();
          if (cancelled) return;
          userName = user.displayName || user.name || '지원자';
        } catch (e) {
          console.error(e);
        }
        if (cancelled) return;
        setOpeningGreeting(pickOpeningGreeting(userName));

        // TODO(#6): resumeId('f123')는 여전히 하드코딩되어 있음 — 이력서 보유확인(RS-003)이
        // 실제 연동되면 현재 사용자의 실제 resumeId로 교체해야 한다. 이 이슈(#11)는 그와 별개로
        // createSession 인자 순서 오류 + sessionId 하드코딩만 다룬다.
        const res = await engineService.startInterview(interviewerId || 'iv1', 'f123', selectedKeyword);
        if (cancelled) return;
        setSession(res);
        setSessionId(res.sessionId || '');
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    initInterview();

    return () => {
      cancelled = true;
    };
  }, [interviewerId, selectedKeyword]);

  const isFollowUp = session?.nextTurn.turn === 2;
  const isLastQuestion = session?.questions ? currentQuestionIndex === session.questions.length - 1 : true;

  useEffect(() => {
    if (session) {
      if (session.nextTurn.type === 'END') {
        setPhases(["수고하셨습니다. 전반적으로 이해도는 높으나, 아키텍처 고민이 조금 더 필요해 보이네요.\n상세한 평가는 결과지를 확인해 주세요."]);
        setPhaseIndex(0);
        return;
      }

      if (session.questions && session.questions.length > 0) {
        const q = session.questions[currentQuestionIndex];
        if (isFollowUp && currentQuestionIndex === 0) {
          const feedback = session.evaluation?.feedback || '';
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
  }, [session, isFollowUp, currentQuestionIndex, openingGreeting]);

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

  const handleNextOrSubmit = () => {
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleSubmit = async () => {
    if (!session || !session.questions) return;

    setIsSubmitting(true);
    try {
      if (!isFollowUp) {
        // First turn: submit 3 answers
        const payload: Answer[] = session.questions.map(q => ({
          questionId: q.id,
          content: answers[q.id]
        }));
        const res = await engineService.submitAnswers(sessionId, payload);
        
        // Clear answers for the next turn
        setAnswers({});
        setCurrentQuestionIndex(0);
        setSession(res);
      } else {
        // Follow-up turn
        const q = session.questions[0]; 
        const res = await engineService.submitFollowUp(sessionId, {
          questionId: q.id,
          content: answers[q.id]
        });
        
        setSession(res);
        if (res.nextTurn.type === 'END') {
          setIsInterviewFinished(true);
        }
      }
    } catch (e) {
      console.error(e);
      alert('답변 제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
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

  const interviewer = getInterviewerDetails(interviewerId);

  if (!session) return null;
  if (!isInterviewFinished && !session.questions) return null;

  return (
    <div className="fixed inset-0 z-50 bg-blue-grey-940 flex flex-col h-screen overflow-hidden font-sans">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-grey-940 to-blue-grey-999 -z-20"></div>

      {/* Exit Button */}
      <div className="absolute top-6 left-6 z-50">
        <button 
          onClick={() => setIsAbandonModalOpen(true)} 
          className="flex items-center px-4 py-2 bg-blue-grey-900/60 hover:bg-blue-grey-900 border border-blue-grey-700 text-blue-grey-300 hover:text-white rounded-lg transition-colors text-[14px] leading-[20px] font-bold backdrop-blur-md"
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

      {/* Top Section: Interviewer */}
      <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center py-6 pt-16 relative z-10">
        <div className="animate-float flex flex-col items-center justify-center h-full w-full">
          <div className="text-[110px] md:text-[130px] leading-none drop-shadow-[0_0_80px_rgba(0,120,255,0.15)] select-none shrink object-contain max-h-full h-full w-full flex items-center justify-center">
            {interviewer.avatar}
          </div>
        </div>
      </div>

      {/* Bottom Section: Dialog & Input */}
      <div className="w-full max-w-4xl mx-auto px-6 pb-6 md:pb-8 flex flex-col gap-4 z-40 shrink-0 min-h-[38vh]">
        
        <div className="flex items-center gap-2 px-1 shrink-0">
          <span className="bg-primary/20 text-primary text-[14px] leading-[20px] font-bold font-mono px-2 py-1 rounded-md">
            Lv.{interviewer.level}
          </span>
          <span className="text-white text-[14px] leading-[20px] font-bold tracking-wide">
            {interviewer.name}
          </span>
        </div>

        {/* Dialog Box */}
        <div 
          className="flex-1 bg-blue-grey-920/80 backdrop-blur-md border border-blue-grey-800 rounded-2xl p-6 md:p-8 pb-10 shadow-[0_0_30px_rgba(0,120,255,0.1)] flex flex-col relative cursor-pointer"
          onClick={handleDialogClick}
        >
          {isSubmitting && (
            <div className="absolute inset-0 bg-blue-grey-920/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-2xl">
              <div className="text-5xl mb-4 animate-bounce">🐣</div>
              <p className="text-white font-bold animate-pulse">면접관이 답변을 날카롭게 검토하고 있습니다...</p>
            </div>
          )}

          <div className="flex-1 min-h-[120px] flex items-start">
            <p className="text-white text-[16px] leading-[28px] font-normal md:text-[20px] md:leading-[28px] md:font-bold leading-relaxed whitespace-pre-wrap font-medium">
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

        {/* Input Area / Result Button */}
        {isInterviewFinished ? (
          isTypewriterComplete && (
            <div className="shrink-0 flex justify-center mt-4">
              <button
                onClick={() => navigate(`/result/${sessionId}`)}
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
              className="shrink-0 h-[140px] md:h-[150px] bg-blue-grey-920/80 backdrop-blur-md border border-blue-grey-800 rounded-2xl p-3 md:p-4 flex gap-3 md:gap-4 shadow-[0_0_30px_rgba(0,120,255,0.1)]"
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
