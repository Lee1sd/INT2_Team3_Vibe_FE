import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '../api/client';
import { AUTH_TOKEN_CHANGED_EVENT } from '../domains/auth/profile-events';
import {
  clearIntentionalSignOut,
  clearReturnUrl,
  isIntentionalSignOut,
  saveReturnUrl,
} from '../domains/auth/return-url';

/**
 * 보호 라우트 가드. AuthBootstrap 이후에만 마운트되므로,
 * 새로고침 시 refresh 시도가 끝난 뒤 accessToken 유무로 판단한다.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [accessToken, setAccessTokenState] = useState<string | null>(() => getAccessToken());
  const returnUrl = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    const sync = () => setAccessTokenState(getAccessToken());
    sync();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, sync);
  }, []);

  // render 중 side-effect 금지 — Strict Mode 이중 렌더에서도 sessionStorage를 한 경로로만 쓴다.
  useEffect(() => {
    if (accessToken) {
      clearReturnUrl();
      clearIntentionalSignOut();
      return;
    }
    // 로그아웃/탈퇴로 토큰이 사라진 경우는 복귀 경로를 남기지 않는다.
    // (세션 만료와 달리 사용자가 의도적으로 나간 것이므로 다음 로그인은 기본 경로로 간다.)
    if (isIntentionalSignOut()) {
      clearReturnUrl();
      return;
    }
    saveReturnUrl(returnUrl);
  }, [accessToken, returnUrl]);

  if (!accessToken) {
    return <Navigate to="/" replace state={isIntentionalSignOut() ? null : { returnUrl }} />;
  }

  return children;
}
