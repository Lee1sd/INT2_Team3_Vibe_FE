import { ReactNode, useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

interface BadgeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallback: ReactNode;
}

/** 운영 S3 URL은 유지하고 개발용 상대 경로는 백엔드 origin 기준 절대 URL로 변환한다. */
function resolveBadgeImageUrl(src?: string | null): string | null {
  if (!src) return null;
  if (/^(https?:|data:|blob:)/i.test(src)) return src;

  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const path = src.startsWith('/') ? src : `/${src}`;
  return `${baseUrl}${path}`;
}

/** 이미지 URL이 없거나 만료·네트워크 오류로 실패하면 기존 아이콘을 표시한다. */
export function BadgeImage({ src, alt, className, fallback }: BadgeImageProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = resolveBadgeImageUrl(src);

  /** 새 Presigned URL이 도착하면 이전 URL의 실패 상태를 초기화한다. */
  useEffect(() => {
    setFailed(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || failed) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
