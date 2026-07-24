/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { authService } from './domains/auth/auth.service';
import { PROFILE_UPDATED_EVENT } from './domains/auth/profile-events';
import Login from './pages/Login';
import OAuthCallback from './pages/OAuthCallback';
import ResumeUpload from './pages/ResumeUpload';
import InterviewerList from './pages/InterviewerList';
import InterviewProcess from './pages/InterviewProcess';
import Result from './pages/Result';
import MyPage from './pages/MyPage';

/** 헤더 로고·파비콘과 동일한 브랜드 에셋. */
const BRAND_ICON_SRC = '/brand/career-dungeon-icon.png';

/**
 * accessToken은 메모리에만 두므로, 새로고침 시 AU-003 refresh로 복구한다.
 * 복구가 끝날 때까지 하위 라우트가 API를 치면 401이 나므로 부트 완료 후 렌더한다.
 * BE가 느리거나 hang이어도 스피너에 영구 고정되지 않도록 안전 상한을 둔다.
 */
const AUTH_BOOT_SAFETY_MS = 4000;

function AuthBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const markReady = () => {
      if (!cancelled) setReady(true);
    };

    // 안전 상한은 UI만 풀어 준다. restoreSession fetch 자체를 abort하지 않는다.
    // (abort 시 BE는 refresh 쿠키를 revoke했는데 FE는 새 토큰을 못 받아 세션이 끊긴다.)
    const safetyTimer = window.setTimeout(() => {
      console.warn(
        `[AuthBootstrap] restoreSession이 ${AUTH_BOOT_SAFETY_MS}ms 내 끝나지 않아 부트를 강제 완료합니다.`,
      );
      markReady();
    }, AUTH_BOOT_SAFETY_MS);

    authService
      .restoreSession()
      .catch((error) => {
        console.error('[AuthBootstrap] restoreSession failed', error);
      })
      .finally(() => {
        window.clearTimeout(safetyTimer);
        markReady();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-blue-grey-10">
        <div className="w-12 h-12 border-4 border-blue-grey-75 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return children;
}

/** 마이페이지와 동일: 사진 있으면 사진, 없으면 이메일 이니셜. */
function HeaderProfileLink() {
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [initial, setInitial] = useState('U');

  useEffect(() => {
    let cancelled = false;

    const applyUser = (user: { photoUrl?: string; photoURL?: string; email?: string }) => {
      if (cancelled) return;
      setPhotoUrl(user.photoUrl || user.photoURL);
      setInitial(user.email?.charAt(0).toUpperCase() || 'U');
    };

    const load = () => {
      authService
        .getCurrentUser()
        .then(applyUser)
        .catch(() => {
          if (cancelled) return;
          setPhotoUrl(undefined);
          setInitial('U');
        });
    };

    load();

    const onProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ photoUrl?: string; email?: string }>).detail;
      if (detail && 'photoUrl' in detail) {
        if (cancelled) return;
        setPhotoUrl(detail.photoUrl || undefined);
        if (detail.email) {
          setInitial(detail.email.charAt(0).toUpperCase() || 'U');
        }
        return;
      }
      load();
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    };
  }, []);

  return (
    <Link
      to="/mypage"
      className="p-1.5 text-blue-grey-500 hover:text-primary hover:bg-blue-grey-25 rounded-full transition-colors flex items-center justify-center"
      aria-label="마이페이지"
    >
      <div className="w-8 h-8 rounded-full bg-blue-grey-100 overflow-hidden border border-blue-grey-75 shadow-sm flex items-center justify-center">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="text-sm font-bold text-blue-grey-400">{initial}</span>
        )}
      </div>
    </Link>
  );
}

export default function App() {
  return (
    <AuthBootstrap>
      <BrowserRouter>
        <div className="min-h-screen bg-blue-grey-10 text-blue-grey-900 font-sans selection:bg-primary/20 selection:text-primary">
          <header className="border-b border-blue-grey-75 bg-white sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
            <Link to="/dungeon" className="flex items-center gap-3">
              <img
                src={BRAND_ICON_SRC}
                alt="커리어 던전"
                className="w-10 h-10 rounded-2xl shadow-sm object-cover"
                draggable={false}
              />
              <h1 className="text-[26px] leading-[32px] font-bold tracking-tight text-blue-grey-900">커리어 던전</h1>
            </Link>
            <div className="flex items-center gap-6">
              <HeaderProfileLink />
            </div>
          </header>

          <main className="w-full">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/oauth/callback" element={<OAuthCallback />} />
              <Route path="/upload" element={<ResumeUpload />} />
              <Route path="/dungeon" element={<InterviewerList />} />
              <Route path="/interview/:interviewerId" element={<InterviewProcess />} />
              <Route path="/result/:sessionId" element={<Result />} />
              <Route path="/mypage" element={<MyPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthBootstrap>
  );
}
