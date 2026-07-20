import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAccessToken } from '../api/client';

/**
 * AU-002(구글 로그인 콜백) 완료 후 백엔드가 이 경로로 리다이렉트한다.
 * 리다이렉트 URL: /oauth/callback#accessToken=... (ADR-017)
 *
 * 쿼리 파라미터(?accessToken=)가 아니라 URL fragment(#)로 전달된다 — fragment는 브라우저가
 * 서버로 절대 전송하지 않으므로 접근 로그·Referer 헤더에 토큰이 남지 않는다. refreshToken은
 * HttpOnly 쿠키로 별도 전달되므로 여기서 다루지 않는다.
 */
export default function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // location.hash는 '#accessToken=...' 형태로 앞에 '#'이 붙어있어 그대로 URLSearchParams에
    // 넘기면 키 이름에 '#'까지 포함돼버리므로 앞의 '#'을 잘라내고 파싱한다.
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const accessToken = params.get('accessToken');

    if (accessToken) {
      setAccessToken(accessToken);
      // 토큰이 담긴 fragment를 주소창 히스토리에서 즉시 제거한다(ADR-017).
      window.history.replaceState(null, '', window.location.pathname);
      navigate('/dungeon', { replace: true });
    } else {
      console.error('OAuth 콜백 URL(fragment)에 accessToken이 없습니다.');
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-73px)]">
      <div className="w-12 h-12 border-4 border-blue-grey-75 border-t-primary rounded-full animate-spin"></div>
    </div>
  );
}
