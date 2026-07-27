import type { HTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type PanelPadding = 'none' | 'md' | 'lg';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  padding?: PanelPadding;
  children: ReactNode;
}

const paddingClass: Record<PanelPadding, string> = {
  none: '',
  md: 'p-6',
  lg: 'p-8 sm:p-10',
};

/** 라이트 셸용 흰 카드 패널. */
export function Panel({ padding = 'md', className, children, ...props }: PanelProps) {
  return (
    <div
      className={twMerge(
        'bg-shell-card border border-shell-border rounded-2xl shadow-sm',
        paddingClass[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
