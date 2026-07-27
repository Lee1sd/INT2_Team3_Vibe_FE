import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '../api/client';
import { AUTH_TOKEN_CHANGED_EVENT } from '../domains/auth/profile-events';
import { saveReturnUrl } from '../domains/auth/return-url';

/**
 * 보호 라우트 가드. AuthBootstrap 이후에만 마운트되므로,
 * 새로고침 시 refresh 시도가 끝난 뒤 accessToken 유무로 판단한다.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [accessToken, setAccessTokenState] = useState<string | null>(() => getAccessToken());

  useEffect(() => {
    const sync = () => setAccessTokenState(getAccessToken());
    sync();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, sync);
  }, []);

  if (!accessToken) {
    const returnUrl = `${location.pathname}${location.search}${location.hash}`;
    saveReturnUrl(returnUrl);
    return <Navigate to="/" replace state={{ returnUrl }} />;
  }

  return children;
}
