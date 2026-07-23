import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { fileService } from '../domains/resume/resume.service';
import { UploadCloud, FileText, CheckCircle2, Loader2, AlertCircle, ShieldCheck, Lock, LogOut, UserMinus, ArrowLeft, ChevronDown, ChevronUp, Camera, Edit2, ChevronRight, Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { authService, validateProfilePhotoFile } from '../domains/auth/auth.service';
import { PROFILE_PHOTO_ACCEPT } from '../domains/auth/auth.types';
import { User } from '../types';
import { InfoTooltip } from '../components/InfoTooltip';
import { HistoryDrawer, InterviewHistoryItem } from '../components/HistoryDrawer';
import { BadgeImage } from '../components/BadgeImage';
import { progressService } from '../domains/progress/progress.service';
import { UserBadge } from '../domains/progress/progress.types';

const BADGES = [
  { level: 1, name: '프로그래머쓱 LEVEL 1', icon: '🐣', description: '면접의 첫 걸음을 내딛다' },
  { level: 2, name: '프로그래머쓱 LEVEL 2', icon: '🐥', description: '꼬리 질문에도 당황하지 않음' },
  { level: 3, name: '프로그래머쓱 LEVEL 3', icon: '🦅', description: '면접관을 리드하기 시작함' },
  { level: 4, name: '프로그래머쓱 LEVEL 4', icon: '🐉', description: '모든 면접관을 제패한 지원자' },
];

const MOCK_HISTORY: InterviewHistoryItem[] = [
  {
    id: '1',
    date: '26.07.09',
    interviewerName: '널널한 대리',
    score: 90,
    passed: true,
    tag: 'React',
    feedback: '전반적으로 프론트엔드 기본기가 탄탄하며, 실무에서 마주할 수 있는 트레이드오프 상황에 대한 이해도가 높습니다. 캐싱 정합성 문제에서 다소 아쉬운 점이 있었으나 꼬리 질문을 통해 훌륭하게 방어했습니다. 합격을 축하합니다!',
    logs: [
      { speaker: 'interviewer', name: '널널한 대리', message: '반갑습니다. 지원자님의 이력서를 흥미롭게 읽었습니다.\n\n[질문 1] 이력서에 작성하신 캐싱 전략에서 정합성 문제는 어떻게 해결하셨나요?' },
      { speaker: 'applicant', name: '지원자', message: 'TTL을 짧게 가져가서 일시적인 불일치를 허용했습니다.' },
      { speaker: 'interviewer', name: '널널한 대리', message: '[질문 2] 데이터베이스 락(Lock)을 사용하지 않은 특별한 이유가 있나요?' },
      { speaker: 'applicant', name: '지원자', message: '읽기 작업이 90% 이상이라 락 오버헤드를 피하고 싶었습니다.' },
      { speaker: 'interviewer', name: '널널한 대리', message: '[질문 3] 트래픽이 갑자기 10배 증가한다면 현재 아키텍처에서 가장 먼저 병목이 발생할 곳은 어디인가요?' },
      { speaker: 'applicant', name: '지원자', message: 'DB 커넥션 풀 부족으로 인한 DB 병목이 예상됩니다.' },
      { speaker: 'interviewer', name: '널널한 대리', message: '첫 번째 답변(Q1)에 대한 설명이 가장 부족합니다. 구체적인 해결 방안이 없네요.\n\n[추가 질문] 캐싱 정합성 문제에 대해 구체적인 해결 경험이 없으신가요? 예를 들어, Write-Through나 Cache Aside 패턴을 고려해보셨나요?' },
      { speaker: 'applicant', name: '지원자', message: 'Cache Aside 패턴을 적용해 본 적이 있습니다. 데이터 변경 시 캐시 지우는 방식으로 정합성을 보장했습니다.' },
      { speaker: 'interviewer', name: '널널한 대리', message: '꼬리질문 방어에 성공했습니다. 트레이드오프를 잘 이해하고 있군요.' }
    ]
  },
  {
    id: '2',
    date: '26.07.08',
    interviewerName: '깐깐한 과장',
    score: 55,
    passed: false,
    tag: 'MSA',
    feedback: '개별 기술에 대한 사용 경험은 있으나, 분산 시스템과 아키텍처 레벨에서의 깊이 있는 고민이 부족해 보입니다. 특히 메시지 큐의 데이터 유실 엣지 케이스 등 실무 장애 상황에 대한 대비책을 더 학습하시면 좋겠습니다.',
    logs: [
      { speaker: 'interviewer', name: '깐깐한 과장', message: '반갑습니다. 지원자님의 이력서를 흥미롭게 읽었습니다.\n\n[질문 1] 이력서의 MSA 아키텍처에서 서비스 간 트랜잭션 처리는 어떻게 하셨나요?' },
      { speaker: 'applicant', name: '지원자', message: '분산 트랜잭션은 2PC로 해결했습니다.' },
      { speaker: 'interviewer', name: '깐깐한 과장', message: '[질문 2] 메시지 큐(Kafka) 도입 시 발생할 수 있는 메시지 유실 문제는 어떻게 대비했나요?' },
      { speaker: 'applicant', name: '지원자', message: '카프카는 기본적으로 데이터가 유실되지 않는다고 알고 있습니다.' },
      { speaker: 'interviewer', name: '깐깐한 과장', message: '[질문 3] OOM(Out of Memory) 발생 시 디버깅 과정과 원인을 설명해주세요.' },
      { speaker: 'applicant', name: '지원자', message: '힙 메모리를 늘려서 해결했습니다.' },
      { speaker: 'interviewer', name: '깐깐한 과장', message: '답변들의 깊이가 전반적으로 얕습니다. 특히 카프카에 대한 이해가 부족해 보입니다.\n\n[추가 질문] 카프카에서 acks=all로 설정하더라도 메시지가 유실될 수 있는 엣지 케이스는 무엇이 있으며, 이를 보완하기 위한 Outbox 패턴에 대해 설명해 보시겠어요?' },
      { speaker: 'applicant', name: '지원자', message: 'Outbox 패턴은 아직 사용해 본 적이 없어 잘 모르겠습니다. 더 공부하겠습니다.' },
      { speaker: 'interviewer', name: '깐깐한 과장', message: '아키텍처 고민이 부족합니다. 본인이 사용한 기술에 대한 더 깊은 이해가 필요합니다.' }
    ]
  },
  {
    id: '3',
    date: '26.07.05',
    interviewerName: '깐깐한 과장',
    score: 65,
    passed: false,
    tag: 'Redis',
    feedback: '동시성 제어에 대한 기본적인 이해는 갖추었으나, 실제 트래픽 환경에서의 성능 테스트 경험이 다소 부족합니다.',
    logs: []
  }
];

interface UploadedFile {
  id: string;
  resumeId?: string;
  name: string;
  uploadedAt?: string;
  status: 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  errorMsg?: string;
}

function formatUploadedDate(uploadedAt?: string): string {
  if (!uploadedAt) return '업로드 날짜 없음';

  const date = new Date(uploadedAt);
  if (Number.isNaN(date.getTime())) return '업로드 날짜 없음';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace(/\.\s?/g, '.')
    .replace(/\.$/, '');
}

function MultiFileUploader({
  title,
  maxFiles = 3,
  required = false,
  resumeType = 'RESUME',
}: {
  title: string,
  maxFiles?: number,
  required?: boolean,
  resumeType?: 'RESUME' | 'PORTFOLIO',
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fileService.getResumeList().then(list => {
      const existing = list
          .filter(r => r.type === resumeType)
          .map(r => ({
            id: String(r.resumeId),
            resumeId: String(r.resumeId),
            name: `${r.type === 'RESUME' ? '이력서' : '포트폴리오'} #${r.resumeId}`,
            uploadedAt: r.lastUploadedAt,
            status: (r.parseStatus === 'DONE' ? 'COMPLETED' : r.parseStatus) as UploadedFile['status'],
          }));
      setFiles(existing);
    })
        .catch(error => {
          console.error('이력서 목록 조회 실패', error);
          setFiles([]); // 필요하다면 기본값
        });
  }, [resumeType]);

  const updateFile = (id: string, patch: Partial<UploadedFile>) => {
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  };

  const handleDelete = async (file: UploadedFile) => {
    if (!file.resumeId || deletingId) return;
    if (!window.confirm(`${file.name}을(를) 삭제하시겠습니까?`)) return;

    setDeletingId(file.id);
    try {
      await fileService.deleteResume(file.resumeId);
      setFiles(prev => prev.filter(item => item.id !== file.id));
      setSelectedId(prev => prev === file.id ? null : prev);
    } catch (error) {
      console.error('이력서/포트폴리오 삭제 실패', error);
      updateFile(file.id, { errorMsg: '파일을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    } finally {
      setDeletingId(null);
    }
  };

  // fileService(mock/실제 API 스위칭)를 실제로 호출한다 — setTimeout 시뮬레이션 제거(#12).
  // 상태 조회도 ResumeUpload.tsx(#15)와 동일하게 순차 await 루프로 폴링해 레이스 컨디션을 피한다.
  const pollUntilDone = async (localId: string, fileId: string) => {
    const MAX_ATTEMPTS = 10;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        const res = await fileService.checkParseStatus(fileId);
        if (res.status === 'COMPLETED') {
          updateFile(localId, { status: 'COMPLETED' });
          return;
        }
        if (res.status === 'FAILED') {
          updateFile(localId, { status: 'FAILED', errorMsg: '이력서 파싱에 실패했습니다.' });
          return;
        }
      } catch (e) {
        updateFile(localId, { status: 'FAILED', errorMsg: '서버와 통신 중 오류가 발생했습니다.' });
        return;
      }
    }
    updateFile(localId, { status: 'FAILED', errorMsg: '파싱 시간이 초과되었습니다.' });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (files.length >= maxFiles) {
        alert(`최대 ${maxFiles}개까지만 업로드할 수 있습니다.`);
        return;
      }
      const newFile = e.target.files[0];
      const newId = Math.random().toString(36).substr(2, 9);

      const fileEntry: UploadedFile = {
        id: newId,
        name: newFile.name,
        uploadedAt: new Date().toISOString(),
        status: 'UPLOADING'
      };

      setFiles(prev => [...prev, fileEntry]);
      if (!selectedId) setSelectedId(newId);

      try {
        const res = await fileService.uploadResume(newFile, resumeType);
        updateFile(newId, { resumeId: res.fileId, status: 'PROCESSING' });
        await pollUntilDone(newId, res.fileId);
      } catch (err) {
        updateFile(newId, { status: 'FAILED', errorMsg: '업로드 중 오류가 발생했습니다.' });
      }
    }
  };

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] leading-[24px] font-bold text-blue-grey-900 flex items-center gap-2">
          {title}
          {required && <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">필수</span>}
          <span className="text-[13px] text-blue-grey-400 font-normal ml-2">({files.length}/{maxFiles})</span>
        </h3>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={files.length >= maxFiles}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UploadCloud className="w-4 h-4" />
          추가 업로드
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          className="hidden" 
          accept=".pdf,.txt,.md"
        />
      </div>

      <div className="bg-white border border-blue-grey-100 rounded-2xl overflow-hidden shadow-sm">
        {files.length === 0 ? (
          <div className="p-8 text-center bg-blue-grey-10/50">
            <div className="w-12 h-12 bg-blue-grey-25 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-blue-grey-400" />
            </div>
            <p className="text-[14px] text-blue-grey-500">업로드된 파일이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-blue-grey-50">
            {files.map(file => (
              <div 
                key={file.id} 
                className={twMerge(
                  "p-4 flex items-center gap-4 transition-colors",
                  selectedId === file.id ? "bg-primary/5" : "hover:bg-blue-grey-10/50 cursor-pointer"
                )}
                onClick={() => file.status === 'COMPLETED' && setSelectedId(file.id)}
              >
                <div className="flex-shrink-0 relative">
                  <input 
                    type="radio" 
                    checked={selectedId === file.id}
                    readOnly
                    disabled={file.status !== 'COMPLETED'}
                    className="w-4 h-4 text-primary focus:ring-primary border-blue-grey-300"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14px] font-bold text-blue-grey-900 truncate flex items-center gap-2">
                    {file.name}
                    {selectedId === file.id && (
                      <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded font-mono">ACTIVE</span>
                    )}
                  </h4>
                  <p className="text-[12px] text-blue-grey-500 font-mono mt-0.5">
                    {formatUploadedDate(file.uploadedAt)}
                  </p>
                  {file.errorMsg && (
                    <p className="text-[12px] text-danger mt-1">{file.errorMsg}</p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center">
                  {file.status === 'UPLOADING' && <Loader2 className="w-5 h-5 text-blue-grey-400 animate-spin" />}
                  {file.status === 'PROCESSING' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                  {file.status === 'COMPLETED' && <CheckCircle2 className="w-5 h-5 text-success" />}
                  {file.status === 'FAILED' && <AlertCircle className="w-5 h-5 text-danger" />}
                  {file.status === 'EXPIRED' && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-warning">
                      <AlertCircle className="w-4 h-4" />
                      만료됨
                    </span>
                  )}
                  {file.resumeId && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(file);
                      }}
                      disabled={deletingId !== null}
                      aria-label={`${file.name} 삭제`}
                      title="삭제"
                      className="ml-3 p-1.5 rounded-lg text-blue-grey-400 hover:text-danger hover:bg-danger/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === file.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const TABS = [
  { id: 'PROFILE', label: '[01_PROFILE]' },
  { id: 'HISTORY', label: '[02_HISTORY]' },
  { id: 'CONFIG', label: '[03_CONFIG]' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function MyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaveStatus, setNameSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [photoErrorMessage, setPhotoErrorMessage] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<InterviewHistoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('PROFILE');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [badgeCatalog, setBadgeCatalog] = useState<UserBadge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [badgeLoadError, setBadgeLoadError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const photoInputRef = useRef<HTMLInputElement>(null);
  /** 저장이 끝난 뒤에는 늦게 도착한 getCurrentUser가 이름을 덮지 못하게 한다. */
  const nameHydratedFromServer = useRef(false);
  const isSavingNameRef = useRef(false);
  const isUploadingPhotoRef = useRef(false);

  useEffect(() => {
    if (location.hash !== '#resume') return;
    setActiveTab('PROFILE');
  }, [location.hash]);

  useEffect(() => {
    if (location.hash !== '#resume' || activeTab !== 'PROFILE') return;
    const timer = window.setTimeout(() => {
      document.getElementById('resume')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.hash, activeTab]);
  
  useEffect(() => {
    let cancelled = false;

    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (cancelled) return;
        setUser((prev) => {
          // 이미 로컬에서 이름을 저장했다면 서버의 오래된 스냅샷으로 되돌리지 않는다.
          if (nameHydratedFromServer.current && prev) {
            return prev;
          }
          return currentUser;
        });
        if (!nameHydratedFromServer.current) {
          setNameInput(currentUser.displayName || currentUser.name || '');
          nameHydratedFromServer.current = true;
        }
      })
      .catch((e) => {
        if (!cancelled) console.error(e);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    // BG-001 실패가 프로필 전체 로딩을 막지 않도록 뱃지 목록을 독립적으로 조회한다.
    progressService
      .getBadgeCatalog()
      .then((badges) => {
        if (cancelled) return;
        setBadgeCatalog(badges);
        setBadgeLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setBadgeLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setBadgesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const savedName = user?.name || '';
  const trimmedName = nameInput.trim();
  const isNameDirty = Boolean(user && trimmedName !== savedName);

  const handleNameSave = async () => {
    if (isSavingNameRef.current) return;

    if (!user || !trimmedName || trimmedName === savedName) {
      setIsEditingName(false);
      setNameInput(savedName);
      return;
    }

    isSavingNameRef.current = true;
    setIsSavingName(true);
    setNameSaveStatus('idle');
    try {
      const updated = await authService.updateName(trimmedName);
      nameHydratedFromServer.current = true;
      setUser((prev) =>
        prev
          ? { ...prev, name: updated.name, displayName: updated.name }
          : prev
      );
      setNameInput(updated.name);
      setNameSaveStatus('saved');
      setIsEditingName(false);
      window.setTimeout(() => setNameSaveStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setNameSaveStatus('error');
      setNameInput(savedName);
    } finally {
      isSavingNameRef.current = false;
      setIsSavingName(false);
    }
  };

  const handleNameCancel = () => {
    setNameInput(savedName);
    setIsEditingName(false);
    setNameSaveStatus('idle');
  };

  const applyPhotoUrl = (photoUrl: string | undefined) => {
    setUser((prev) =>
      prev
        ? { ...prev, photoUrl, photoURL: photoUrl }
        : prev
    );
  };

  const handlePhotoButtonClick = () => {
    if (isUploadingPhoto || !user) return;
    photoInputRef.current?.click();
  };

  const handlePhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isUploadingPhotoRef.current) return;

    const validationError = validateProfilePhotoFile(file);
    if (validationError) {
      setPhotoStatus('error');
      setPhotoErrorMessage(validationError);
      return;
    }

    isUploadingPhotoRef.current = true;
    setIsUploadingPhoto(true);
    setPhotoStatus('idle');
    setPhotoErrorMessage('');
    try {
      const { photoUrl } = await authService.uploadProfilePhoto(file);
      nameHydratedFromServer.current = true;
      applyPhotoUrl(photoUrl);
      setPhotoStatus('saved');
      window.setTimeout(() => setPhotoStatus('idle'), 2000);
    } catch (e) {
      console.error(e);
      setPhotoStatus('error');
      setPhotoErrorMessage('프로필 이미지 업로드에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      isUploadingPhotoRef.current = false;
      setIsUploadingPhoto(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
  };

  const handleWithdraw = async () => {
    await authService.withdraw();
    navigate('/');
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Group history by interviewerName
  const groupedHistory = MOCK_HISTORY.reduce((acc, item) => {
    if (!acc[item.interviewerName]) acc[item.interviewerName] = [];
    acc[item.interviewerName].push(item);
    return acc;
  }, {} as Record<string, InterviewHistoryItem[]>);

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      {/* Back Button */}
      <div className="mb-8">
        <Link 
          to="/dungeon"
          className="inline-flex items-center text-blue-grey-500 hover:text-blue-grey-900 transition-colors text-[14px] font-bold"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          면접 던전으로 돌아가기
        </Link>
      </div>

      <div className="mb-10">
        <h2 className="text-[32px] font-bold text-blue-grey-900 mb-2">마이페이지</h2>
        <p className="text-blue-grey-500 text-[14px] font-normal">내 프로필, 파일 관리 및 전적을 확인하세요.</p>
      </div>

      {/* Index Tabs */}
      <div className="flex items-end">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={twMerge(
                "px-5 sm:px-8 py-3 font-mono text-[13px] font-bold rounded-t-2xl border-t border-l border-r transition-all relative outline-none",
                isActive 
                  ? "bg-white border-blue-grey-100 text-primary z-10 pb-4 -mb-[1px]" 
                  : "bg-blue-grey-25 border-blue-grey-100 text-blue-grey-500 hover:text-blue-grey-700 hover:bg-blue-grey-50 pb-3"
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className="bg-white border border-blue-grey-100 p-6 sm:p-10 rounded-b-2xl rounded-tr-2xl min-h-[50vh] relative z-0 shadow-sm">
        
        {/* PROFILE TAB */}
        {activeTab === 'PROFILE' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* 프로필 정보 섹션 */}
            <section className="mb-12 border-b border-blue-grey-50 pb-10">
              <h3 className="text-[20px] leading-[28px] font-bold text-blue-grey-900 mb-6">프로필 정보</h3>
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 bg-blue-grey-10/50 border border-blue-grey-75 p-6 rounded-2xl">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-blue-grey-100 overflow-hidden border-4 border-white shadow-sm flex items-center justify-center">
                    {user?.photoUrl || user?.photoURL ? (
                      <img
                        src={user.photoUrl || user.photoURL}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-blue-grey-400">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    )}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept={PROFILE_PHOTO_ACCEPT}
                    className="hidden"
                    onChange={(e) => void handlePhotoSelected(e)}
                  />
                  <button
                    type="button"
                    onClick={handlePhotoButtonClick}
                    disabled={isUploadingPhoto || !user}
                    aria-label="프로필 이미지 업로드"
                    className="absolute bottom-0 right-0 p-2 bg-white rounded-full border border-blue-grey-100 text-blue-grey-600 shadow-sm hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex-1 w-full text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 justify-center sm:justify-start">
                    <div
                      className={twMerge(
                        "inline-flex items-center gap-2 rounded-xl px-2 py-1 transition-colors",
                        isEditingName || isNameDirty
                          ? "bg-white border border-primary/40 shadow-sm"
                          : "border border-transparent"
                      )}
                    >
                      <input 
                        type="text" 
                        value={nameInput}
                        onChange={(e) => {
                          setNameInput(e.target.value);
                          setNameSaveStatus('idle');
                        }}
                        onFocus={() => setIsEditingName(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleNameSave();
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            handleNameCancel();
                            e.currentTarget.blur();
                          }
                        }}
                        disabled={isSavingName || !user}
                        aria-label="이름 수정"
                        className="text-[20px] font-bold text-blue-grey-900 bg-transparent focus:outline-none px-1 py-0.5 text-center sm:text-left w-auto max-w-[200px] disabled:opacity-50"
                      />
                      <Edit2 className={twMerge(
                        "w-4 h-4 shrink-0",
                        isEditingName || isNameDirty ? "text-primary" : "text-blue-grey-400"
                      )} />
                    </div>
                    {isNameDirty && !isSavingName && (
                      <>
                        {trimmedName ? (
                          <button
                            type="button"
                            onClick={() => void handleNameSave()}
                            className="px-3 py-1.5 rounded-lg bg-primary text-white text-[13px] font-bold hover:bg-[#005bb5] transition-colors"
                          >
                            저장
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={handleNameCancel}
                          className="px-3 py-1.5 rounded-lg border border-blue-grey-75 text-blue-grey-600 text-[13px] font-bold hover:bg-blue-grey-25 transition-colors"
                        >
                          취소
                        </button>
                      </>
                    )}
                    {isSavingName && (
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        저장 중
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-blue-grey-500 font-normal min-h-[20px]">
                    {isSavingName
                      ? '이름을 서버에 저장하고 있어요.'
                      : nameSaveStatus === 'saved'
                        ? '이름이 저장되었습니다.'
                        : nameSaveStatus === 'error'
                          ? '이름 저장에 실패했습니다. 다시 시도해 주세요.'
                          : isNameDirty
                            ? '이름이 수정되었습니다. 저장을 눌러 반영하세요.'
                            : isEditingName
                              ? '이름을 수정한 뒤 저장을 누르거나 Enter를 누르세요. Esc로 취소할 수 있어요.'
                              : '이름을 클릭하면 수정할 수 있어요.'}
                  </p>
                  <p className="text-[14px] text-blue-grey-500 font-mono mt-1">{user?.email}</p>
                  <p className="text-[13px] text-blue-grey-500 font-normal min-h-[20px] mt-1">
                    {isUploadingPhoto
                      ? '프로필 이미지를 업로드하고 있어요.'
                      : photoStatus === 'saved'
                        ? '프로필 이미지가 저장되었습니다.'
                        : photoStatus === 'error'
                          ? photoErrorMessage
                          : '카메라 아이콘을 눌러 프로필 이미지를 변경할 수 있어요. (JPEG/PNG/WebP, 최대 2MB)'}
                  </p>
                </div>
              </div>
            </section>

            {/* 머쓱이 뱃지 도감 */}
            <section className="mb-12 border-b border-blue-grey-50 pb-10">
              <h3 className="text-[20px] leading-[28px] font-bold text-blue-grey-900 mb-6 flex items-center gap-2">
                머쓱이 뱃지 도감
                <div className="ml-2 inline-block">
                  <InfoTooltip 
                    question="Q. 신뢰도 게이지란 무엇인가요?" 
                    answer="A. 다음 면접관(레벨)을 해금하기 위해 필요한 누적 경험치입니다." 
                  />
                </div>
                {badgesLoading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              </h3>
              {badgeLoadError && (
                <p className="text-[12px] text-blue-grey-500 mb-4">
                  뱃지 이미지를 불러오지 못해 기본 아이콘으로 표시합니다.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {BADGES.map((badge) => {
                  const catalogBadge = badgeCatalog.find((item) => item.stage === badge.level);
                  const isUnlocked = catalogBadge?.acquired === true;
                  return (
                    <div 
                      key={badge.level} 
                      className={twMerge(
                        "bg-white border rounded-2xl p-5 flex flex-col items-center text-center transition-all",
                        isUnlocked ? "border-blue-grey-100 shadow-sm hover:-translate-y-1 hover:shadow-md" : "border-blue-grey-100 opacity-60"
                      )}
                    >
                      <div className={twMerge(
                        "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 relative",
                        isUnlocked ? "bg-blue-grey-25 border border-blue-grey-75" : "bg-blue-grey-50 border border-blue-grey-75 grayscale opacity-50"
                      )}>
                        {isUnlocked && <div className="absolute inset-0 bg-primary/5 rounded-2xl"></div>}
                        <span className="relative z-10 w-full h-full flex items-center justify-center">
                          <BadgeImage
                            src={catalogBadge?.imageUrl}
                            alt={`${catalogBadge?.name ?? badge.name} 뱃지`}
                            className="w-full h-full object-contain rounded-2xl"
                            fallback={<span>{badge.icon}</span>}
                          />
                        </span>
                      </div>
                      <div className="text-[12px] font-mono font-bold text-primary mb-1">Lv.{badge.level}</div>
                      <h4 className="text-[14px] font-bold text-blue-grey-900 mb-2">
                        {catalogBadge?.name ?? badge.name}
                      </h4>
                      <p className="text-[12px] text-blue-grey-500 leading-relaxed font-normal">{badge.description}</p>
                      
                      {!isUnlocked && (
                        <div className="mt-4 flex items-center justify-center gap-1 text-[11px] font-mono text-blue-grey-400 bg-blue-grey-50 px-2 py-1 rounded">
                          <Lock className="w-3 h-3" />
                          LOCKED
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 다중 업로드 영역 */}
            <div id="resume">
              <MultiFileUploader title="이력서 데이터 풀 (Resume)" required maxFiles={3} resumeType="RESUME" />
              <MultiFileUploader title="포트폴리오 데이터 풀 (Portfolio)" maxFiles={3} resumeType="PORTFOLIO" />
            </div>

          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'HISTORY' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <h3 className="text-[20px] leading-[28px] font-bold text-blue-grey-900 mb-6 flex items-center gap-2">
              나의 면접 전적
            </h3>
            
            <div className="space-y-4">
              {Object.entries(groupedHistory).map(([groupName, items]) => {
                const isExpanded = expandedGroups[groupName] !== false; // default true
                
                return (
                  <div key={groupName} className="border border-blue-grey-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <button 
                      onClick={() => toggleGroup(groupName)}
                      className="w-full flex items-center justify-between p-5 bg-blue-grey-10/50 hover:bg-blue-grey-25 transition-colors border-b border-blue-grey-50"
                    >
                      <h4 className="text-[16px] font-bold text-blue-grey-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-grey-100 flex items-center justify-center text-[14px] border border-blue-grey-200">
                          {groupName.includes('대리') ? '😎' : groupName.includes('과장') ? '🧐' : '🐣'}
                        </div>
                        {groupName} <span className="text-[13px] font-normal text-blue-grey-500 font-mono">({items.length})</span>
                      </h4>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-grey-400" /> : <ChevronDown className="w-5 h-5 text-blue-grey-400" />}
                    </button>
                    
                    {isExpanded && (
                      <div className="p-5 flex flex-col gap-3 bg-slate-50">
                        {items.map((history) => (
                          <button 
                            key={history.id}
                            onClick={() => {
                              setSelectedHistory(history);
                              setIsDrawerOpen(true);
                            }}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:-translate-y-0.5 hover:shadow-md transition-all text-left group shadow-sm cursor-pointer"
                          >
                            <div className="mb-3 sm:mb-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-slate-500 font-mono text-[13px]">[{history.date}]</span>
                              </div>
                              <h4 className="text-[15px] font-bold text-blue-grey-900 group-hover:text-primary transition-colors flex items-center gap-2 flex-wrap">
                                {history.tag && (
                                  <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-100">
                                    {history.tag}
                                  </span>
                                )}
                                <span className="ml-1 text-blue-grey-700">중점 면접</span>
                              </h4>
                            </div>
                            <div className="flex items-center gap-4 shrink-0 mt-3 sm:mt-0">
                              <div className="text-[14px] font-bold font-mono text-slate-500">
                                {history.score} <span className="text-[11px] font-normal text-blue-grey-500">점</span>
                              </div>
                              <div className={twMerge(
                                "px-3 py-1 rounded-md text-[11px] font-bold font-mono text-center w-16",
                                history.passed ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                              )}>
                                {history.passed ? "합격" : "불합격"}
                              </div>
                              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CONFIG TAB */}
        {activeTab === 'CONFIG' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Same config layout as before... */}
            <section className="mb-10">
              <h3 className="text-[20px] leading-[28px] font-bold text-blue-grey-900 mb-6 flex items-center gap-2">
                개인정보 취급 및 보안 방침
              </h3>
              <div className="bg-white border border-blue-grey-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-blue-grey-50 pb-4">
                  <ShieldCheck className="w-5 h-5 text-success" />
                  <h4 className="text-[16px] font-bold text-blue-grey-900">당신의 데이터는 안전하게 보호됩니다</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-blue-grey-10 rounded-2xl border border-blue-grey-50">
                    <div className="w-8 h-8 bg-blue-grey-25 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-grey-900 font-bold">1</div>
                    <div>
                      <h5 className="text-[14px] leading-[20px] font-bold text-blue-grey-900 mb-1">원본 파일 즉시 파기</h5>
                      <p className="text-blue-grey-900 text-[14px] leading-[20px] font-normal">업로드된 파일은 서버 임시 경로에서 파싱 후 즉시 영구적으로 삭제됩니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-blue-grey-10 rounded-2xl border border-blue-grey-50">
                    <div className="w-8 h-8 bg-blue-grey-25 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-grey-900 font-bold">2</div>
                    <div>
                      <h5 className="text-[14px] leading-[20px] font-bold text-blue-grey-900 mb-1">추출 텍스트 암호화 및 캐싱</h5>
                      <p className="text-blue-grey-900 text-[14px] leading-[20px] font-normal">추출된 데이터는 암호화되어 캐싱되며, 목적 외의 이용은 원천 차단됩니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-blue-grey-10 rounded-2xl border border-blue-grey-50">
                    <div className="w-8 h-8 bg-blue-grey-25 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-grey-900 font-bold">3</div>
                    <div>
                      <h5 className="text-[14px] leading-[20px] font-bold text-blue-grey-900 mb-1">민감정보 마스킹 처리</h5>
                      <p className="text-blue-grey-900 text-[14px] leading-[20px] font-normal">AI(LLM)에 전송되기 전, 모든 개인 식별 및 민감정보는 안전하게 마스킹 처리됩니다.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[20px] leading-[28px] font-bold text-blue-grey-900 mb-6 flex items-center gap-2">
                계정 관리
              </h3>
              <div className="bg-white border border-blue-grey-100 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 shadow-sm">
                <button 
                  onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-grey-50 text-blue-grey-700 border border-blue-grey-100 rounded-2xl text-[14px] font-bold hover:bg-blue-grey-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
                <button 
                  onClick={() => setIsDeleteAccountModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-danger/5 text-danger border border-danger/10 rounded-2xl text-[14px] font-bold hover:bg-danger/10 transition-colors"
                >
                  <UserMinus className="w-4 h-4" />
                  회원 탈퇴
                </button>
              </div>
            </section>
          </div>
        )}

      </div>

      {/* Delete Account Warning Modal */}
      {isDeleteAccountModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-blue-grey-100 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-blue-grey-900 mb-3 text-center">떠나신다니 아쉬워요 😢</h3>
            <p className="text-blue-grey-500 text-[15px] leading-relaxed mb-8 text-center">
              탈퇴 시 그동안 쌓아온 신뢰도 게이지와 모든 면접 전적, 등록된 이력서 데이터가 영구적으로 삭제되며 절대 복구할 수 없습니다. 그래도 탈퇴하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteAccountModalOpen(false)}
                className="flex-1 py-3 px-4 bg-blue-grey-100 hover:bg-blue-grey-200 text-blue-grey-700 rounded-xl font-bold transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleWithdraw}
                className="flex-1 py-3 px-4 bg-danger hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
              >
                네, 탈퇴하겠습니다
              </button>
            </div>
          </div>
        </div>
      )}

      <HistoryDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        historyItem={selectedHistory} 
      />
    </div>
  );
}
