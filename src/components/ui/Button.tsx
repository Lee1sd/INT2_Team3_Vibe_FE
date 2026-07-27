import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
  secondary:
    'border border-shell-border bg-shell-card text-shell-ink hover:bg-shell-muted hover:border-shell-border shadow-sm',
  ghost: 'border border-shell-border text-shell-ink hover:bg-shell-muted',
};

const sizeClass: Record<ButtonSize, string> = {
  md: 'px-6 py-2 text-[14px] leading-[20px] rounded-lg',
  lg: 'w-full px-6 py-3 text-[16px] leading-[24px] rounded-2xl',
};

/** 라이트 셸 화면용 공통 버튼. */
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={twMerge(
        'inline-flex items-center justify-center gap-2 font-bold transition-colors',
        'disabled:opacity-32 disabled:cursor-not-allowed',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
