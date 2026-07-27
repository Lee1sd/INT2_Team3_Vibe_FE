import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getAccessToken } from '../api/client';
import { authService } from '../domains/auth/auth.service';
import { Button, PageSpinner, Panel } from '../components/ui';
import { Mail } from 'lucide-react';

const LOGIN_BRAND_ICON_SRC = '/brand/fvg.png';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // AuthBootstrap이 refresh로 세션을 복구한 뒤면 로그인 화면을 건너뛴다.
  if (getAccessToken()) {
    return <Navigate to="/dungeon" replace />;
  }

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await authService.login();
      navigate('/dungeon');
    } catch (error) {
      console.error('Login failed', error);
      alert('로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-73px)] overflow-hidden flex flex-col items-center pt-24 px-6 z-0 bg-shell-bg">
      <Panel className="w-full max-w-md text-center relative z-10" padding="md">
        <div className="w-20 h-20 bg-shell-muted rounded-2xl mx-auto flex items-center justify-center mb-8 border border-shell-border overflow-hidden">
          <img
            src={LOGIN_BRAND_ICON_SRC}
            alt="커리어 던전"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
        <h2 className="text-[32px] leading-[46px] font-bold text-shell-ink mb-3 tracking-tight">
          커리어 던전 입장
        </h2>
        <p className="text-[16px] leading-[28px] text-shell-ink mb-10">
          당신의 이력서로 구성된 맞춤형 면접관을
          <br />
          격파하고 신뢰를 얻어내세요!
        </p>

        <div className="space-y-3">
          <Button variant="secondary" size="lg" onClick={handleLogin} disabled={isLoading}>
            <Mail className="w-5 h-5 text-danger" />
            Google 계정으로 시작하기
          </Button>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-shell-card/80 backdrop-blur-sm flex items-center justify-center rounded-2xl z-20">
            <PageSpinner size="md" className="min-h-0" label="로그인 중" />
          </div>
        )}
      </Panel>
    </div>
  );
}
