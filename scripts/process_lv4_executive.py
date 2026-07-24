"""Lv.4 에셋 재생성: 추가 누끼 없이 원본 알파 유지 + 560x640 정규화.

경로 기본값:
  --assets-dir  저장소 밖 원본 소스 디렉터리 (또는 LV4_ASSETS_DIR)
  --out-dir     public/interviewers (또는 LV4_OUT_DIR)

예시:
  py -3 scripts/process_lv4_executive.py --assets-dir ./tmp/lv4-src
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

from PIL import Image, ImageEnhance

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = REPO_ROOT / "public" / "interviewers"

# 원본 파일명 키 → 디스크에서 찾을 glob/이름 힌트
SRC_KEYS = ("main", "pose2", "pose3", "bad1", "bad2", "bg")

CANVAS_W, CANVAS_H = 560, 640
TARGET_BODY_H = 580
PAD_BOTTOM = 12


def resolve_src_map(assets_dir: Path) -> dict[str, Path]:
    """assets_dir 안의 파일을 키워드로 매핑한다. 명시적 파일명이 있으면 우선."""
    named = {
        "main": assets_dir / "lv4-main.png",
        "pose2": assets_dir / "lv4-pose-02.png",
        "pose3": assets_dir / "lv4-pose-03.png",
        "bad1": assets_dir / "lv4-bad1.png",
        "bad2": assets_dir / "lv4-bad2.png",
        "bg": assets_dir / "lv4-bg.png",
    }
    if all(path.exists() for path in named.values()):
        return named

    # Cursor 업로드 해시 파일명 등 — 파일명 부분 문자열로 느슨하게 매칭
    hints = {
        "main": ["_________-6a7f153f", "lv4-main", "main"],
        "pose2": ["_________2-fde716", "pose-02", "pose2"],
        "pose3": ["_________3-2974f5", "pose-03", "pose3"],
        "bad1": ["bad1"],
        "bad2": ["bad2"],
        "bg": ["16e84837", "lv4-bg", "grepp-hq", "background"],
    }
    files = list(assets_dir.glob("*.png"))
    resolved: dict[str, Path] = {}
    for key, tokens in hints.items():
        match = next((f for f in files if any(token in f.name for token in tokens)), None)
        if match is None:
            raise FileNotFoundError(
                f"assets-dir에서 '{key}' 소스를 찾지 못했습니다. "
                f"named 파일(lv4-*.png)을 두거나 --assets-dir를 확인하세요: {assets_dir}"
            )
        resolved[key] = match
    return resolved


def autocrop(im: Image.Image, pad: int = 4) -> Image.Image:
    bbox = im.split()[-1].getbbox() if im.mode == "RGBA" else im.getbbox()
    if not bbox:
        return im
    left, top, right, bottom = bbox
    return im.crop(
        (
            max(0, left - pad),
            max(0, top - pad),
            min(im.width, right + pad),
            min(im.height, bottom + pad),
        )
    )


def place_on_canvas(im: Image.Image) -> Image.Image:
    """Lv1/2와 동일: 본체 높이 TARGET_BODY_H, 하단 PAD_BOTTOM, 가로 중앙."""
    im = autocrop(im.convert("RGBA"), pad=2)
    alpha = im.split()[-1]
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    left, top, right, bottom = bbox
    crop = im.crop((left, top, right, bottom))
    body_h = crop.height
    scale = TARGET_BODY_H / max(1, body_h)
    new_w = max(1, int(round(crop.width * scale)))
    new_h = max(1, int(round(crop.height * scale)))
    resized = crop.resize((new_w, new_h), Image.Resampling.LANCZOS)

    x = int(round(CANVAS_W / 2 - resized.width / 2))
    y = CANVAS_H - PAD_BOTTOM - resized.height
    if x < 0:
        resized = resized.crop((-x, 0, resized.width, resized.height))
        x = 0
    if x + resized.width > CANVAS_W:
        resized = resized.crop((0, 0, CANVAS_W - x, resized.height))
    if y < 0:
        resized = resized.crop((0, -y, resized.width, resized.height))
        y = 0

    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    canvas.alpha_composite(resized, (x, y))
    return canvas


def make_bust(full_canvas: Image.Image) -> Image.Image:
    """정규화된 전신에서 상반신만 — 다른 레벨 bust처럼 머리~가슴 중심."""
    alpha = full_canvas.split()[-1]
    bbox = alpha.getbbox()
    if not bbox:
        return full_canvas
    left, top, right, bottom = bbox
    height = bottom - top
    nb = top + max(1, int(height * 0.55))
    bust = autocrop(full_canvas.crop((left, top, right, nb)), pad=8)
    max_side = 720
    width, height = bust.size
    scale = min(1.0, max_side / max(width, height))
    if scale < 1:
        bust = bust.resize((int(width * scale), int(height * scale)), Image.Resampling.LANCZOS)
    return bust


def export_sprite(src: Path, dest: Path) -> Image.Image:
    raw = Image.open(src).convert("RGBA")
    canvas = place_on_canvas(raw)
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, "PNG", optimize=True)
    print(f"OK {dest.name} {canvas.size}", flush=True)
    return canvas


def save_bg(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGB")
    im = ImageEnhance.Brightness(im).enhance(1.08)
    im = ImageEnhance.Contrast(im).enhance(1.03)
    width, height = im.size
    scale = min(1.0, 1920 / max(width, height))
    if scale < 1:
        im = im.resize((int(width * scale), int(height * scale)), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG", optimize=True)
    print(f"OK bg {dest.name} {im.size}", flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Process Lv.4 executive interviewer assets")
    parser.add_argument(
        "--assets-dir",
        type=Path,
        default=Path(os.environ.get("LV4_ASSETS_DIR", "")),
        help="원본 PNG 디렉터리 (env: LV4_ASSETS_DIR)",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path(os.environ.get("LV4_OUT_DIR", str(DEFAULT_OUT))),
        help="출력 디렉터리 (env: LV4_OUT_DIR, default: public/interviewers)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.assets_dir or str(args.assets_dir) in ("", "."):
        raise SystemExit(
            "원본 디렉터리가 필요합니다. --assets-dir 또는 LV4_ASSETS_DIR 을 지정하세요."
        )
    assets_dir = args.assets_dir.resolve()
    out_dir = args.out_dir.resolve()
    pose_dir = out_dir / "poses"
    bg_dir = out_dir / "backgrounds"

    src = resolve_src_map(assets_dir)
    for key in SRC_KEYS:
        print(f"src {key}: {src[key].name}", flush=True)

    main_canvas = export_sprite(src["main"], out_dir / "lv4-executive.png")
    bust = make_bust(main_canvas)
    bust_path = out_dir / "lv4-executive-bust.png"
    bust.save(bust_path, "PNG", optimize=True)
    print(f"OK {bust_path.name} {bust.size}", flush=True)

    export_sprite(src["pose2"], pose_dir / "lv4-executive-pose-02.png")
    export_sprite(src["pose3"], pose_dir / "lv4-executive-pose-03.png")
    export_sprite(src["bad1"], pose_dir / "lv4-executive-pose-bad1.png")
    export_sprite(src["bad2"], pose_dir / "lv4-executive-pose-bad2.png")
    export_sprite(src["main"], pose_dir / "lv4-executive-pose-good-01.png")
    export_sprite(src["pose2"], pose_dir / "lv4-executive-pose-good-02.png")
    export_sprite(src["pose3"], pose_dir / "lv4-executive-pose-good-03.png")
    save_bg(src["bg"], bg_dir / "lv4-grepp-hq.png")
    print("done", flush=True)


if __name__ == "__main__":
    main()
