"""Remove baked checkerboard background from interviewer PNGs (numpy dilation)."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

SRC_DIR = Path(r"C:\Users\dkwlr\Documents\프로그래머스_인턴쉽")
OUT_DIR = Path(r"c:\Users\dkwlr\IdeaProjects\CareerDungeon\INT2_Team3_Vibe_FE\public\interviewers")

JOBS = [
    (SRC_DIR / "널널한대리png.png", OUT_DIR / "lv1-casual.png"),
    (SRC_DIR / "깐깐한과장.png", OUT_DIR / "lv2-strict.png"),
]

MAX_SIDE = 900


def near_bg(rgb: np.ndarray) -> np.ndarray:
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    mx = np.maximum(np.maximum(r, g), b)
    d_a = np.abs(r - 224) + np.abs(g - 224) + np.abs(b - 224)
    d_b = np.abs(r - 255) + np.abs(g - 255) + np.abs(b - 255)
    return (chroma <= 18) & (mx >= 180) & (np.minimum(d_a, d_b) <= 84)


def dilate4(mask: np.ndarray) -> np.ndarray:
    out = mask.copy()
    out[1:, :] |= mask[:-1, :]
    out[:-1, :] |= mask[1:, :]
    out[:, 1:] |= mask[:, :-1]
    out[:, :-1] |= mask[:, 1:]
    return out


def remove_checkerboard(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    h, w = arr.shape[:2]
    bg = near_bg(arr[..., :3])

    seed = np.zeros((h, w), dtype=bool)
    seed[0, :] = bg[0, :]
    seed[-1, :] = bg[-1, :]
    seed[:, 0] = bg[:, 0]
    seed[:, -1] = bg[:, -1]

    # border-connected background via repeated dilation (vectorized)
    filled = seed
    while True:
        nxt = dilate4(filled) & bg
        if np.array_equal(nxt, filled):
            break
        filled = nxt

    arr[filled, 3] = 0
    return Image.fromarray(arr, "RGBA")


def autocrop(im: Image.Image, pad: int = 16) -> Image.Image:
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def downscale(im: Image.Image, max_side: int = MAX_SIDE) -> Image.Image:
    w, h = im.size
    scale = min(1.0, max_side / max(w, h))
    if scale >= 1.0:
        return im
    return im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for src, dest in JOBS:
        raw = downscale(Image.open(src).convert("RGBA"), max_side=1400)
        cleaned = downscale(autocrop(remove_checkerboard(raw)), max_side=MAX_SIDE)
        cleaned.save(dest, "PNG", optimize=True)
        print(f"OK {src.name} -> {dest.name} size={cleaned.size} alpha={cleaned.getchannel('A').getextrema()}")


if __name__ == "__main__":
    main()
