/**
 * 정적 에셋(면접관 PNG 등) URL.
 * `VITE_STATIC_ASSET_BASE_URL`이 있으면 S3/CDN prefix를 붙이고,
 * 없으면 기존처럼 앱 origin 상대경로(`/interviewers/...`)를 쓴다.
 *
 * @see https://github.com/Lee1sd/INT2_Team3_Vibe_FE/issues/52
 */
export function staticAssetUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const rawBase = import.meta.env.VITE_STATIC_ASSET_BASE_URL as string | undefined;
  const base = rawBase?.trim().replace(/\/$/, '') ?? '';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
