import { twMerge } from 'tailwind-merge';

export interface PageSpinnerProps {
  className?: string;
  /** 기본 min-h-[70vh]. 전체 화면 부트 스피너는 min-h-screen 등으로 덮어쓴다. */
  size?: 'md' | 'lg';
  label?: string;
}

/** 페이지/섹션 중앙 로딩 스피너. */
export function PageSpinner({ className, size = 'lg', label = '로딩 중' }: PageSpinnerProps) {
  const spinnerSize = size === 'lg' ? 'w-16 h-16 border-4' : 'w-8 h-8 border-2';

  return (
    <div
      className={twMerge('flex justify-center items-center min-h-[70vh]', className)}
      role="status"
      aria-label={label}
    >
      <div
        className={twMerge(
          spinnerSize,
          'border-shell-border border-t-primary rounded-full animate-spin',
        )}
      />
    </div>
  );
}
