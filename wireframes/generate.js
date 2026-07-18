/**
 * Grayscale page wireframes — matches current React pages 1:1.
 * Does NOT generate screen-flow diagrams.
 *
 * Run: node wireframes/generate.js
 */
const fs = require('fs');
const path = require('path');

const OUT = __dirname;
const W = 1440;

const C = {
  pageBg: '#eef0f2',
  white: '#ffffff',
  border: '#d6dae0',
  dash: '#b7bcc4',
  ink: '#2f333a',
  body: '#6c7278',
  muted: '#9aa0a8',
  faint: '#c4c9cf',
  skeleton: '#d3d7dc',
  chip: '#e7e9ec',
  primary: '#565b63',
  primaryTx: '#ffffff',
  darkBg: '#2a2d33',
  darkBg2: '#1e2126',
  darkCard: '#34383f',
  darkBd: '#484d55',
  onDark: '#f3f4f6',
  onDarkMut: '#a7adb5',
  darkChip: '#3f444b',
  accentSoft: '#3a3f46',
};

const FONT = "-apple-system, 'Malgun Gothic', 'Segoe UI', Roboto, sans-serif";
const EMOJI = "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function rect(x, y, w, h, r, fill, stroke, extra) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r || 0}" fill="${fill || 'none'}"` +
    `${stroke ? ` stroke="${stroke}"` : ''}${extra ? ' ' + extra : ''}/>`;
}
function line(x1, y1, x2, y2, stroke, sw, dash) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw || 1}"` +
    `${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}
function circle(cx, cy, r, fill, stroke, sw) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill || 'none'}"` +
    `${stroke ? ` stroke="${stroke}" stroke-width="${sw || 1}"` : ''}/>`;
}
function txt(x, y, s, size, fill, weight, anchor, extra) {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight || 400}" ` +
    `text-anchor="${anchor || 'start'}" font-family="${FONT}"${extra ? ' ' + extra : ''}>${esc(s)}</text>`;
}
function emoji(cx, cy, ch, size) {
  return `<text x="${cx}" y="${cy}" font-size="${size}" text-anchor="middle" font-family="${EMOJI}">${ch}</text>`;
}
function bar(x, y, w, h, fill) {
  return rect(x, y, w, h || 8, (h || 8) / 2, fill || C.skeleton);
}
function svgDoc(w, h, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}">
<rect x="0" y="0" width="${w}" height="${h}" fill="${C.pageBg}"/>
${body}
</svg>`;
}

function mailIcon(cx, cy) {
  const w = 20, h = 14, x = cx - w / 2, y = cy - h / 2;
  return rect(x, y, w, h, 2, 'none', C.body, 'stroke-width="1.3"') +
    `<path d="M${x} ${y} L${cx} ${y + h / 2} L${x + w} ${y}" fill="none" stroke="${C.body}" stroke-width="1.3"/>`;
}
function uploadCloudSm(cx, cy, col) {
  // Strict 12×12 UploadCloud — must fit inside 30px button with ≥6px padding
  const c = col || C.body;
  return `<g transform="translate(${cx},${cy})">` +
    `<path d="M-4.5 1.2c0-2.2 1.6-3.7 3.6-3.7 0.4-1.5 1.8-2.5 3.4-2.5 2 0 3.5 1.5 3.5 3.4h0.3c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5H-2.2c-1.3 0-2.3-1-2.3-2.2z" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/>` +
    `<path d="M0 5.2V-0.2M-2.2 1.8L0-0.2l2.2 2" fill="none" stroke="${c}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</g>`;
}
function uploadCloud(cx, cy, col, size) {
  // Large UploadCloud for empty/drop zones
  if (size && size <= 16) return uploadCloudSm(cx, cy, col);
  const c = col || C.body;
  return `<path d="M${cx - 15} ${cy + 7} a9 9 0 0 1 2 -18 a12 12 0 0 1 23 3 a8 8 0 0 1 -2 15" fill="none" stroke="${c}" stroke-width="1.6"/>` +
    `<path d="M${cx} ${cy + 9} L${cx} ${cy - 6} M${cx - 6} ${cy} L${cx} ${cy - 6} L${cx + 6} ${cy}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function userIcon(cx, cy) {
  return circle(cx, cy, 15, 'none', C.body, 1.5) +
    circle(cx, cy - 4, 4.5, 'none', C.body, 1.5) +
    `<path d="M${cx - 8} ${cy + 10} a8 8 0 0 1 16 0" fill="none" stroke="${C.body}" stroke-width="1.5"/>`;
}
function lockIcon(cx, cy, col, scale) {
  // Lucide-like lock: rounded body + shackle
  const c = col || C.onDarkMut;
  const s = scale || 1;
  const bw = 12 * s, bh = 9 * s;
  const x = cx - bw / 2, y = cy - bh / 2 + 2 * s;
  return rect(x, y, bw, bh, 2 * s, 'none', c, `stroke-width="${1.5 * s}"`) +
    `<path d="M${cx - 4 * s} ${y} v${-3.5 * s} a${4 * s} ${4 * s} 0 0 1 ${8 * s} 0 v${3.5 * s}" fill="none" stroke="${c}" stroke-width="${1.5 * s}" stroke-linecap="round"/>`;
}
function fileTextIcon(cx, cy, col) {
  // Lucide FileText: document + lines
  const c = col || C.muted;
  return `<path d="M${cx - 7} ${cy - 10} h9 l5 5 v15 h-14 z" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<path d="M${cx + 2} ${cy - 10} v5 h5" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<path d="M${cx - 4} ${cy + 1} h8 M${cx - 4} ${cy + 5} h8 M${cx - 4} ${cy + 9} h5" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>`;
}
function editIcon(cx, cy, col) {
  const c = col || C.muted;
  return `<path d="M${cx + 5} ${cy - 7} l3 3 L${cx - 4} ${cy + 8} L${cx - 7} ${cy + 8} L${cx - 7} ${cy + 5} Z" fill="none" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/>`;
}
function playIcon(cx, cy, col) {
  const c = col || C.primaryTx;
  return `<path d="M${cx - 5} ${cy - 7} L${cx + 7} ${cy} L${cx - 5} ${cy + 7} Z" fill="${c}"/>`;
}
function starIcon(cx, cy, col) {
  const c = col || C.body;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 6 : 2.6;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${c}"/>`;
}
function arrowLeft(cx, cy, col) {
  const c = col || C.body;
  return `<path d="M${cx + 5} ${cy - 5} L${cx - 4} ${cy} L${cx + 5} ${cy + 5} M${cx - 4} ${cy} L${cx + 6} ${cy}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function sendIcon(cx, cy, col) {
  const c = col || C.primaryTx;
  return `<path d="M${cx - 8} ${cy - 8} L${cx + 9} ${cy} L${cx - 8} ${cy + 8} L${cx - 5} ${cy} Z" fill="none" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/>`;
}
function checkIcon(cx, cy, col) {
  const c = col || C.body;
  return `<path d="M${cx - 6} ${cy} L${cx - 1} ${cy + 5} L${cx + 7} ${cy - 6}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function shieldIcon(cx, cy, col) {
  const c = col || C.body;
  return `<path d="M${cx} ${cy - 9} L${cx + 8} ${cy - 6} V${cy} a8 10 0 0 1 -8 9 a8 10 0 0 1 -8 -9 V${cy - 6} Z" fill="none" stroke="${c}" stroke-width="1.4"/>` +
    checkIcon(cx, cy - 1, c);
}
function helpIcon(cx, cy, col) {
  // Lucide HelpCircle: circle + ? mark
  const c = col || C.muted;
  return circle(cx, cy, 8, 'none', c, 1.5) +
    `<path d="M${cx - 2.5} ${cy - 2.5} a2.5 2.5 0 1 1 2.5 2.5 v1.5" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>` +
    circle(cx, cy + 4.5, 1, c);
}
function zapIcon(cx, cy, col) {
  const c = col || C.body;
  return `<path d="M${cx + 2} ${cy - 8} L${cx - 4} ${cy + 1} L${cx} ${cy + 1} L${cx - 2} ${cy + 8} L${cx + 4} ${cy - 1} L${cx} ${cy - 1} Z" fill="${c}"/>`;
}
function msgIcon(cx, cy, col) {
  const c = col || C.body;
  return rect(cx - 9, cy - 7, 18, 14, 3, 'none', c, 'stroke-width="1.4"') +
    `<path d="M${cx - 3} ${cy + 7} L${cx - 6} ${cy + 12} L${cx + 2} ${cy + 7}" fill="none" stroke="${c}" stroke-width="1.4"/>`;
}
function cameraIcon(cx, cy, col) {
  const c = col || C.body;
  return rect(cx - 8, cy - 5, 16, 12, 2, 'none', c, 'stroke-width="1.3"') +
    circle(cx, cy + 1, 3.5, 'none', c, 1.3) +
    rect(cx - 3, cy - 8, 6, 3, 1, 'none', c, 'stroke-width="1.2"');
}
function chevronRight(cx, cy, col) {
  const c = col || C.muted;
  return `<path d="M${cx - 3} ${cy - 6} L${cx + 3} ${cy} L${cx - 3} ${cy + 6}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`;
}
function xIcon(cx, cy, col) {
  const c = col || C.muted;
  return `<path d="M${cx - 6} ${cy - 6} L${cx + 6} ${cy + 6} M${cx + 6} ${cy - 6} L${cx - 6} ${cy + 6}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`;
}
function chevronUp(cx, cy, col) {
  const c = col || C.muted;
  return `<path d="M${cx - 6} ${cy + 2} L${cx} ${cy - 4} L${cx + 6} ${cy + 2}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`;
}

function header() {
  return [
    rect(0, 0, W, 72, 0, C.white),
    line(0, 72, W, 72, C.border, 1),
    rect(24, 16, 40, 40, 12, C.primary),
    txt(44, 41, 'CD', 13, C.white, 700, 'middle'),
    txt(76, 46, '커리어 던전', 22, C.ink, 700),
    userIcon(1402, 36),
  ].join('\n');
}

/* ================================================================== */
/* 1. LOGIN                                                           */
/* ================================================================== */
function loginPage() {
  const cx = W / 2;
  const cardW = 448, cardX = cx - cardW / 2, cardY = 168, cardH = 336;
  const p = [header()];
  p.push(rect(cardX, cardY, cardW, cardH, 20, C.white, C.border));
  p.push(rect(cx - 40, cardY + 28, 80, 80, 18, C.pageBg, C.border));
  p.push(emoji(cx, cardY + 82, '🐣', 34));
  p.push(txt(cx, cardY + 150, '커리어 던전 입장', 28, C.ink, 700, 'middle'));
  p.push(txt(cx, cardY + 186, '당신의 이력서로 구성된 맞춤형 면접관을', 15, C.ink, 400, 'middle'));
  p.push(txt(cx, cardY + 208, '격파하고 신뢰를 얻어내세요!', 15, C.ink, 400, 'middle'));
  const bx = cardX + 24, bw = cardW - 48, by = cardY + 250, bh = 50;
  p.push(rect(bx, by, bw, bh, 16, C.white, C.border));
  p.push(mailIcon(cx - 96, by + bh / 2));
  p.push(txt(cx + 12, by + bh / 2 + 5, 'Google 계정으로 시작하기', 15, C.ink, 700, 'middle'));
  const iw = 214, ix = cx - iw / 2, iy = cardY + cardH + 24;
  p.push(rect(ix, iy, iw, 34, 12, C.chip, C.border));
  p.push(txt(cx, iy + 22, 'INFO   Mock 모드입니다.', 12.5, C.ink, 400, 'middle'));
  return svgDoc(W, 800, p.join('\n'));
}

/* ================================================================== */
/* 2. RESUME UPLOAD                                                   */
/* ================================================================== */
function resumeUploadPage() {
  const cx = W / 2;
  const p = [header()];
  const bw = 96, bx = cx - bw / 2, by = 136;
  p.push(rect(bx, by, bw, 28, 6, C.chip, C.border));
  p.push(txt(cx, by + 19, 'STEP 01', 12.5, C.body, 700, 'middle'));
  p.push(txt(cx, 208, '무기(이력서) 장착', 26, C.ink, 700, 'middle'));
  p.push(txt(cx, 238, '이력서를 업로드하여 당신만의 맞춤형 면접 던전을 생성하세요.', 14, C.body, 400, 'middle'));
  const uW = 672, uX = cx - uW / 2, uY = 278, uH = 300;
  p.push(rect(uX, uY, uW, uH, 20, C.white, C.dash, 'stroke-width="2" stroke-dasharray="10,8"'));
  const mid = uY + uH / 2;
  p.push(rect(cx - 32, mid - 74, 64, 64, 16, C.pageBg, C.border));
  p.push(uploadCloud(cx, mid - 42));
  p.push(txt(cx, mid + 20, '클릭하여 파일 업로드', 20, C.ink, 700, 'middle'));
  p.push(txt(cx, mid + 46, '지원 형식: PDF, TXT, MD (최대 10MB)', 14, C.muted, 400, 'middle'));
  return svgDoc(W, 700, p.join('\n'));
}

/* ================================================================== */
/* 3. DUNGEON                                                         */
/* ================================================================== */
function dungeonCard(x, y, iv) {
  const cardW = 420;
  const out = [];
  // unlocked cards are taller due to achievement + keywords
  const h = iv.unlocked ? 420 : 280;
  out.push(rect(x, y, cardW, h, 20, C.darkCard, C.darkBd));
  out.push(rect(x + 28, y + 28, 64, 64, 16, C.darkChip, C.darkBd));
  out.push(emoji(x + 60, y + 72, iv.avatar, 30));
  out.push(rect(x + 112, y + 30, 48, 24, 6, C.darkChip));
  out.push(txt(x + 136, y + 46, 'Lv.' + iv.level, 12, C.onDark, 700, 'middle'));
  out.push(txt(x + 112, y + 80, iv.name, 19, C.onDark, 700));
  if (!iv.unlocked) {
    out.push(rect(x + cardW - 60, y + 26, 34, 34, 10, C.darkChip, C.darkBd));
    out.push(lockIcon(x + cardW - 43, y + 38));
  }
  out.push(txt(x + 28, y + 118, iv.desc, 13, C.onDarkMut, 400));

  // achievement box (levels 1-2 have special titles in UI; show for all with desc)
  if (iv.achTitle) {
    const ax = x + 28, ay = y + 140, aw = cardW - 56, ah = 78;
    out.push(rect(ax, ay, aw, ah, 4, C.accentSoft));
    out.push(rect(ax, ay, 4, ah, 0, C.onDarkMut));
    out.push(txt(ax + 16, ay + 24, iv.achTitle, 12, C.onDark, 700));
    // wrap achievement desc roughly
    const words = iv.achDesc;
    out.push(txt(ax + 16, ay + 46, words.slice(0, 28), 11, C.onDarkMut, 400));
    if (words.length > 28) out.push(txt(ax + 16, ay + 64, words.slice(28, 56) + (words.length > 56 ? '…' : ''), 11, C.onDarkMut, 400));
  }

  if (iv.unlocked) {
    const ky = y + 236;
    out.push(txt(x + 28, ky, '면접 집중 키워드 (1개 선택)', 13, C.onDarkMut, 700));
    const kws = ['데이터전처리', 'DB', '부하', '보안', '시스템설계', '클라우드'];
    let cxp = x + 28, cyp = ky + 16;
    const maxRight = x + cardW - 28;
    kws.forEach((k) => {
      const w = Math.max(40, k.length * 11 + 20);
      if (cxp + w > maxRight) { cxp = x + 28; cyp += 36; }
      out.push(rect(cxp, cyp, w, 28, 8, C.darkChip, C.darkBd));
      out.push(txt(cxp + w / 2, cyp + 19, k, 13, C.onDark, 400, 'middle'));
      cxp += w + 8;
    });
    const by = y + h - 72;
    out.push(rect(x + 28, by, cardW - 56, 48, 16, C.primary));
    out.push(playIcon(x + cardW / 2 - 66, by + 24));
    out.push(txt(x + cardW / 2 + 6, by + 30, '면접 시작하기', 16, C.primaryTx, 700, 'middle'));
  } else {
    const by = y + h - 72;
    out.push(rect(x + 28, by, cardW - 56, 48, 16, C.darkChip, C.darkBd));
    out.push(shieldIcon(x + cardW / 2 - 60, by + 24, C.onDarkMut));
    out.push(txt(x + cardW / 2 + 8, by + 30, '신뢰도 ' + iv.req + ' 필요', 15, C.onDarkMut, 700, 'middle'));
  }
  return { svg: out.join('\n'), h };
}

function dungeonPage() {
  const cx = W / 2;
  const heroBottom = 860;
  const total = 2500;
  const p = [header()];

  p.push(txt(cx, 180, '주니어 머쓱이님,', 38, C.ink, 700, 'middle'));
  p.push(txt(cx, 228, '다음 면접관이 기다립니다.', 38, C.ink, 700, 'middle'));

  p.push(rect(cx - 64, 280, 128, 128, 20, C.white, C.border));
  p.push(emoji(cx, 364, '🐣', 56));
  const spX = cx + 88, spY = 280, spW = 320, spH = 78;
  p.push(rect(spX, spY, spW, spH, 16, C.white, C.border));
  p.push(`<path d="M${spX} ${spY + 34} l-10 8 l10 8 Z" fill="${C.white}" stroke="${C.border}"/>`);
  p.push(txt(spX + 22, spY + 32, '앗! 아직 이력서가 없어요.', 13.5, C.ink, 400));
  p.push(txt(spX + 22, spY + 54, '던전에 입장하려면 이력서부터', 13.5, C.ink, 400));
  p.push(txt(spX + 22, spY + 72, '업로드해 주세요!', 13.5, C.ink, 400));

  p.push(txt(cx, 448, '초보 머쓱이 뱃지', 20, C.ink, 700, 'middle'));
  p.push(rect(cx - 90, 468, 180, 32, 16, C.white, C.border));
  p.push(starIcon(cx - 62, 484));
  p.push(txt(cx + 6, 489, '현재 레벨: Lv.1', 13, C.body, 700, 'middle'));

  const gW = 512, gX = cx - gW / 2, gY = 528, gH = 148;
  p.push(rect(gX, gY, gW, gH, 20, C.white, C.border));
  p.push(txt(gX + 24, gY + 34, '🔥 신뢰도 게이지', 14, C.ink, 700));
  p.push(helpIcon(gX + 148, gY + 28));
  p.push(txt(gX + gW - 24, gY + 34, '30 / 100', 14, C.body, 700, 'end'));
  p.push(rect(gX + 24, gY + 52, gW - 48, 16, 8, C.pageBg, C.border));
  p.push(rect(gX + 24, gY + 52, (gW - 48) * 0.3, 16, 8, C.primary));
  // gauge 30, next locked with req>30 is iv3(60) if iv2 unlocked? iv2 req 30, 30<30 false → next is iv3 req 60, remaining 30
  p.push(txt(cx, gY + 96, '다음 레벨 해금까지 남은 신뢰도: 30', 14, C.ink, 700, 'middle'));
  p.push(txt(cx, gY + 124, '아래로 스크롤하여 던전에 입장하세요 ↓', 14, C.muted, 400, 'middle'));
  p.push(line(0, heroBottom, W, heroBottom, C.border, 1));

  p.push(rect(0, heroBottom, W, total - heroBottom, 0, C.darkBg));
  p.push(txt(cx, heroBottom + 90, '면접관 던전', 32, C.onDark, 700, 'middle', 'letter-spacing="2"'));
  p.push(txt(cx, heroBottom + 128, '신뢰도를 쌓아 상위 레벨의 면접관을 해금하세요.', 16, C.onDarkMut, 400, 'middle'));

  const interviewers = [
    {
      level: 1, name: '널널한 대리', avatar: '🐣', unlocked: true, req: 0,
      desc: '코드 가독성과 기본기를 중요하게 생각합니다.',
      achTitle: '💡 [이력서 팩트체크 및 기본 CS 방어 수준]',
      achDesc: '내가 사용한 기술의 기본 개념과 프로젝트 기여도를 명확하게 설명할 수 있습니다.',
    },
    {
      level: 2, name: '깐깐한 과장', avatar: '🦅', unlocked: false, req: 30,
      desc: '아키텍처와 예외 처리를 날카롭게 파고듭니다.',
      achTitle: '💡 [실무 트러블슈팅 및 의사결정 심층 방어 수준]',
      achDesc: '특정 기술을 도입한 논리적 근거(Trade-off)와 한계점, 장애 대처 경험을 설득력 있게 방어할 수 있습니다.',
    },
    {
      level: 3, name: '압박 부장', avatar: '🦖', unlocked: false, req: 60,
      desc: '극한의 상황에서 멘탈과 문제 해결 능력을 봅니다.',
      achTitle: '🔓 [달성 역량]',
      achDesc: '스트레스 상황에서도 침착하게 근본적인 원인을 분석하고 대안을 제시할 수 있습니다.',
    },
    {
      level: 4, name: '냉철한 임원', avatar: '🐉', unlocked: false, req: 100,
      desc: '회사의 인재상과 컬처핏을 날카롭게 검증합니다.',
      achTitle: '🔓 [달성 역량]',
      achDesc: '조직의 비전에 부합하며 거시적인 관점에서의 엔지니어링 가치를 증명할 수 있습니다.',
    },
  ];

  let cy = 1040;
  const dots = [];
  interviewers.forEach((iv, i) => {
    const left = i % 2 === 0;
    const x = left ? cx - 40 - 420 : cx + 40;
    const c = dungeonCard(x, cy, iv);
    p.push(c.svg);
    dots.push({ y: cy + c.h / 2, unlocked: iv.unlocked });
    cy += c.h + 56;
  });
  p.push(line(cx, 1040, cx, dots[dots.length - 1].y, C.darkBd, 2));
  dots.forEach((d) => p.push(circle(cx, d.y, 6, d.unlocked ? C.onDarkMut : C.darkBd)));

  return svgDoc(W, total, p.join('\n'));
}

/* ================================================================== */
/* 4. INTERVIEW                                                       */
/* ================================================================== */
function interviewPage() {
  const cx = W / 2, H = 900;
  const p = [];
  p.push(rect(0, 0, W, H, 0, C.darkBg2));
  p.push(rect(24, 24, 156, 40, 10, C.darkCard, C.darkBd));
  p.push(arrowLeft(46, 44, C.onDarkMut));
  p.push(txt(64, 49, '면접 포기하기', 14, C.onDarkMut, 700));
  p.push(emoji(cx, 300, '🐣', 150));

  const secW = 896, secX = cx - secW / 2;
  p.push(rect(secX, 500, 48, 26, 6, C.darkChip));
  p.push(txt(secX + 24, 517, 'Lv.1', 13, C.onDark, 700, 'middle'));
  p.push(txt(secX + 60, 519, '널널한 대리', 15, C.onDark, 700));

  const dY = 540, dH = 160;
  p.push(rect(secX, dY, secW, dH, 20, C.darkCard, C.darkBd));
  p.push(txt(secX + 32, dY + 48, '[질문 1]', 16, C.onDarkMut, 700));
  p.push(txt(secX + 32, dY + 80, '이력서에 작성하신 캐싱 전략에서 정합성 문제는', 18, C.onDark, 700));
  p.push(txt(secX + 32, dY + 108, '어떻게 해결하셨나요?', 18, C.onDark, 700));
  p.push(txt(secX + secW - 32, dY + dH - 24, '■', 14, C.onDarkMut, 700, 'end'));

  const iY = 720, iH = 140, btnW = 120, gap = 16;
  const taW = secW - btnW - gap;
  p.push(rect(secX, iY, taW, iH, 16, C.darkBg, C.darkBd));
  p.push(txt(secX + 20, iY + 36, '답변을 입력하세요...', 15, C.onDarkMut, 400));
  const btnX = secX + taW + gap;
  p.push(rect(btnX, iY, btnW, iH, 16, C.primary));
  p.push(sendIcon(btnX + btnW / 2, iY + 52, C.primaryTx));
  p.push(txt(btnX + btnW / 2, iY + 90, '다음 질문', 14, C.primaryTx, 700, 'middle'));
  return svgDoc(W, H, p.join('\n'));
}

function interviewAbandonModal() {
  const cx = W / 2, H = 900;
  const p = [];
  // base interview faded
  p.push(rect(0, 0, W, H, 0, C.darkBg2));
  p.push(emoji(cx, 280, '🐣', 120));
  p.push(rect(cx - 448, 520, 896, 200, 20, C.darkCard, C.darkBd));
  // overlay
  p.push(rect(0, 0, W, H, 0, 'rgba(0,0,0,0.5)'));
  const mW = 420, mX = cx - mW / 2, mY = 300, mH = 260;
  p.push(rect(mX, mY, mW, mH, 20, C.darkCard, C.darkBd));
  p.push(txt(cx, mY + 52, '정말 면접을 포기하시겠습니까?', 20, C.onDark, 700, 'middle'));
  p.push(txt(cx, mY + 96, '지금 면접을 나가게 되면 현재까지의 대화 내용과', 14, C.onDarkMut, 400, 'middle'));
  p.push(txt(cx, mY + 118, '기록이 저장되지 않고 모두 사라집니다.', 14, C.onDarkMut, 400, 'middle'));
  const half = (mW - 64 - 12) / 2;
  p.push(rect(mX + 32, mY + 170, half, 48, 12, C.darkChip));
  p.push(txt(mX + 32 + half / 2, mY + 200, '취소(계속 진행)', 14, C.onDark, 700, 'middle'));
  p.push(rect(mX + 32 + half + 12, mY + 170, half, 48, 12, C.primary));
  p.push(txt(mX + 32 + half + 12 + half / 2, mY + 200, '포기하고 나가기', 14, C.primaryTx, 700, 'middle'));
  return svgDoc(W, H, p.join('\n'));
}

/* ================================================================== */
/* 5. RESULT                                                          */
/* ================================================================== */
function resultInner() {
  const cx = W / 2;
  const p = [header()];
  p.push(rect(cx - 62, 136, 124, 30, 6, C.chip, C.border));
  p.push(zapIcon(cx - 40, 151));
  p.push(txt(cx + 8, 156, '분석 완료', 13, C.body, 700, 'middle'));
  p.push(txt(cx, 216, '면접 결과 보고서', 32, C.ink, 700, 'middle'));
  p.push(txt(cx, 248, '당신의 답변을 바탕으로 신뢰도가 평가되었습니다.', 14, C.muted, 400, 'middle'));

  const cW = 672, cX = cx - cW / 2, cY = 288, cH = 310;
  p.push(rect(cX, cY, cW, cH, 20, C.white, C.border));
  p.push(rect(cx - 70, cY + 28, 140, 28, 6, C.chip));
  p.push(txt(cx - 8, cY + 47, '면접 점수', 13, C.body, 700, 'middle'));
  p.push(helpIcon(cx + 48, cY + 42));
  p.push(txt(cx, cY + 130, '100', 56, C.ink, 700, 'middle'));
  p.push(txt(cx + 58, cY + 130, '점', 24, C.muted, 700, 'middle'));

  const tW = 512, tX = cx - tW / 2, tY = cY + 180;
  p.push(txt(tX + tW * 0.8, tY - 14, '레벨업 기준 (80점)', 12, C.muted, 700, 'middle'));
  p.push(rect(tX, tY, tW, 16, 8, C.pageBg, C.border));
  p.push(rect(tX, tY, tW, 16, 8, C.primary));
  p.push(line(tX + tW * 0.8, tY, tX + tW * 0.8, tY + 16, C.faint, 2));
  p.push(txt(tX, tY + 42, '0점', 13, C.muted, 700, 'start'));
  p.push(txt(cx, tY + 42, '50점', 13, C.muted, 700, 'middle'));
  p.push(txt(tX + tW, tY + 42, '100점 (레벨업)', 13, C.ink, 700, 'end'));

  const fY = 640, fH = 200;
  p.push(rect(cX, fY, cW, fH, 20, C.white, C.border));
  p.push(msgIcon(cX + 36, fY + 36));
  p.push(txt(cX + 56, fY + 42, '종합 면접 피드백', 20, C.ink, 700));
  const ibX = cX + 24, ibY = fY + 60, ibW = cW - 48, ibH = 112;
  p.push(rect(ibX, ibY, ibW, ibH, 16, C.pageBg, C.border));
  p.push(bar(ibX + 20, ibY + 26, ibW - 40, 10));
  p.push(bar(ibX + 20, ibY + 50, ibW - 40, 10));
  p.push(bar(ibX + 20, ibY + 74, ibW - 130, 10));

  const bW = 224, bX = cx - bW / 2, bY = fY + fH + 40;
  p.push(rect(bX, bY, bW, 50, 16, C.primary));
  p.push(txt(cx - 8, bY + 32, '던전 맵으로 돌아가기', 14, C.primaryTx, 700, 'middle'));
  p.push(txt(bX + bW - 22, bY + 32, '›', 18, C.primaryTx, 700, 'middle'));
  return p;
}
function resultPage() { return svgDoc(W, 1000, resultInner().join('\n')); }
function resultModalPage() {
  const cx = W / 2, H = 1000;
  const p = resultInner();
  p.push(rect(0, 0, W, H, 0, 'rgba(20,22,25,0.66)'));
  const mW = 384, mX = cx - mW / 2, mY = 250, mH = 440;
  p.push(rect(mX, mY, mW, mH, 24, C.white));
  p.push(rect(cx - 48, mY + 40, 96, 96, 22, C.white, C.border));
  p.push(starIcon(cx, mY + 90, C.body));
  p.push(txt(cx, mY + 175, '새로운 뱃지 획득!', 26, C.ink, 700, 'middle'));
  p.push(txt(cx, mY + 208, 'Lv.2 깐깐한 과장 면접관이 해금되었습니다.', 14, C.body, 400, 'middle'));
  const qX = mX + 32, qY = mY + 236, qW = mW - 64, qH = 76;
  p.push(rect(qX, qY, qW, qH, 16, C.chip, C.border));
  p.push(txt(cx, qY + 32, '"트레이드오프를 설명할 줄 아는군요.', 13, C.body, 400, 'middle'));
  p.push(txt(cx, qY + 54, '다음 단계로 오시죠."', 13, C.body, 400, 'middle'));
  const bY = mY + mH - 92;
  p.push(rect(mX + 32, bY, mW - 64, 52, 16, C.primary));
  p.push(txt(cx, bY + 33, '피드백 확인하기', 16, C.primaryTx, 700, 'middle'));
  return svgDoc(W, H, p.join('\n'));
}

/* ================================================================== */
/* 6. MY PAGE — PROFILE / HISTORY / CONFIG                            */
/* ================================================================== */
function myPageShell(activeTab, contentFn) {
  const cx = W / 2;
  const cW = 896, cX = cx - cW / 2;
  const p = [header()];
  p.push(arrowLeft(cX + 8, 138, C.body));
  p.push(txt(cX + 24, 143, '면접 던전으로 돌아가기', 14, C.body, 700));
  p.push(txt(cX, 188, '마이페이지', 32, C.ink, 700));
  p.push(txt(cX, 216, '내 프로필, 파일 관리 및 전적을 확인하세요.', 14, C.muted, 400));

  const tabs = [
    { id: 'PROFILE', label: '[01_PROFILE]' },
    { id: 'HISTORY', label: '[02_HISTORY]' },
    { id: 'CONFIG', label: '[03_CONFIG]' },
  ];
  let tx = cX;
  tabs.forEach((t) => {
    const tw = 150;
    const isActive = t.id === activeTab;
    p.push(rect(tx, 250, tw, isActive ? 44 : 40, 12, isActive ? C.white : C.chip, C.border));
    p.push(txt(tx + tw / 2, isActive ? 278 : 276, t.label, 12, isActive ? C.ink : C.body, 700, 'middle'));
    tx += tw + 4;
  });

  const contentTop = 290;
  const { body, height } = contentFn(cX, cW, cx, contentTop);
  p.push(rect(cX, contentTop, cW, height, 20, C.white, C.border));
  // cover top-left radius under active tab visually
  p.push(rect(cX, contentTop, 40, 12, 0, C.white));
  p.push(body);
  return svgDoc(W, contentTop + height + 60, p.join('\n'));
}

function multiUploader(cX, cW, y, title, required, countLabel, sampleFiles) {
  // Matches MultiFileUploader layout exactly:
  // flex justify-between: [title + 필수? + (n/max)] ........ [UploadCloud 추가 업로드]
  // empty: FileText in rounded-full chip + copy
  // files: radio | name+ACTIVE | size | CheckCircle2
  const out = [];
  const leftX = cX + 24;
  const rightEdge = cX + cW - 24;

  // left cluster
  out.push(txt(leftX, y + 24, title, 16, C.ink, 700));
  // approximate title width (Korean ~13px, ASCII ~8px)
  let afterTitle = leftX + title.replace(/[^\x00-\xff]/g, 'aa').length * 8 + 8;
  if (required) {
    out.push(rect(afterTitle, y + 10, 36, 20, 10, C.chip));
    out.push(txt(afterTitle + 18, y + 24, '필수', 11, C.body, 700, 'middle'));
    afterTitle += 44;
  }
  out.push(txt(afterTitle, y + 24, countLabel, 13, C.muted, 400));

  // right upload button — matches px-3 py-1.5 + UploadCloud w-4 h-4 + gap-1.5
  const btnW = 118, btnH = 30, btnX = rightEdge - btnW, btnY = y + 7;
  const clipId = `upbtn_${Math.round(btnX)}_${Math.round(btnY)}`;
  out.push(`<defs><clipPath id="${clipId}"><rect x="${btnX}" y="${btnY}" width="${btnW}" height="${btnH}" rx="8"/></clipPath></defs>`);
  out.push(rect(btnX, btnY, btnW, btnH, 8, C.chip, C.border));
  out.push(`<g clip-path="url(#${clipId})">`);
  out.push(uploadCloudSm(btnX + 18, btnY + btnH / 2, C.body));
  out.push(txt(btnX + 70, btnY + 19, '추가 업로드', 12, C.body, 700, 'middle'));
  out.push(`</g>`);

  const boxY = y + 48;
  const files = sampleFiles || [];
  if (files.length === 0) {
    const boxH = 128;
    out.push(rect(cX + 24, boxY, cW - 48, boxH, 16, C.pageBg, C.border));
    const icx = cX + cW / 2, icy = boxY + 44;
    out.push(circle(icx, icy, 24, C.chip));
    out.push(fileTextIcon(icx, icy));
    out.push(txt(icx, boxY + 96, '업로드된 파일이 없습니다.', 14, C.muted, 400, 'middle'));
    return { svg: out.join('\n'), bottom: boxY + boxH };
  }

  const rowH = 64;
  const boxH = files.length * rowH;
  out.push(rect(cX + 24, boxY, cW - 48, boxH, 16, C.white, C.border));
  files.forEach((f, i) => {
    const ry = boxY + i * rowH;
    if (i > 0) out.push(line(cX + 24, ry, cX + cW - 24, ry, C.border, 1));
    if (f.active) out.push(rect(cX + 24, ry, cW - 48, rowH, 0, C.chip));
    // radio
    out.push(circle(cX + 48, ry + rowH / 2, 8, C.white, C.body, 1.5));
    if (f.active) out.push(circle(cX + 48, ry + rowH / 2, 4, C.primary));
    out.push(txt(cX + 68, ry + 28, f.name, 14, C.ink, 700));
    if (f.active) {
      out.push(rect(cX + 68 + f.name.length * 8 + 8, ry + 14, 48, 18, 4, C.primary));
      out.push(txt(cX + 68 + f.name.length * 8 + 32, ry + 27, 'ACTIVE', 10, C.white, 700, 'middle'));
    }
    out.push(txt(cX + 68, ry + 48, f.size, 12, C.muted, 400));
    // CheckCircle2
    const ccx = cX + cW - 52, ccy = ry + rowH / 2;
    out.push(circle(ccx, ccy, 10, 'none', C.body, 1.6));
    out.push(checkIcon(ccx, ccy, C.body));
  });
  return { svg: out.join('\n'), bottom: boxY + boxH };
}

function myPageProfile() {
  return myPageShell('PROFILE', (cX, cW, cx, top) => {
    const out = [];
    let y = top + 32;
    out.push(txt(cX + 32, y, '프로필 정보', 20, C.ink, 700));
    y += 20;
    out.push(rect(cX + 32, y, cW - 64, 120, 20, C.pageBg, C.border));
    out.push(circle(cX + 100, y + 60, 40, C.chip, C.white));
    out.push(txt(cX + 100, y + 68, 'U', 24, C.muted, 700, 'middle'));
    out.push(circle(cX + 128, y + 88, 12, C.white, C.border));
    out.push(cameraIcon(cX + 128, y + 88));
    out.push(txt(cX + 170, y + 50, '익명 사용자', 20, C.ink, 700));
    out.push(editIcon(cX + 300, y + 44));
    out.push(line(cX + 170, y + 56, cX + 290, y + 56, C.dash, 1, '4,4'));
    out.push(txt(cX + 170, y + 82, 'user@example.com', 14, C.muted, 400));

    y += 160;
    out.push(txt(cX + 32, y, '머쓱이 뱃지 도감', 20, C.ink, 700));
    out.push(helpIcon(cX + 180, y - 6));
    y += 20;
    const badges = [
      { lv: 1, name: '인턴 머쓱', icon: '🐣', desc1: '면접의 첫 걸음을', desc2: '내딛다', unlocked: true },
      { lv: 2, name: '대리 머쓱', icon: '🐥', desc1: '꼬리 질문에도', desc2: '당황하지 않음', unlocked: false },
      { lv: 3, name: '과장 머쓱', icon: '🦅', desc1: '면접관을 리드하기', desc2: '시작함', unlocked: false },
      { lv: 4, name: '팀장 머쓱', icon: '🐉', desc1: '모든 면접관을', desc2: '제패한 지원자', unlocked: false },
    ];
    const gap = 16, colW = (cW - 64 - gap * 3) / 4, bH = 210;
    badges.forEach((b, i) => {
      const x = cX + 32 + i * (colW + gap);
      out.push(rect(x, y, colW, bH, 16, C.white, C.border));
      // icon box w-16 h-16 rounded-2xl
      out.push(rect(x + colW / 2 - 32, y + 20, 64, 64, 16, b.unlocked ? C.pageBg : C.chip, C.border));
      out.push(emoji(x + colW / 2, y + 62, b.icon, 28));
      out.push(txt(x + colW / 2, y + 108, 'Lv.' + b.lv, 12, C.body, 700, 'middle'));
      out.push(txt(x + colW / 2, y + 128, b.name, 14, C.ink, 700, 'middle'));
      out.push(txt(x + colW / 2, y + 150, b.desc1, 12, C.muted, 400, 'middle'));
      out.push(txt(x + colW / 2, y + 168, b.desc2, 12, C.muted, 400, 'middle'));
      if (!b.unlocked) {
        // LOCKED chip: lock + text, font-mono 11px
        const chipW = 78, chipX = x + colW / 2 - chipW / 2, chipY = y + 178;
        out.push(rect(chipX, chipY, chipW, 22, 4, C.chip));
        out.push(lockIcon(chipX + 16, chipY + 11, C.muted, 0.9));
        out.push(txt(chipX + 48, chipY + 15, 'LOCKED', 11, C.muted, 700, 'middle'));
      }
    });

    y += bH + 40;
    // Resume: show 1 completed file (typical filled state) — matches radio/ACTIVE/check UI
    const u1 = multiUploader(cX, cW, y, '이력서 데이터 풀 (Resume)', true, '(1/3)', [
      { name: 'resume_v3.pdf', size: '1.24 MB', active: true },
    ]);
    out.push(u1.svg);
    y = u1.bottom + 32;
    // Portfolio: empty state with FileText icon
    const u2 = multiUploader(cX, cW, y, '포트폴리오 데이터 풀 (Portfolio)', false, '(0/3)', []);
    out.push(u2.svg);
    const height = u2.bottom - top + 40;
    return { body: out.join('\n'), height };
  });
}

/** MOCK_HISTORY[0] from MyPage.tsx — drawer open state uses this item */
const HISTORY_DRAWER_ITEM = {
  date: '26.07.09',
  interviewerName: '널널한 대리',
  score: 90,
  passed: true,
  tag: 'React',
  feedback:
    '전반적으로 프론트엔드 기본기가 탄탄하며, 실무에서 마주할 수 있는 트레이드오프 상황에 대한 이해도가 높습니다. 캐싱 정합성 문제에서 다소 아쉬운 점이 있었으나 꼬리 질문을 통해 훌륭하게 방어했습니다. 합격을 축하합니다!',
  logs: [
    { speaker: 'interviewer', name: '널널한 대리', message: '반갑습니다. 지원자님의 이력서를 흥미롭게 읽었습니다.\n\n[질문 1] 이력서에 작성하신 캐싱 전략에서 정합성 문제는 어떻게 해결하셨나요?' },
    { speaker: 'applicant', name: '지원자', message: 'TTL을 짧게 가져가서 일시적인 불일치를 허용했습니다.' },
    { speaker: 'interviewer', name: '널널한 대리', message: '[질문 2] 데이터베이스 락(Lock)을 사용하지 않은 특별한 이유가 있나요?' },
    { speaker: 'applicant', name: '지원자', message: '읽기 작업이 90% 이상이라 락 오버헤드를 피하고 싶었습니다.' },
    { speaker: 'interviewer', name: '널널한 대리', message: '[질문 3] 트래픽이 갑자기 10배 증가한다면 현재 아키텍처에서 가장 먼저 병목이 발생할 곳은 어디인가요?' },
    { speaker: 'applicant', name: '지원자', message: 'DB 커넥션 풀 부족으로 인한 DB 병목이 예상됩니다.' },
    { speaker: 'interviewer', name: '널널한 대리', message: '첫 번째 답변(Q1)에 대한 설명이 가장 부족합니다. 구체적인 해결 방안이 없네요.\n\n[추가 질문] 캐싱 정합성 문제에 대해 구체적인 해결 경험이 없으신가요? 예를 들어, Write-Through나 Cache Aside 패턴을 고려해보셨나요?' },
    { speaker: 'applicant', name: '지원자', message: 'Cache Aside 패턴을 적용해 본 적이 있습니다. 데이터 변경 시 캐시 지우는 방식으로 정합성을 보장했습니다.' },
    { speaker: 'interviewer', name: '널널한 대리', message: '꼬리질문 방어에 성공했습니다. 트레이드오프를 잘 이해하고 있군요.' },
  ],
};

function wrapTextLines(text, maxChars) {
  const lines = [];
  String(text).split('\n').forEach((para) => {
    if (para === '') {
      lines.push('');
      return;
    }
    let s = para;
    while (s.length > maxChars) {
      lines.push(s.slice(0, maxChars).trimEnd());
      s = s.slice(maxChars).trimStart();
    }
    if (s.length) lines.push(s);
  });
  return lines.length ? lines : [''];
}

function historyTabContent(cX, cW, cx, top, opts) {
  // Matches MyPage HISTORY tab + MOCK_HISTORY grouping
  const highlightId = (opts && opts.highlightId) || null;
  const out = [];
  let y = top + 32;
  out.push(txt(cX + 32, y, '나의 면접 전적', 20, C.ink, 700));
  y += 28;

  const groups = [
    {
      name: '널널한 대리', icon: '😎',
      items: [{ id: '1', date: '26.07.09', tag: 'React', score: 90, passed: true }],
    },
    {
      name: '깐깐한 과장', icon: '🧐',
      items: [
        { id: '2', date: '26.07.08', tag: 'MSA', score: 55, passed: false },
        { id: '3', date: '26.07.05', tag: 'Redis', score: 65, passed: false },
      ],
    },
  ];

  groups.forEach((g) => {
    // header p-5 (20) + body p-5 + items (72+gap12)
    const bodyPad = 20;
    const itemH = 72, itemGap = 12;
    const headerH = 64;
    const bodyH = bodyPad * 2 + g.items.length * itemH + (g.items.length - 1) * itemGap;
    const groupH = headerH + bodyH;
    out.push(rect(cX + 32, y, cW - 64, groupH, 16, C.white, C.border));
    out.push(rect(cX + 32, y, cW - 64, headerH, 16, C.pageBg));
    out.push(rect(cX + 32, y + headerH - 8, cW - 64, 8, 0, C.pageBg)); // keep header fill under radius
    out.push(line(cX + 32, y + headerH, cX + cW - 32, y + headerH, C.border, 1));
    out.push(circle(cX + 64, y + headerH / 2, 16, C.chip, C.border));
    out.push(emoji(cX + 64, y + headerH / 2 + 5, g.icon, 14));
    out.push(txt(cX + 92, y + headerH / 2 + 5, g.name, 16, C.ink, 700));
    const nameW = g.name.length * 15;
    out.push(txt(cX + 92 + nameW + 8, y + headerH / 2 + 5, '(' + g.items.length + ')', 13, C.muted, 400));
    out.push(chevronUp(cX + cW - 64, y + headerH / 2));

    g.items.forEach((it, i) => {
      const iy = y + headerH + bodyPad + i * (itemH + itemGap);
      const selected = highlightId && it.id === highlightId;
      out.push(rect(cX + 52, iy, cW - 104, itemH, 12, selected ? C.chip : C.white, C.border));
      out.push(txt(cX + 68, iy + 24, '[' + it.date + ']', 13, C.muted, 400));
      const tagW = it.tag.length * 8 + 16;
      out.push(rect(cX + 68, iy + 36, tagW, 22, 6, C.chip, C.border));
      out.push(txt(cX + 68 + tagW / 2, iy + 51, it.tag, 11, C.body, 700, 'middle'));
      out.push(txt(cX + 68 + tagW + 12, iy + 51, '중점 면접', 15, C.ink, 700));
      // right meta: score + pass chip + chevron
      out.push(txt(cX + cW - 196, iy + 42, it.score + ' 점', 14, C.body, 700, 'end'));
      out.push(rect(cX + cW - 180, iy + 28, 56, 24, 6, C.chip));
      out.push(txt(cX + cW - 152, iy + 44, it.passed ? '합격' : '불합격', 11, C.ink, 700, 'middle'));
      out.push(chevronRight(cX + cW - 96, iy + 36, C.faint));
    });
    y += groupH + 16;
  });

  const height = y - top + 24;
  return { body: out.join('\n'), height };
}

function myPageHistory() {
  return myPageShell('HISTORY', (cX, cW, cx, top) => historyTabContent(cX, cW, cx, top));
}

function myPageHistoryDrawer() {
  // HISTORY page + dim overlay + HistoryDrawer (HistoryDrawer.tsx 1:1)
  const cx = W / 2;
  const cW = 896, cX = cx - cW / 2;
  const contentTop = 290;
  const hist = historyTabContent(cX, cW, cx, contentTop, { highlightId: '1' });
  const pageH = Math.max(contentTop + hist.height + 60, 1100);

  // Drawer: fixed right, w-full max-w-md (448), h-full, flex-col
  const dW = 448, dX = W - dW;
  const item = HISTORY_DRAWER_ITEM;

  // Measure chat + feedback first so dim/canvas height matches full drawer scroll
  const pad = 24; // p-6
  const contentW = dW - pad * 2;
  const bubbleMax = Math.floor(contentW * 0.85); // max-w-[85%]
  const textPad = 16; // p-4
  const lineH = 22; // leading-[22px]
  const maxChars = 22; // ~14px Korean in ~bubbleMax-32

  const prepared = item.logs.map((log) => {
    const isInterviewer = log.speaker === 'interviewer';
    const lines = wrapTextLines(log.message, maxChars);
    const longest = Math.max(...lines.map((l) => (l || ' ').length), 4);
    const bubbleW = Math.min(bubbleMax, Math.max(120, longest * 13 + textPad * 2));
    const bubbleH = textPad * 2 + Math.max(lines.length, 1) * lineH;
    return { ...log, isInterviewer, lines, bubbleW, bubbleH };
  });

  const fbLines = wrapTextLines(item.feedback, 28);
  const fbH = 20 + 14 + 8 + fbLines.length * 22 + 20; // p-5 + title + mb-2 + body
  // space-y-6 (=24) between log blocks; name 12px + mb-1(4) + bubble
  let chatH = pad;
  prepared.forEach((log) => {
    chatH += 12 + 4 + log.bubbleH + 24;
  });
  chatH += 32 + fbH + pad; // mt-8 feedback + bottom pad

  const headerH = 104; // p-6 + title 28 + mt-1 + subtitle 20 + p-6
  const H = Math.max(pageH, headerH + chatH);

  const p = [header()];
  p.push(arrowLeft(cX + 8, 138, C.body));
  p.push(txt(cX + 24, 143, '면접 던전으로 돌아가기', 14, C.body, 700));
  p.push(txt(cX, 188, '마이페이지', 32, C.ink, 700));
  p.push(txt(cX, 216, '내 프로필, 파일 관리 및 전적을 확인하세요.', 14, C.muted, 400));

  const tabs = [
    { id: 'PROFILE', label: '[01_PROFILE]' },
    { id: 'HISTORY', label: '[02_HISTORY]' },
    { id: 'CONFIG', label: '[03_CONFIG]' },
  ];
  let tx = cX;
  tabs.forEach((t) => {
    const tw = 150;
    const isActive = t.id === 'HISTORY';
    p.push(rect(tx, 250, tw, isActive ? 44 : 40, 12, isActive ? C.white : C.chip, C.border));
    p.push(txt(tx + tw / 2, isActive ? 278 : 276, t.label, 12, isActive ? C.ink : C.body, 700, 'middle'));
    tx += tw + 4;
  });

  p.push(rect(cX, contentTop, cW, hist.height, 20, C.white, C.border));
  p.push(rect(cX, contentTop, 40, 12, 0, C.white));
  p.push(hist.body);

  // Dimmed background: fixed inset-0 bg-black/50 (full canvas)
  p.push(rect(0, 0, W, H, 0, 'rgba(0,0,0,0.5)'));

  // drawer panel
  p.push(rect(dX, 0, dW, H, 0, C.white));

  // header: p-6 border-b, title + subtitle, X button (w-6 h-6, no filled chip)
  p.push(rect(dX, 0, dW, headerH, 0, C.white));
  p.push(line(dX, headerH, W, headerH, C.border, 1));
  p.push(txt(dX + pad, 24 + 20, '면접 상세 기록', 20, C.ink, 700));
  p.push(txt(dX + pad, 24 + 28 + 4 + 14, item.date + ' • ' + item.interviewerName, 14, C.muted, 400));
  // close button: p-2 rounded-full — Lucide X w-6 h-6
  const xCx = W - pad - 12, xCy = headerH / 2;
  p.push(`<path d="M${xCx - 8} ${xCy - 8} L${xCx + 8} ${xCy + 8} M${xCx + 8} ${xCy - 8} L${xCx - 8} ${xCy + 8}" fill="none" stroke="${C.muted}" stroke-width="2" stroke-linecap="round"/>`);

  // scroll body: flex-1 p-6 space-y-6 bg-blue-grey-10
  p.push(rect(dX, headerH, dW, H - headerH, 0, C.pageBg));

  let cy = headerH + pad;
  prepared.forEach((log) => {
    const bx = log.isInterviewer ? dX + pad : W - pad - log.bubbleW;
    // name: text-[12px] font-bold text-blue-grey-500 mb-1 px-1
    p.push(txt(
      log.isInterviewer ? bx + 4 : bx + log.bubbleW - 4,
      cy + 10,
      log.name,
      12,
      C.muted,
      700,
      log.isInterviewer ? 'start' : 'end'
    ));
    cy += 12 + 4;

    // bubble: rounded-2xl; interviewer rounded-tl-none + white/border; applicant rounded-tr-none + primary
    p.push(rect(bx, cy, log.bubbleW, log.bubbleH, 16, log.isInterviewer ? C.white : C.primary, log.isInterviewer ? C.border : null));
    if (log.isInterviewer) {
      p.push(rect(bx, cy, 16, 16, 0, C.white)); // square off top-left
      p.push(line(bx, cy, bx, cy + 16, C.border, 1));
      p.push(line(bx, cy, bx + 16, cy, C.border, 1));
    } else {
      p.push(rect(bx + log.bubbleW - 16, cy, 16, 16, 0, C.primary)); // square off top-right
    }

    log.lines.forEach((line, i) => {
      p.push(txt(
        bx + textPad,
        cy + textPad + 14 + i * lineH,
        line || ' ',
        14,
        log.isInterviewer ? C.ink : C.primaryTx,
        400
      ));
    });
    cy += log.bubbleH + 24; // space-y-6
  });

  // 최종 종합 피드백: mt-8 bg-blue-50 border-blue-200 rounded-2xl p-5 (grayscale soft panel)
  cy += 8; // extra toward mt-8 (already have trailing 24 from last gap)
  const fbY = cy;
  const fbBg = '#e4e8ed';
  const fbBd = '#b7c0cc';
  const fbTitle = '#3a4553';
  const fbBody = '#2f3a48';
  p.push(rect(dX + pad, fbY, contentW, fbH, 16, fbBg, fbBd));
  p.push(txt(dX + pad + 20, fbY + 20 + 12, '✨ 최종 종합 피드백', 14, fbTitle, 700));
  fbLines.forEach((line, i) => {
    p.push(txt(dX + pad + 20, fbY + 20 + 14 + 8 + 16 + i * 22, line, 13, fbBody, 400));
  });

  return svgDoc(W, H, p.join('\n'));
}

function myPageConfig() {
  return myPageShell('CONFIG', (cX, cW, cx, top) => {
    const out = [];
    let y = top + 32;
    out.push(txt(cX + 32, y, '개인정보 취급 및 보안 방침', 20, C.ink, 700));
    y += 20;
    const pcH = 300;
    out.push(rect(cX + 32, y, cW - 64, pcH, 20, C.white, C.border));
    out.push(shieldIcon(cX + 60, y + 32, C.body));
    out.push(txt(cX + 84, y + 38, '당신의 데이터는 안전하게 보호됩니다', 16, C.ink, 700));
    const items = [
      ['원본 파일 즉시 파기', '업로드된 파일은 파싱 후 즉시 영구적으로 삭제됩니다.'],
      ['추출 텍스트 암호화 및 캐싱', '추출된 데이터는 암호화되어 캐싱되며 목적 외 이용은 차단됩니다.'],
      ['민감정보 마스킹 처리', 'AI 전송 전 모든 개인 식별·민감정보는 마스킹 처리됩니다.'],
    ];
    items.forEach((it, i) => {
      const iy = y + 66 + i * 72;
      out.push(rect(cX + 48, iy, cW - 96, 64, 16, C.pageBg, C.border));
      out.push(rect(cX + 64, iy + 16, 32, 32, 8, C.chip));
      out.push(txt(cX + 80, iy + 37, String(i + 1), 15, C.ink, 700, 'middle'));
      out.push(txt(cX + 112, iy + 28, it[0], 14, C.ink, 700));
      out.push(txt(cX + 112, iy + 50, it[1], 13, C.body, 400));
    });

    y += pcH + 40;
    out.push(txt(cX + 32, y, '계정 관리', 20, C.ink, 700));
    y += 20;
    out.push(rect(cX + 32, y, cW - 64, 90, 20, C.white, C.border));
    const half = (cW - 64 - 48 - 16) / 2;
    out.push(rect(cX + 56, y + 20, half, 50, 16, C.chip, C.border));
    out.push(txt(cX + 56 + half / 2, y + 51, '로그아웃', 14, C.body, 700, 'middle'));
    out.push(rect(cX + 56 + half + 16, y + 20, half, 50, 16, C.white, C.border));
    out.push(txt(cX + 56 + half + 16 + half / 2, y + 51, '회원 탈퇴', 14, C.body, 700, 'middle'));

    const height = y + 110 - top;
    return { body: out.join('\n'), height };
  });
}

/* ------------------------------------------------------------------ */
const files = [
  ['01-login.svg', loginPage(), '1. 로그인 (/)'],
  ['02-resume-upload.svg', resumeUploadPage(), '2. 이력서 업로드 (/upload)'],
  ['03-dungeon.svg', dungeonPage(), '3. 면접관 던전 (/dungeon)'],
  ['04-interview-process.svg', interviewPage(), '4. 면접 진행 (/interview/:id)'],
  ['04b-interview-abandon-modal.svg', interviewAbandonModal(), '4-b. 면접 포기 확인 모달'],
  ['05-result.svg', resultPage(), '5. 결과 보고서 (/result/:id)'],
  ['05b-result-badge-modal.svg', resultModalPage(), '5-b. 결과 보고서 - 뱃지 획득 모달'],
  ['06-mypage-profile.svg', myPageProfile(), '6. 마이페이지 - PROFILE'],
  ['06b-mypage-history.svg', myPageHistory(), '6-b. 마이페이지 - HISTORY'],
  ['06c-mypage-history-drawer.svg', myPageHistoryDrawer(), '6-c. 마이페이지 - HISTORY 상세 로그 드로어'],
  ['06d-mypage-config.svg', myPageConfig(), '6-d. 마이페이지 - CONFIG'],
];

files.forEach(([name, content]) => {
  fs.writeFileSync(path.join(OUT, name), content, 'utf8');
});

// Keep legacy filename pointing to PROFILE tab for convenience
fs.writeFileSync(path.join(OUT, '06-mypage.svg'), files.find(f => f[0] === '06-mypage-profile.svg')[1], 'utf8');

const gallery = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>커리어 던전 · 그레이스케일 와이어프레임</title>
<style>
  body { background:#f4f5f7; margin:0; padding:40px; font-family:${FONT}; color:#2f333a; }
  h1 { font-size:26px; margin:0 0 6px; }
  .sub { color:#6c7278; margin:0 0 32px; font-size:14px; }
  .frame { background:#fff; border:1px solid #e2e5e9; border-radius:14px; padding:20px 20px 8px;
           margin-bottom:32px; box-shadow:0 6px 20px rgba(0,0,0,.05); }
  .frame h2 { font-size:16px; margin:0 0 14px; }
  .frame img { width:100%; height:auto; display:block; border-radius:8px; border:1px solid #eceef1; }
</style>
</head>
<body>
  <h1>커리어 던전 — 그레이스케일 와이어프레임</h1>
  <p class="sub">현재 구현 페이지와 1:1 매칭 (화면 흐름도 제외 · 데스크톱 1440px)</p>
  ${files.map(([name, , title]) => `<div class="frame">
    <h2>${title}</h2>
    <img src="./${name}" alt="${title}"/>
  </div>`).join('\n  ')}
</body>
</html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), gallery, 'utf8');

console.log('Generated ' + files.length + ' page wireframes (+ 06-mypage.svg alias) in ' + OUT);
