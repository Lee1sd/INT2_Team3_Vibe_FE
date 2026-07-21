import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../api/client';
import { authService } from '../domains/auth/auth.service';
import { Mail } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // AuthBootstrap이 refresh로 세션을 복구한 뒤면 로그인 화면을 건너뛴다.
  useEffect(() => {
    if (getAccessToken()) {
      navigate('/dungeon', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (provider: string) => {
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
    <div className="relative min-h-[calc(100vh-73px)] overflow-hidden flex flex-col items-center pt-24 px-6 z-0 bg-blue-grey-10">


      <div className="w-full max-w-md bg-white border border-blue-grey-75 rounded-2xl p-6 shadow-sm text-center relative z-10">
        <div className="w-20 h-20 bg-blue-grey-25 rounded-2xl mx-auto flex items-center justify-center mb-8 border border-blue-grey-75">
          <span className="text-4xl">🐣</span>
        </div>
        <h2 className="text-[32px] leading-[46px] font-bold text-blue-grey-900 mb-3 tracking-tight">커리어 던전 입장</h2>
        <p className="text-[16px] leading-[28px] text-blue-grey-900 mb-10">당신의 이력서로 구성된 맞춤형 면접관을<br/>격파하고 신뢰를 얻어내세요!</p>
        
        <div className="space-y-3">
          <button
            onClick={() => handleLogin('google')}
            disabled={isLoading}
            className={twMerge(
              "w-full flex items-center justify-center gap-3 py-3 px-6 border border-blue-grey-75 rounded-2xl font-bold text-[16px] leading-[24px] text-blue-grey-900 bg-white hover:bg-blue-grey-25 hover:border-blue-grey-75 transition-colors shadow-sm",
              isLoading && "opacity-32 cursor-not-allowed hover:bg-white hover:border-blue-grey-75"
            )}
          >
            <Mail className="w-5 h-5 text-danger" />
            Google 계정으로 시작하기
          </button>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl z-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      <p className="text-center text-[14px] leading-[20px] font-mono text-blue-grey-900 mt-6 bg-blue-grey-50 border border-blue-grey-75 py-2 px-4 rounded-xl relative z-10">
        <span className="font-bold mr-1 text-info">INFO</span> Mock 모드입니다.
      </p>
    </div>
  );
}
