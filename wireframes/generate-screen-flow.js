/**
 * Figma-compatible Screen Flow SVG generator.
 * Avoids: unescaped < in text, negative coordinates, style attributes,
 * marker refs that Figma sometimes drops.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '00-screen-flow.svg');

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const FONT = "Malgun Gothic, Apple SD Gothic Neo, sans-serif";

function arrowHead(x, y, rot) {
  // triangle pointing right at 0deg; rot in degrees
  return `<g transform="translate(${x},${y}) rotate(${rot})">
    <polygon points="0,-5 10,0 0,5" fill="#98A8B9"/>
  </g>`;
}

function labelPill(cx, cy, text, w) {
  const h = 28;
  return `
    <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="14" fill="#F4F4F8" stroke="#CDD7E0" stroke-width="1"/>
    <text x="${cx}" y="${cy + 5}" font-family="${FONT}" font-size="13" font-weight="700" fill="#0078FF" text-anchor="middle">${esc(text)}</text>`;
}

function screenBox(x, y, w, h, title, sub, fill, stroke) {
  const lines = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`,
  ];
  if (sub) {
    lines.push(
      `<text x="${x + w / 2}" y="${y + 34}" font-family="${FONT}" font-size="18" font-weight="700" fill="#202B3D" text-anchor="middle">${esc(title)}</text>`
    );
    lines.push(
      `<text x="${x + w / 2}" y="${y + 58}" font-family="${FONT}" font-size="13" fill="#7890A0" text-anchor="middle">${esc(sub)}</text>`
    );
  } else {
    lines.push(
      `<text x="${x + w / 2}" y="${y + 46}" font-family="${FONT}" font-size="18" font-weight="700" fill="#202B3D" text-anchor="middle">${esc(title)}</text>`
    );
  }
  return lines.join('\n');
}

function diamond(cx, cy, hw, hh, title, fill, stroke) {
  // diamond: top, right, bottom, left
  const pts = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
  return `
    <polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <text x="${cx}" y="${cy - 6}" font-family="${FONT}" font-size="15" font-weight="700" fill="${stroke}" text-anchor="middle">${esc(title)}</text>
    <text x="${cx}" y="${cy + 16}" font-family="${FONT}" font-size="12" fill="${stroke}" text-anchor="middle">${esc('(분기점)')}</text>`;
}

const W = 1200;
const H = 1180;
const BW = 280;
const BH = 80;

// Column centers
const L = 360; // left column center
const R = 860; // right column center

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#FBFBFD"/>
  <text x="${W / 2}" y="52" font-family="${FONT}" font-size="28" font-weight="700" fill="#202B3D" text-anchor="middle">커리어 던전 — 화면 흐름도 (Screen Flow)</text>
  <text x="${W / 2}" y="78" font-family="${FONT}" font-size="13" fill="#7890A0" text-anchor="middle">화면(Screen) 단위 이동 · 사용자 흐름도(User Flow)와 별도</text>

  <!-- Legend -->
  <rect x="40" y="40" width="200" height="92" rx="10" fill="#FFFFFF" stroke="#CDD7E0" stroke-width="1"/>
  <rect x="56" y="56" width="28" height="18" rx="4" fill="#FFFFFF" stroke="#CDD7E0" stroke-width="2"/>
  <text x="94" y="70" font-family="${FONT}" font-size="12" fill="#202B3D">화면 (Screen)</text>
  <rect x="56" y="82" width="28" height="18" rx="4" fill="#E6F2FF" stroke="#0078FF" stroke-width="2"/>
  <text x="94" y="96" font-family="${FONT}" font-size="12" fill="#202B3D">허브 화면</text>
  <polygon points="70,118 84,126 70,134 56,126" fill="#F0E6FF" stroke="#673AB7" stroke-width="1.5"/>
  <text x="94" y="130" font-family="${FONT}" font-size="12" fill="#202B3D">조건 분기</text>

  <!-- [1] Login -->
  ${screenBox(L - BW / 2, 110, BW, BH, '[1] 랜딩 / 로그인 화면', null, '#FFFFFF', '#CDD7E0')}

  <!-- arrow 1 -> 2 -->
  <path d="M ${L} 190 L ${L} 248" fill="none" stroke="#98A8B9" stroke-width="2"/>
  ${arrowHead(L, 248, 90)}
  ${labelPill(L, 220, "'Google 계정으로 시작하기' 클릭", 280)}

  <!-- [2] Main lobby -->
  ${screenBox(L - BW / 2, 260, BW, BH, '[2] 메인 로비 (/dungeon)', '(이력서 미등록 / 등록완료)', '#E6F2FF', '#0078FF')}

  <!-- [3] MyPage -->
  ${screenBox(R - BW / 2, 260, BW, BH, '[3] 마이페이지 (/mypage)', '(이력서 업로드 · 뱃지)', '#FFFFFF', '#CDD7E0')}

  <!-- 2 -> 3 -->
  <path d="M ${L + BW / 2} 290 L ${R - BW / 2 - 10} 290" fill="none" stroke="#98A8B9" stroke-width="2"/>
  ${arrowHead(R - BW / 2 - 10, 290, 0)}
  ${labelPill((L + R) / 2, 276, "'이력서 업로드하러 가기' 클릭", 240)}

  <!-- 3 -> 2 return -->
  <path d="M ${R - BW / 2} 330 L ${L + BW / 2 + 10} 330" fill="none" stroke="#98A8B9" stroke-width="2"/>
  ${arrowHead(L + BW / 2 + 10, 330, 180)}
  ${labelPill((L + R) / 2, 348, "'면접 던전으로 돌아가기' 클릭", 250)}

  <!-- 2 -> 4 -->
  <path d="M ${L} 340 L ${L} 408" fill="none" stroke="#98A8B9" stroke-width="2"/>
  ${arrowHead(L, 408, 90)}
  ${labelPill(L, 380, "키워드 선택 후 '면접 시작하기' 클릭", 290)}

  <!-- [4] Interview -->
  ${screenBox(L - BW / 2, 420, BW, BH, '[4] AI 면접 진행 화면', '(질문 3 + 꼬리질문 1)', '#FFFFFF', '#CDD7E0')}

  <!-- 4 -> 5 -->
  <path d="M ${L} 500 L ${L} 568" fill="none" stroke="#98A8B9" stroke-width="2"/>
  ${arrowHead(L, 568, 90)}
  ${labelPill(L, 540, '모든 답변 완료', 140)}

  <!-- [5] Decision -->
  ${diamond(L, 640, 150, 70, '[5] 신뢰도 80% 달성?', '#F0E6FF', '#673AB7')}

  <!-- [6] Badge modal -->
  ${screenBox(R - BW / 2, 600, BW, BH, '[6] 뱃지 획득 축하 모달', '(80% 이상 시 팝업)', '#FFF8E6', '#E6A800')}

  <!-- Yes: 5 -> 6 -->
  <path d="M ${L + 150} 640 L ${R - BW / 2 - 10} 640" fill="none" stroke="#98A8B9" stroke-width="2"/>
  ${arrowHead(R - BW / 2 - 10, 640, 0)}
  ${labelPill((L + 150 + R - BW / 2) / 2, 624, 'Yes / 80% 이상', 150)}

  <!-- [7] Feedback -->
  ${screenBox(L - BW / 2, 800, BW, BH, '[7] 종합 면접 피드백 화면', '(결과 보고서 /result)', '#FFFFFF', '#CDD7E0')}

  <!-- No: 5 -> 7 -->
  <path d="M ${L} 710 L ${L} 792" fill="none" stroke="#98A8B9" stroke-width="2"/>
  ${arrowHead(L, 792, 90)}
  ${labelPill(L, 756, 'No / 80% 미만 (모달 없음)', 230)}

  <!-- 6 -> 7 -->
  <path d="M ${R} 680 L ${R} 840 L ${L + BW / 2 + 10} 840" fill="none" stroke="#98A8B9" stroke-width="2"/>
  ${arrowHead(L + BW / 2 + 10, 840, 180)}
  ${labelPill(R, 760, "'피드백 확인하기' 클릭", 190)}

  <!-- 7 -> 2 return (left side, all positive coords) -->
  <path d="M ${L - BW / 2} 840 L 120 840 L 120 300 L ${L - BW / 2 - 10} 300" fill="none" stroke="#98A8B9" stroke-width="2"/>
  ${arrowHead(L - BW / 2 - 10, 300, 0)}
  ${labelPill(120, 570, "'던전 맵으로 돌아가기' 클릭", 200)}

  <!-- Footer note -->
  <text x="${W / 2}" y="1140" font-family="${FONT}" font-size="12" fill="#9AA0A8" text-anchor="middle">피그마: File → Place image / 또는 SVG 파일을 캔버스로 드래그 · 복붙(Ctrl+V)은 지원되지 않을 수 있음</text>
</svg>
`;

fs.writeFileSync(OUT, svg, 'utf8');
console.log('Wrote', OUT);

// Also overwrite detailed_flowchart with same content (UTF-8 text, not binary)
fs.writeFileSync(path.join(__dirname, 'detailed_flowchart.svg'), svg, 'utf8');
console.log('Updated detailed_flowchart.svg');
