import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { engineService, getInterviewerBustByLevel } from '../domains/interview/interview.service';
import { authApi } from '../domains/auth/auth.api';
import { fileService } from '../domains/resume/resume.service';
import { Interviewer, User } from '../types';
import { AlertCircle, Lock, PlayCircle, ShieldCheck, Star } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { InfoTooltip } from '../components/InfoTooltip';
import { BadgeImage } from '../components/BadgeImage';
import { InterviewerAvatar } from '../components/InterviewerAvatar';
import { progressService } from '../domains/progress/progress.service';
import { progressApi } from '../domains/progress/progress.api';
import { badgeNameForStage } from '../domains/progress/badge-names';
import { UserBadge } from '../domains/progress/progress.types';
import {
  getInterviewerKeyword,
  InterviewerKeywordSelections,
  selectInterviewerKeyword,
} from '../domains/interview/interviewer-keyword-selection';

/** 보유 뱃지 중 Stage가 가장 높은 뱃지를 메인 화면에 표시할 현재 뱃지로 선택한다. */
function findCurrentBadge(badges: UserBadge[]): UserBadge | null {
  return badges.reduce<UserBadge | null>(
    (current, badge) => (!current || badge.stage > current.stage ? badge : current),
    null,
  );
}

/** UP-003 프로필만 매핑한다. level/gauge는 UM-001을 별도로 붙인다(중복 호출 방지). */
function toUserFromMe(
  me: Awaited<ReturnType<typeof authApi.getMe>>,
  level: number,
  gauge: number,
): User {
  const photoUrl = me.photoUrl ?? undefined;
  return {
    id: String(me.id),
    name: me.name,
    email: me.email,
    displayName: me.name,
    photoUrl,
    photoURL: photoUrl,
    level,
    gauge,
  };
}

export default function InterviewerList() {
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [user, setUser] = useState<User | null>(null);
  /** 프로필과 분리된 진행도 — 프로필 실패 시에도 UM-001 값을 게이지 UI에 쓴다. */
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [progressGauge, setProgressGauge] = useState(0);
  const [currentBadge, setCurrentBadge] = useState<UserBadge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSoftRefreshing, setIsSoftRefreshing] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  /** 같은 키워드가 다른 레벨 카드까지 활성화되지 않도록 면접관별 선택을 분리한다. */
  const [selectedKeywords, setSelectedKeywords] = useState<InterviewerKeywordSelections>({});
  /** 면접관 목록 등 핵심 데이터 실패 시 전체 에러. */
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Progress/유저·뱃지 실패는 화면을 막지 않고 안내만 한다. */
  const [progressWarning, setProgressWarning] = useState<string | null>(null);
  /** 면접관 목록까지 포함한 전체 재시도. */
  const [hardRetryKey, setHardRetryKey] = useState(0);
  /** 부가 데이터(프로필·진행도·뱃지·이력서)만 재조회. */
  const [softRetryKey, setSoftRetryKey] = useState(0);
  const navigate = useNavigate();

  /** 프로필·진행도·뱃지·이력서 — UM-001은 여기서만 호출한다(getCurrentUser 경유 금지). */
  const loadAuxiliaryData = useCallback(async (cancelled: () => boolean) => {
    setProgressWarning(null);

    const [meResult, uploadResult, badgeResult, progressResult] = await Promise.allSettled([
      authApi.getMe(),
      fileService.checkResumeStatus(),
      progressService.getMyBadges(),
      progressApi.getProgress(),
    ]);

    if (cancelled()) return;

    const warnings: string[] = [];
    let nextLevel = 1;
    let nextGauge = 0;

    if (progressResult.status === 'fulfilled') {
      nextLevel = progressResult.value.unlockedLevel;
      nextGauge = progressResult.value.progressGauge;
      setUnlockedLevel(nextLevel);
      setProgressGauge(nextGauge);
    } else {
      console.error(progressResult.reason);
      warnings.push('진행도(게이지·레벨)를 불러오지 못했습니다.');
    }

    if (meResult.status === 'fulfilled') {
      setUser(toUserFromMe(meResult.value, nextLevel, nextGauge));
    } else {
      console.error(meResult.reason);
      setUser(null);
      warnings.push('프로필을 불러오지 못했습니다.');
    }

    if (uploadResult.status === 'fulfilled') {
      setIsUploaded(uploadResult.value);
    } else {
      console.error(uploadResult.reason);
      setIsUploaded(false);
      warnings.push('이력서 상태를 확인하지 못했습니다.');
    }

    if (badgeResult.status === 'fulfilled') {
      setCurrentBadge(findCurrentBadge(badgeResult.value));
    } else {
      console.error('메인 화면 뱃지 조회 실패', badgeResult.reason);
      setCurrentBadge(null);
      warnings.push('보유 뱃지를 불러오지 못했습니다.');
    }

    setProgressWarning(warnings.length > 0 ? warnings.join(' ') : null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    const fetchData = async () => {
      setIsLoading(true);
      setLoadError(null);
      setProgressWarning(null);
      setUnlockedLevel(1);
      setProgressGauge(0);

      try {
        let interviewersResult: Interviewer[];
        try {
          interviewersResult = await engineService.getInterviewers();
        } catch (reason) {
          console.error(reason);
          if (!cancelled) {
            setLoadError('면접관 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
          }
          return;
        }
        if (cancelled) return;
        setInterviewers(interviewersResult);

        await loadAuxiliaryData(isCancelled);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchData();

    return () => {
      cancelled = true;
    };
  }, [hardRetryKey, loadAuxiliaryData]);

  useEffect(() => {
    if (softRetryKey === 0) return;

    let cancelled = false;
    setIsSoftRefreshing(true);
    loadAuxiliaryData(() => cancelled).finally(() => {
      if (!cancelled) setIsSoftRefreshing(false);
    });

    return () => {
      cancelled = true;
    };
  }, [softRetryKey, loadAuxiliaryData]);

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

  if (loadError) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-80px)] gap-4 px-6 text-center bg-blue-grey-10">
        <AlertCircle className="w-12 h-12 text-danger" />
        <p className="text-blue-grey-700 text-[14px] leading-[20px] font-normal">{loadError}</p>
        <button
          type="button"
          onClick={() => setHardRetryKey((key) => key + 1)}
          className="px-6 py-2 bg-primary text-white rounded-lg text-[14px] leading-[20px] font-bold hover:bg-[#005bb5] transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="w-full relative bg-blue-grey-10">
      {/* Top Section: Dashboard (Hero) */}
      <section className="min-h-[70vh] py-24 flex flex-col items-center justify-center border-b border-blue-grey-100 bg-blue-grey-10 relative overflow-hidden z-0">

        <div className="text-center max-w-2xl mx-auto px-6 w-full mt-10">
          {progressWarning && (
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-left">
              <p className="text-[13px] leading-[18px] font-normal text-blue-grey-800 flex-1">
                {progressWarning} 일부 정보가 비어 보일 수 있습니다.
              </p>
              <button
                type="button"
                disabled={isSoftRefreshing}
                onClick={() => setSoftRetryKey((key) => key + 1)}
                className="shrink-0 px-4 py-2 bg-primary text-white rounded-lg text-[13px] leading-[18px] font-bold hover:bg-[#005bb5] transition-colors disabled:opacity-50"
              >
                {isSoftRefreshing ? '불러오는 중…' : '다시 불러오기'}
              </button>
            </div>
          )}
          <h2 className="text-[40px] leading-[50px] font-bold text-blue-grey-900 mb-10 tracking-tight">
            <span className="text-primary">{user?.name ?? '모험가'}</span>님,<br/>다음 면접관이 기다립니다.
          </h2>

          <div className="flex flex-col items-center mb-16">
            <div className="relative mb-6">
              <div className="w-40 h-40 bg-white border border-blue-grey-75 shadow-sm rounded-2xl flex items-center justify-center text-6xl p-3">
                <div className="absolute inset-0 rounded-2xl shadow-[0_0_30px_rgba(0,120,255,0.2)] pointer-events-none"></div>
                <BadgeImage
                  src={currentBadge?.imageUrl ?? (currentBadge ? `/badges/Level${currentBadge.stage}.png` : `/badges/Level${unlockedLevel}.png`)}
                  alt={badgeNameForStage(currentBadge?.stage ?? unlockedLevel, currentBadge?.name)}
                  className="relative z-10 w-full h-full object-contain"
                  fallback={<span className="relative z-10">🐣</span>}
                />
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
            <h3 className="text-[20px] leading-[28px] font-bold text-blue-grey-900 mb-3">
              {currentBadge
                ? badgeNameForStage(currentBadge.stage, currentBadge.name)
                : badgeNameForStage(unlockedLevel)}
            </h3>
            <div className="inline-flex items-center justify-center px-4 py-1.5 bg-white rounded-full text-blue-grey-700 font-mono text-[14px] leading-[20px] font-bold shadow-sm border border-blue-grey-100">
              <Star className="w-4 h-4 mr-2 text-warning fill-warning" />
              현재 레벨: Lv.{unlockedLevel} · {badgeNameForStage(unlockedLevel)}
            </div>
          </div>

          {(() => {
            const nextInterviewer = interviewers.find((iv) => progressGauge < iv.requiredGauge);
            const targetGauge = nextInterviewer ? nextInterviewer.requiredGauge : 100;
            const remainingGauge = nextInterviewer ? targetGauge - progressGauge : 0;
            const gaugePercent = Math.min(progressGauge, 100);

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
                  <span className="text-primary font-mono">{progressGauge} / 100</span>
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
                const selectedKeyword = getInterviewerKeyword(selectedKeywords, iv.id);
                
                return (
                  <div key={iv.id} className={twMerge("flex flex-col md:flex-row items-center gap-8", !isLeft && "md:flex-row-reverse")}>
                    
                    {/* 카드 교차 배치를 위한 여백은 유지하고 본문을 가리던 연결점만 제거한다. */}
                    <div className="hidden md:flex w-1/2 justify-end px-12" aria-hidden="true"></div>

                    <div className={twMerge(
                      "relative z-10 w-full md:w-[420px] flex-shrink-0 bg-blue-grey-900 border border-blue-grey-700 rounded-2xl p-6 md:p-8 transition-transform hover:-translate-y-1 shadow-md",
                      iv.isUnlocked 
                        ? "" 
                        : "opacity-60"
                    )}>
                      <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden bg-[#1a2332] border border-blue-grey-700">
                            <InterviewerAvatar
                              avatar={getInterviewerBustByLevel(iv.level) || iv.avatar}
                              name={iv.name}
                              className="w-[58px] h-[58px]"
                              imgClassName="w-[58px] h-[58px] object-contain opacity-100"
                            />
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
                        } else if (iv.level === 4) {
                          title = '⚔️ [챌린지 모드 · 프론트 목업]';
                          desc = '답변마다 채점되는 성과 게이지로 즉시 합격/탈락이 갈립니다. 꼬리질문 최대 3회 · 발화 최대 20회.';
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
                                  onClick={() =>
                                    setSelectedKeywords((current) =>
                                      selectInterviewerKeyword(current, iv.id, kw),
                                    )
                                  }
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
                              // 실제 면접 API에는 파싱 완료된 이력서 ID가 필수이므로 업로드 전 진입을 차단한다.
                              if (!isUploaded) {
                                navigate('/mypage#resume');
                                return;
                              }
                              navigate(`/interview/${iv.id}`, {
                                state: { keyword: selectedKeyword, interviewer: iv },
                              });
                            }}
                            className="w-full py-3 bg-primary text-white rounded-2xl font-bold text-[16px] leading-[24px] flex items-center justify-center gap-2 hover:bg-[#005bb5] transition-colors shadow-sm disabled:opacity-32 disabled:cursor-not-allowed"
                          >
                            <PlayCircle className="w-5 h-5" />
                            {iv.level === 4 ? '챌린지 시작하기 (MOCK)' : '면접 시작하기'}
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
