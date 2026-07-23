import { twMerge } from 'tailwind-merge';

type InterviewerAvatarProps = {
  avatar?: string;
  name: string;
  className?: string;
  imgClassName?: string;
};

/** avatar가 비면 빈 슬롯, `/`·http로 시작하면 이미지, 그 외는 이모지/텍스트. */
export function InterviewerAvatar({
  avatar,
  name,
  className,
  imgClassName,
}: InterviewerAvatarProps) {
  if (!avatar) {
    return (
      <div
        className={twMerge(
          'bg-blue-grey-800/80 border border-dashed border-blue-grey-600 rounded-2xl',
          className,
        )}
        aria-label={`${name} 이미지 준비 중`}
      />
    );
  }

  if (avatar.startsWith('/') || avatar.startsWith('http')) {
    return (
      <img
        src={avatar}
        alt={name}
        className={twMerge('object-contain select-none', imgClassName, className)}
        draggable={false}
      />
    );
  }

  return <span className={className}>{avatar}</span>;
}
