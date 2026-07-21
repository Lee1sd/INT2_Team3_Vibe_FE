/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { UserCircle } from 'lucide-react';
import { authService } from './domains/auth/auth.service';
import Login from './pages/Login';
import OAuthCallback from './pages/OAuthCallback';
import ResumeUpload from './pages/ResumeUpload';
import InterviewerList from './pages/InterviewerList';
import InterviewProcess from './pages/InterviewProcess';
import Result from './pages/Result';
import MyPage from './pages/MyPage';

/**
 * accessToken은 메모리에만 두므로, 새로고침 시 AU-003 refresh로 복구한다.
 * 복구가 끝날 때까지 하위 라우트가 API를 치면 401이 나므로 부트 완료 후 렌더한다.
 */
function AuthBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    authService.restoreSession().finally(() => {
      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
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

export default function App() {
  return (
    <AuthBootstrap>
      <BrowserRouter>
        <div className="min-h-screen bg-blue-grey-10 text-blue-grey-900 font-sans selection:bg-primary/20 selection:text-primary">
          <header className="border-b border-blue-grey-75 bg-white sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
            <Link to="/dungeon" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-white font-bold font-mono shadow-sm">
                CD
              </div>
              <h1 className="text-[26px] leading-[32px] font-bold tracking-tight text-blue-grey-900">커리어 던전</h1>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/mypage" className="p-2 text-blue-grey-500 hover:text-primary hover:bg-blue-grey-25 rounded-full transition-colors flex items-center justify-center" aria-label="마이페이지">
                <UserCircle className="w-7 h-7" strokeWidth={1.5} />
              </Link>
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
