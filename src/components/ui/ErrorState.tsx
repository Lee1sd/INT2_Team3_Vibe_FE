import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface ErrorStateProps {
  message: string;
  /** 다시 시도 / 돌아가기 등 액션 버튼 영역 */
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

/** 라이트 셸용 에러(또는 실패) 상태 블록. */
export function ErrorState({ message, action, className, compact = false }: ErrorStateProps) {
  return (
    <div
      className={twMerge(
        'flex flex-col items-center justify-center gap-4 px-6 text-center',
        compact ? 'py-8' : 'min-h-[70vh]',
        className,
      )}
      role="alert"
    >
      <AlertCircle className={twMerge('text-danger', compact ? 'w-10 h-10' : 'w-12 h-12')} />
      <p className="text-blue-grey-700 text-[14px] leading-[20px] font-normal max-w-md">{message}</p>
      {action ? <div className="flex flex-wrap items-center justify-center gap-3">{action}</div> : null}
    </div>
  );
}
