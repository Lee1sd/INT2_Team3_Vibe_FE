import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { engineService } from '../domains/interview/interview.service';
import { authService } from '../domains/auth/auth.service';
import { fileService } from '../domains/resume/resume.service';
import { Interviewer, User } from '../types';
import { Lock, PlayCircle, ShieldCheck, Star } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { InfoTooltip } from '../components/InfoTooltip';

export default function InterviewerList() {
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploaded, setIsUploaded] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // getCurrentUser가 아직 미연동이어도 면접관 목록은 뜨게, 요청을 독립적으로 처리한다.
        // (동기 throw 하는 stub도 allSettled가 잡도록 Promise로 감싼다)
        const [userResult, interviewerResult, uploadResult] = await Promise.allSettled([
          Promise.resolve().then(() => authService.getCurrentUser()),
          engineService.getInterviewers(),
          fileService.checkResumeStatus(),
        ]);

        if (userResult.status === 'fulfilled') {
          setUser(userResult.value);
        } else {
          console.error(userResult.reason);
        }

        if (interviewerResult.status === 'fulfilled') {
          setInterviewers(interviewerResult.value);
        } else {
          console.error(interviewerResult.reason);
        }

        if (uploadResult.status === 'fulfilled') {
          setIsUploaded(uploadResult.value);
        } else {
          console.error(uploadResult.reason);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-80px)] bg-blue-grey-10">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-grey-200 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative bg-blue-grey-10">
      {/* Top Section: Dashboard (Hero) */}
      <section className="min-h-[70vh] py-24 flex flex-col items-center justify-center border-b border-blue-grey-100 bg-blue-grey-10 relative overflow-hidden z-0">

        <div className="text-center max-w-2xl mx-auto px-6 w-full mt-10">
          <h2 className="text-[40px] leading-[50px] font-bold text-blue-grey-900 mb-10 tracking-tight">
            <span className="text-primary">{user?.name}</span>님,<br/>다음 면접관이 기다립니다.
          </h2>

          <div className="flex flex-col items-center mb-16">
            <div className="relative mb-6">
              <div className="w-32 h-32 bg-white border border-blue-grey-75 shadow-sm rounded-2xl flex items-center justify-center text-6xl">
                <div className="absolute inset-0 rounded-2xl shadow-[0_0_30px_rgba(0,120,255,0.2)] pointer-events-none"></div>
                <span className="relative z-10">🐣</span>
              </div>
              {user && !isUploaded && (
                <div className="absolute left-full top-0 -translate-y-4 ml-6 w-max max-w-xs bg-white/90 border border-blue-grey-75 px-6 py-4 rounded-2xl shadow-md z-20 animate-bounce">
                  <div className="text-[14px] leading-[20px] font-normal text-blue-grey-900 text-left">
                    앗! 아직 이력서가 없어요.<br />던전에 입장하려면 이력서부터 업로드해 주세요!
                  </div>
                  <div className="absolute top-10 -left-2 w-4 h-4 bg-white/90 border-b border-l border-blue-grey-75 rotate-45"></div>
                </div>
              )}
            </div>
            <h3 className="text-[20px] leading-[28px] font-bold text-blue-grey-900 mb-3">초보 머쓱이 뱃지</h3>
            <div className="inline-flex items-center justify-center px-4 py-1.5 bg-white rounded-full text-blue-grey-700 font-mono text-[14px] leading-[20px] font-bold shadow-sm border border-blue-grey-100">
              <Star className="w-4 h-4 mr-2 text-warning fill-warning" />
              현재 레벨: Lv.{user?.level}
            </div>
          </div>

          {(() => {
            const nextInterviewer = interviewers.find(iv => user && user.gauge < iv.requiredGauge);
            const targetGauge = nextInterviewer ? nextInterviewer.requiredGauge : 100;
            const remainingGauge = nextInterviewer ? targetGauge - (user?.gauge || 0) : 0;
            const gaugePercent = Math.min(user?.gauge || 0, 100);

            return (
              <div className="w-full max-w-lg mx-auto bg-white p-6 rounded-2xl shadow-sm border border-blue-grey-75">
                <div className="flex justify-between text-[14px] leading-[20px] font-bold text-blue-grey-900 mb-4 items-center">
                  <span className="flex items-center gap-2">
                    🔥 신뢰도 게이지
                    <InfoTooltip 
                      question="Q. 신뢰도 게이지란 무엇인가요?" 
                      answer="A. 다음 면접관(레벨)을 해금하기 위해 필요한 누적 경험치입니다." 
                    />
                  </span>
                  <span className="text-primary font-mono">{user?.gauge || 0} / 100</span>
                </div>
                <div className="w-full h-4 bg-blue-grey-50 rounded-full overflow-hidden border border-blue-grey-75 relative">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${gaugePercent}%` }}
                  >
                  </div>
                </div>
                {nextInterviewer ? (
                  <p className="text-[14px] leading-[20px] font-bold text-primary mt-4 text-center">
                    다음 레벨 해금까지 남은 신뢰도: {remainingGauge}
                  </p>
                ) : (
                  <p className="text-[14px] leading-[20px] font-bold text-info mt-4 text-center">
                    모든 면접관을 해금하셨습니다!
                  </p>
                )}
                
                <p className="text-[14px] leading-[20px] font-normal text-blue-grey-500 mt-6 text-center">
                  아래로 스크롤하여 던전에 입장하세요 ↓
                </p>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Bottom Section: Dungeon Map */}
      <section className="min-h-screen py-32 bg-gradient-to-b from-blue-grey-940 to-blue-grey-999">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-[32px] leading-[46px] font-bold text-white mb-4 tracking-wider">면접관 던전</h2>
            <p className="text-[16px] leading-[28px] font-normal text-blue-grey-75">신뢰도를 쌓아 상위 레벨의 면접관을 해금하세요.</p>
          </div>
          <div className="relative">
            {/* Connection line for map look */}
            <div className="absolute left-1/2 top-10 bottom-10 w-px bg-blue-grey-800 -translate-x-1/2 z-0 hidden md:block"></div>

            <div className="space-y-16">
              {interviewers.map((iv, index) => {
                const isLeft = index % 2 === 0;
                
                return (
                  <div key={iv.id} className={twMerge("flex flex-col md:flex-row items-center gap-8", !isLeft && "md:flex-row-reverse")}>
                    
                    <div className="hidden md:flex w-1/2 justify-end px-12">
                      {/* Connection Dot */}
                      <div className={twMerge(
                        "absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full z-20",
                        iv.isUnlocked ? "bg-primary shadow-[0_0_10px_var(--color-primary)]" : "bg-blue-grey-800 border-2 border-blue-grey-700"
                      )}></div>
                    </div>

                    <div className={twMerge(
                      "w-full md:w-[420px] flex-shrink-0 bg-blue-grey-900 border border-blue-grey-700 rounded-2xl p-6 md:p-8 transition-transform hover:-translate-y-1 shadow-md",
                      iv.isUnlocked 
                        ? "" 
                        : "opacity-60"
                    )}>
                      <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-blue-grey-800 border border-blue-grey-700">
                            {iv.avatar}
                          </div>
                          <div>
                            <div className={twMerge(
                              "text-[14px] leading-[20px] font-mono font-bold px-2 py-1 rounded-md inline-block mb-1",
                              iv.isUnlocked ? "bg-primary/20 text-primary" : "bg-blue-grey-800 text-blue-grey-400"
                            )}>Lv.{iv.level}</div>
                            <h3 className="text-[20px] leading-[28px] font-bold text-white">{iv.name}</h3>
                          </div>
                        </div>
                        {!iv.isUnlocked && (
                          <div className="p-2 bg-blue-grey-800 rounded-2xl border border-blue-grey-700">
                            <Lock className="w-5 h-5 text-blue-grey-500" />
                          </div>
                        )}
                      </div>
                      
                      <p className="text-[14px] leading-[28px] font-normal text-blue-grey-75 mb-6 h-12">{iv.description}</p>
                      
                      {(() => {
                        let title = '🔓 [달성 역량]';
                        let desc = iv.achievement || '';

                        if (iv.level === 1) {
                          title = '💡 [이력서 팩트체크 및 기본 CS 방어 수준]';
                          desc = '내가 사용한 기술의 기본 개념과 프로젝트 기여도를 명확하게 설명할 수 있습니다.';
                        } else if (iv.level === 2) {
                          title = '💡 [실무 트러블슈팅 및 의사결정 심층 방어 수준]';
                          desc = '특정 기술을 도입한 논리적 근거(Trade-off)와 한계점, 장애 대처 경험을 설득력 있게 방어할 수 있습니다.';
                        }

                        if (!desc) return null;

                        return (
                          <div className="bg-slate-800 border-l-4 border-green-400 p-4 mb-8 font-mono text-sm shadow-sm">
                            <h4 className="font-bold text-green-400 mb-2">{title}</h4>
                            <p className="text-blue-grey-300 leading-relaxed">
                              {desc}
                            </p>
                          </div>
                        );
                      })()}

                      {iv.isUnlocked ? (
                        <>
                          <div className="mb-6">
                            <p className="text-[14px] leading-[20px] font-bold text-blue-grey-75 mb-3">면접 집중 키워드 (1개 선택)</p>
                            <div className="flex flex-wrap gap-2">
                              {['데이터전처리', 'DB', '부하', '보안', '시스템설계', '클라우드'].map(kw => (
                                <button
                                  key={kw}
                                  onClick={() => setSelectedKeyword(kw)}
                                  className={twMerge(
                                    "px-3 py-1.5 rounded-lg text-[14px] leading-[20px] font-normal transition-all border",
                                    selectedKeyword === kw
                                      ? "bg-primary text-white border-primary shadow-[0_0_10px_rgba(0,120,255,0.3)]"
                                      : "bg-blue-grey-800 text-blue-grey-75 border-blue-grey-700 hover:bg-blue-grey-700"
                                  )}
                                >
                                  {kw}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button 
                            disabled={!selectedKeyword}
                            onClick={() => {
                              if (!isUploaded) {
                                alert('이력서를 먼저 업로드해주세요');
                                navigate('/mypage');
                                return;
                              }
                              navigate(`/interview/${iv.id}`, { state: { keyword: selectedKeyword } });
                            }}
                            className="w-full py-3 bg-primary text-white rounded-2xl font-bold text-[16px] leading-[24px] flex items-center justify-center gap-2 hover:bg-[#005bb5] transition-colors shadow-sm disabled:opacity-32 disabled:cursor-not-allowed"
                          >
                            <PlayCircle className="w-5 h-5" />
                            면접 시작하기
                          </button>
                        </>
                      ) : (
                        <div className="w-full py-3 bg-blue-grey-800 text-blue-grey-75 rounded-2xl font-bold text-[16px] leading-[24px] flex items-center justify-center gap-2 border border-blue-grey-700 opacity-60">
                          <ShieldCheck className="w-5 h-5" />
                          신뢰도 {iv.requiredGauge} 필요
                        </div>
                      )}
                    </div>

                    <div className="hidden md:block w-1/2"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
