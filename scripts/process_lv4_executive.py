"""Lv.4 에셋 재생성: 추가 누끼 없이 원본 알파 유지 + 560x640 정규화."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageEnhance

ASSETS = Path(r"C:\Users\dkwlr\.cursor\projects\c-Users-dkwlr-IdeaProjects-CareerDungeon\assets")
OUT = Path(r"c:\Users\dkwlr\IdeaProjects\CareerDungeon\INT2_Team3_Vibe_FE\public\interviewers")
POSE = OUT / "poses"
BG = OUT / "backgrounds"

SRC = {
    "main": ASSETS / "c__Users_dkwlr_AppData_Roaming_Cursor_User_workspaceStorage_d979ec530feb21639ab0a730a7f80630_images_________-6a7f153f-2217-4fb9-b73a-b305da65f5d5.png",
    "pose2": ASSETS / "c__Users_dkwlr_AppData_Roaming_Cursor_User_workspaceStorage_d979ec530feb21639ab0a730a7f80630_images_________2-fde71659-e208-46ea-b816-d4bb4622d935.png",
    "pose3": ASSETS / "c__Users_dkwlr_AppData_Roaming_Cursor_User_workspaceStorage_d979ec530feb21639ab0a730a7f80630_images_________3-2974f510-8781-4ce4-a536-fd6fa44751ea.png",
    "bad1": ASSETS / "c__Users_dkwlr_AppData_Roaming_Cursor_User_workspaceStorage_d979ec530feb21639ab0a730a7f80630_images__________bad1-3c1dba3e-2973-46d0-83e3-796928812774.png",
    "bad2": ASSETS / "c__Users_dkwlr_AppData_Roaming_Cursor_User_workspaceStorage_d979ec530feb21639ab0a730a7f80630_images__________bad2-42d3939e-21b6-4efd-8568-288026a25126.png",
    "bg": ASSETS / "c__Users_dkwlr_AppData_Roaming_Cursor_User_workspaceStorage_d979ec530feb21639ab0a730a7f80630_images__________-16e84837-4e7f-41e0-9d84-6d04e1ac289c.png",
}

CANVAS_W, CANVAS_H = 560, 640
TARGET_BODY_H = 580
PAD_BOTTOM = 12


def autocrop(im: Image.Image, pad: int = 4) -> Image.Image:
    bbox = im.split()[-1].getbbox() if im.mode == "RGBA" else im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def place_on_canvas(im: Image.Image) -> Image.Image:
    """Lv1/2와 동일: 본체 높이 TARGET_BODY_H, 하단 PAD_BOTTOM, 가로 중앙."""
    im = autocrop(im.convert("RGBA"), pad=2)
    alpha = im.split()[-1]
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    l, t, r, b = bbox
    crop = im.crop((l, t, r, b))
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
    l, t, r, b = bbox
    h = b - t
    # 상단 ~55% (얼굴·배지·상반신 제스처)
    nb = t + max(1, int(h * 0.55))
    bust = autocrop(full_canvas.crop((l, t, r, nb)), pad=8)
    # 메인 카드용으로 넉넉히
    max_side = 720
    w, h = bust.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1:
        bust = bust.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return bust


def export_sprite(src: Path, dest: Path) -> Image.Image:
    raw = Image.open(src).convert("RGBA")
    # 추가 누끼 금지 — 원본 알파/아웃라인 유지
    canvas = place_on_canvas(raw)
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dest, "PNG", optimize=True)
    print(f"OK {dest.name} {canvas.size}", flush=True)
    return canvas


def save_bg(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGB")
    im = ImageEnhance.Brightness(im).enhance(1.08)
    im = ImageEnhance.Contrast(im).enhance(1.03)
    w, h = im.size
    scale = min(1.0, 1920 / max(w, h))
    if scale < 1:
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG", optimize=True)
    print(f"OK bg {dest.name} {im.size}", flush=True)


def main() -> None:
    main_canvas = export_sprite(SRC["main"], OUT / "lv4-executive.png")
    bust = make_bust(main_canvas)
    bust_path = OUT / "lv4-executive-bust.png"
    bust.save(bust_path, "PNG", optimize=True)
    print(f"OK {bust_path.name} {bust.size}", flush=True)

    export_sprite(SRC["pose2"], POSE / "lv4-executive-pose-02.png")
    export_sprite(SRC["pose3"], POSE / "lv4-executive-pose-03.png")
    export_sprite(SRC["bad1"], POSE / "lv4-executive-pose-bad1.png")
    export_sprite(SRC["bad2"], POSE / "lv4-executive-pose-bad2.png")
    export_sprite(SRC["main"], POSE / "lv4-executive-pose-good-01.png")
    export_sprite(SRC["pose2"], POSE / "lv4-executive-pose-good-02.png")
    export_sprite(SRC["pose3"], POSE / "lv4-executive-pose-good-03.png")
    save_bg(SRC["bg"], BG / "lv4-grepp-hq.png")
    print("done", flush=True)


if __name__ == "__main__":
    main()
