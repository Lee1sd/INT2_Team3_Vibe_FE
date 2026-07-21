/**
 * 면접 세션 입장 직후 1회만 쓰는 오프닝 인사.
 * LLM/BE Message가 아니라 FE 연출용 멘트다.
 */
const OPENING_GREETING_TEMPLATES = [
  '{name}님, 안녕하세요. 오늘 면접 잘 부탁드려요.',
  '{name}님 맞으시죠? 반갑습니다. 그럼 시작해볼게요.',
  '안녕하세요, {name}님. 긴장 푸시고 편하게 말씀해 주세요.',
  '{name}님, 와주셔서 고마워요. 바로 시작해도 될까요?',
  '반갑습니다, {name}님. 오늘 이야기 잘 부탁드려요.',
  '{name}님, 안녕하세요. 이력서는 미리 살펴봤어요.',
  '{name}님, 오늘 시간 내주셔서 감사합니다. 천천히 진행할게요.',
  '안녕하세요. {name}님이죠? 만나서 반가워요.',
  '{name}님, 잘 오셨습니다. 준비되셨으면 시작할게요.',
  '{name}님, 안녕하세요. 오늘 좋은 이야기 많이 들어볼게요.',
] as const;

export function pickOpeningGreeting(name: string): string {
  const safeName = name.trim() || '지원자';
  const template =
    OPENING_GREETING_TEMPLATES[Math.floor(Math.random() * OPENING_GREETING_TEMPLATES.length)];
  return template.replaceAll('{name}', safeName);
}
