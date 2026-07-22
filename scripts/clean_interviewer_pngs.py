"""Clean baked checkerboard and export full + bust interviewer assets."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SRC_DIR = Path(r"C:\Users\dkwlr\Documents\프로그래머스_인턴쉽")
OUT_DIR = Path(r"c:\Users\dkwlr\IdeaProjects\CareerDungeon\INT2_Team3_Vibe_FE\public\interviewers")

JOBS = [
    (
        SRC_DIR / "널널한대리png.png",
        OUT_DIR / "lv1-casual.png",
        SRC_DIR / "널널한대리_확대샷.png",
        OUT_DIR / "lv1-casual-bust.png",
    ),
    (
        SRC_DIR / "깐깐한과장.png",
        OUT_DIR / "lv2-strict.png",
        SRC_DIR / "깐깐한과장_확대샷.png",
        OUT_DIR / "lv2-strict-bust.png",
    ),
]


def near_bg(rgb: np.ndarray) -> np.ndarray:
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    mx = np.maximum(np.maximum(r, g), b)
    d_a = np.abs(r - 224) + np.abs(g - 224) + np.abs(b - 224)
    d_b = np.abs(r - 255) + np.abs(g - 255) + np.abs(b - 255)
    d_c = np.abs(r - 240) + np.abs(g - 240) + np.abs(b - 240)
    return (chroma <= 14) & (mx >= 190) & (np.minimum(np.minimum(d_a, d_b), d_c) <= 70)


def dilate4(mask: np.ndarray) -> np.ndarray:
    out = mask.copy()
    out[1:, :] |= mask[:-1, :]
    out[:-1, :] |= mask[1:, :]
    out[:, 1:] |= mask[:, :-1]
    out[:, :-1] |= mask[:, 1:]
    return out


def erode4(mask: np.ndarray) -> np.ndarray:
    return ~dilate4(~mask)


def border_connected(bg: np.ndarray) -> np.ndarray:
    seed = np.zeros_like(bg, dtype=bool)
    seed[0, :] = bg[0, :]
    seed[-1, :] = bg[-1, :]
    seed[:, 0] = bg[:, 0]
    seed[:, -1] = bg[:, -1]
    filled = seed
    while True:
        nxt = dilate4(filled) & bg
        if np.array_equal(nxt, filled):
            return filled
        filled = nxt


def scrub_halos(arr: np.ndarray, passes: int = 3) -> None:
    """투명에 붙은 밝은 회색/흰색 잔여(누끼 헤일로)를 반복 제거."""
    for _ in range(passes):
        alpha = arr[..., 3] > 8
        fringe = dilate4(~alpha) & alpha
        rgb = arr[..., :3].astype(np.int16)
        chroma = np.maximum(np.maximum(rgb[..., 0], rgb[..., 1]), rgb[..., 2]) - np.minimum(
            np.minimum(rgb[..., 0], rgb[..., 1]), rgb[..., 2]
        )
        mx = np.maximum(np.maximum(rgb[..., 0], rgb[..., 1]), rgb[..., 2])
        # 검은 외곽선(어두움)은 남기고, 밝은 저채도 fringe만 제거
        halo = fringe & (chroma <= 25) & (mx >= 170)
        arr[halo, 3] = 0


def remove_checkerboard(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    remove = border_connected(near_bg(arr[..., :3]))
    arr[remove, 3] = 0
    scrub_halos(arr, passes=4)

    solid = arr[..., 3] > 0
    solid = dilate4(erode4(solid))
    arr[~solid, 3] = 0

    out = Image.fromarray(arr, "RGBA")
    a = out.getchannel("A").filter(ImageFilter.GaussianBlur(radius=0.45))
    out.putalpha(a)
    return out


def autocrop(im: Image.Image, pad: int = 10) -> Image.Image:
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    return im.crop(
        (max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad))
    )


def bust_crop(im: Image.Image) -> Image.Image:
    """상반신 비중을 키우기 위해 하단 일부를 잘라 더 타이트한 바스트샷으로."""
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    h = b - t
    # 하단 28% 컷 → 머리~가슴 강조
    new_b = t + int(h * 0.72)
    cropped = im.crop((l, t, r, max(t + 1, new_b)))
    return autocrop(cropped, pad=8)


def downscale(im: Image.Image, max_side: int) -> Image.Image:
    w, h = im.size
    scale = min(1.0, max_side / max(w, h))
    if scale >= 1.0:
        return im
    return im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)


def process(src: Path, dest: Path, max_side: int, as_bust: bool) -> None:
    raw = downscale(Image.open(src).convert("RGBA"), max_side=1400)
    cleaned = remove_checkerboard(raw)
    cleaned = autocrop(cleaned)
    if as_bust:
        cleaned = bust_crop(cleaned)
    cleaned = downscale(cleaned, max_side=max_side)
    cleaned.save(dest, "PNG", optimize=True)
    print(
        f"OK {src.name} -> {dest.name} size={cleaned.size} alpha={cleaned.getchannel('A').getextrema()}",
        flush=True,
    )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for full_src, full_dest, bust_src, bust_dest in JOBS:
        process(full_src, full_dest, max_side=720, as_bust=False)
        process(bust_src, bust_dest, max_side=960, as_bust=True)


if __name__ == "__main__":
    main()
