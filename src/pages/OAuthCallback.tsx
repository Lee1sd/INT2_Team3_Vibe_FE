import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAccessToken } from '../api/client';

/**
 * AU-002(구글 로그인 콜백) 완료 후 백엔드가 이 경로로 리다이렉트한다.
 * 리다이렉트 URL: /oauth/callback?accessToken=... (refreshToken은 HttpOnly 쿠키로 별도 전달되므로 여기서 다루지 않음)
 */
export default function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');

    if (accessToken) {
      setAccessToken(accessToken);
      navigate('/dungeon', { replace: true });
    } else {
      console.error('OAuth 콜백 URL에 accessToken이 없습니다.');
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-73px)]">
      <div className="w-12 h-12 border-4 border-blue-grey-75 border-t-primary rounded-full animate-spin"></div>
    </div>
  );
}
