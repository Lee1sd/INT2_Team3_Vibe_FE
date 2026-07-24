"""Lv.4 임원 에셋: 검정 배경 제거 + 상반신 bust + 포즈/배경 저장 (PIL only)."""
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


def downscale(im: Image.Image, max_side: int) -> Image.Image:
    w, h = im.size
    scale = min(1.0, max_side / max(w, h))
    if scale >= 1.0:
        return im
    return im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)


def remove_black_bg(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r <= 28 and g <= 28 and b <= 28:
                pixels[x, y] = (r, g, b, 0)
    return rgba


def autocrop(im: Image.Image, pad: int = 8) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def bust_crop(im: Image.Image) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    h = b - t
    nb = t + max(1, int(h * 0.58))
    return autocrop(im.crop((l, t, r, nb)), pad=10)


def save_sprite(src: Path, dest: Path, *, max_side: int, bust: bool) -> None:
    if not src.exists():
        raise FileNotFoundError(src)
    raw = downscale(Image.open(src).convert("RGBA"), 1100)
    cut = remove_black_bg(raw)
    cut = autocrop(cut)
    if bust:
        cut = bust_crop(cut)
    out = downscale(cut, max_side)
    out = autocrop(out)
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "PNG", optimize=True)
    print(f"OK {dest.name} {out.size[0]}x{out.size[1]}", flush=True)


def save_bg(src: Path, dest: Path) -> None:
    im = Image.open(src).convert("RGB")
    im = ImageEnhance.Brightness(im).enhance(1.08)
    im = ImageEnhance.Contrast(im).enhance(1.03)
    im = downscale(im, 1920)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG", optimize=True)
    print(f"OK bg {dest.name} {im.size}", flush=True)


def main() -> None:
    for key, path in SRC.items():
        print(f"src {key}: exists={path.exists()}", flush=True)

    save_sprite(SRC["main"], OUT / "lv4-executive-bust.png", max_side=960, bust=True)
    save_sprite(SRC["main"], OUT / "lv4-executive.png", max_side=720, bust=False)
    save_sprite(SRC["pose2"], POSE / "lv4-executive-pose-02.png", max_side=720, bust=False)
    save_sprite(SRC["pose3"], POSE / "lv4-executive-pose-03.png", max_side=720, bust=False)
    save_sprite(SRC["bad1"], POSE / "lv4-executive-pose-bad1.png", max_side=720, bust=False)
    save_sprite(SRC["bad2"], POSE / "lv4-executive-pose-bad2.png", max_side=720, bust=False)
    save_sprite(SRC["main"], POSE / "lv4-executive-pose-good-01.png", max_side=720, bust=False)
    save_sprite(SRC["pose2"], POSE / "lv4-executive-pose-good-02.png", max_side=720, bust=False)
    save_sprite(SRC["pose3"], POSE / "lv4-executive-pose-good-03.png", max_side=720, bust=False)
    save_bg(SRC["bg"], BG / "lv4-grepp-hq.png")
    print("done", flush=True)


if __name__ == "__main__":
    main()
