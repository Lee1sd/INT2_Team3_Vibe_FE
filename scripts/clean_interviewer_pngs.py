"""Fast custom nukki for flat cartoon interviewer sprites (scipy, no rembg)."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance
from scipy import ndimage

SRC_DIR = Path(r"C:\Users\dkwlr\Documents\프로그래머스_인턴쉽")
OUT_DIR = Path(r"c:\Users\dkwlr\IdeaProjects\CareerDungeon\INT2_Team3_Vibe_FE\public\interviewers")
POSE_DIR = OUT_DIR / "poses"
BG_DIR = OUT_DIR / "backgrounds"

FULL_JOBS = [
    (SRC_DIR / "널널한대리png.png", OUT_DIR / "lv1-casual.png"),
    (SRC_DIR / "깐깐한과장.png", OUT_DIR / "lv2-strict.png"),
]
BUST_JOBS = [
    (SRC_DIR / "널널한대리_확대샷.png", OUT_DIR / "lv1-casual-bust.png"),
    (SRC_DIR / "깐깐한과장_확대샷.png", OUT_DIR / "lv2-strict-bust.png"),
]
POSE_SHEETS = [
    (SRC_DIR / "대리님 포즈1,2.png", ["lv1-casual-pose-01.png", "lv1-casual-pose-02.png"]),
    (SRC_DIR / "대리님 포즈 3,4.png", ["lv1-casual-pose-03.png", "lv1-casual-pose-04.png"]),
    (SRC_DIR / "과장포즈1,2.png", ["lv2-strict-pose-01.png", "lv2-strict-pose-02.png"]),
    (SRC_DIR / "과장포즈3,4.png", ["lv2-strict-pose-03.png", "lv2-strict-pose-04.png"]),
]
BG_JOBS = [
    (SRC_DIR / "1단계 프로그래머스 사무실.png", BG_DIR / "lv1-programmers.png"),
    (SRC_DIR / "2단계 그렙 사무실.png", BG_DIR / "lv2-grepp.png"),
]

STRUCT8 = ndimage.generate_binary_structure(2, 2)


def downscale(im: Image.Image, max_side: int) -> Image.Image:
    w, h = im.size
    scale = min(1.0, max_side / max(w, h))
    if scale >= 1.0:
        return im
    return im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)


def autocrop_arr(arr: np.ndarray, pad: int = 8) -> np.ndarray:
    ys, xs = np.where(arr[..., 3] > 0)
    if len(xs) == 0:
        return arr
    t, b, l, r = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    h, w = arr.shape[:2]
    return arr[max(0, t - pad) : min(h, b + 1 + pad), max(0, l - pad) : min(w, r + 1 + pad)]


def flood_bg(allowed: np.ndarray, bust: bool) -> np.ndarray:
    h, w = allowed.shape
    seed = np.zeros_like(allowed, dtype=bool)
    seed[0, :] = allowed[0, :]
    if not bust:
        seed[-1, :] = allowed[-1, :]
        seed[:, 0] = allowed[:, 0]
        seed[:, -1] = allowed[:, -1]
    else:
        band = max(3, int(h * 0.12))
        seed[:band, 0] = allowed[:band, 0]
        seed[:band, -1] = allowed[:band, -1]
    return ndimage.binary_propagation(seed, mask=allowed, structure=STRUCT8)


def remove_bg(im: Image.Image, *, bust: bool) -> np.ndarray:
    arr = np.array(im.convert("RGBA"))
    rgb = arr[..., :3].astype(np.int16)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    chroma = mx - np.minimum(np.minimum(r, g), b)

    ink = (mx <= 88) | ((mx <= 120) & (chroma <= 48))
    vivid = chroma >= 28
    neutral = (np.abs(r - g) <= 16) & (np.abs(g - b) <= 16) & (np.abs(r - b) <= 16)
    checker = neutral & (chroma <= 24) & (mx >= 168)

    wall = ndimage.binary_dilation(ink, structure=STRUCT8, iterations=2)
    allowed = checker & ~wall & ~vivid
    remove = flood_bg(allowed, bust=bust)
    arr[remove, 3] = 0

    # 외곽과 끊긴 체커보드 섬 제거
    leftover = checker & (arr[..., 3] > 0) & ~ink & ~vivid
    labels, n = ndimage.label(leftover)
    if n:
        border = set(
            np.unique(
                np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])
            ).tolist()
        )
        border.discard(0)
        for lab in range(1, n + 1):
            if lab not in border:
                arr[labels == lab, 3] = 0

    # 헤일로 제거
    for _ in range(12):
        alpha = arr[..., 3] > 0
        fringe = ndimage.binary_dilation(~alpha, structure=STRUCT8) & alpha
        mx2 = np.maximum(np.maximum(arr[..., 0], arr[..., 1]), arr[..., 2]).astype(np.int16)
        ch2 = mx2 - np.minimum(np.minimum(arr[..., 0], arr[..., 1]), arr[..., 2]).astype(np.int16)
        ink2 = (mx2 <= 90) | ((mx2 <= 125) & (ch2 <= 50))
        vivid2 = ch2 >= 28
        halo = fringe & ~ink2 & ~vivid2 & (ch2 <= 30) & (mx2 >= 120)
        if not halo.any():
            break
        arr[halo, 3] = 0

    # 1px 정리 + 잉크 복원
    keep = arr[..., 3] > 0
    keep = ndimage.binary_erosion(keep, structure=STRUCT8, iterations=1)
    keep |= ink & (arr[..., 3] > 0) & ndimage.binary_dilation(keep, structure=STRUCT8, iterations=1)

    # 내부 구멍 복구
    labels, n = ndimage.label(~keep)
    if n:
        border = set(
            np.unique(
                np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]])
            ).tolist()
        )
        border.discard(0)
        for lab in range(1, n + 1):
            if lab not in border:
                keep |= labels == lab

    # 최대 컴포넌트
    labels, n = ndimage.label(keep)
    if n:
        sizes = ndimage.sum(keep, labels, index=np.arange(1, n + 1))
        best = int(np.argmax(sizes)) + 1
        thresh = float(sizes[best - 1]) * 0.04
        keep_labs = {best} | {i + 1 for i, s in enumerate(sizes) if s >= thresh}
        keep = np.isin(labels, list(keep_labs))

    arr[~keep, 3] = 0
    arr[keep, 3] = 255

    # 최종 헤일로 패스
    for _ in range(6):
        alpha = arr[..., 3] > 0
        fringe = ndimage.binary_dilation(~alpha, structure=STRUCT8) & alpha
        mx2 = np.maximum(np.maximum(arr[..., 0], arr[..., 1]), arr[..., 2]).astype(np.int16)
        ch2 = mx2 - np.minimum(np.minimum(arr[..., 0], arr[..., 1]), arr[..., 2]).astype(np.int16)
        ink2 = (mx2 <= 90) | ((mx2 <= 125) & (ch2 <= 50))
        vivid2 = ch2 >= 28
        halo = fringe & ~ink2 & ~vivid2 & (ch2 <= 30) & (mx2 >= 115)
        if not halo.any():
            break
        arr[halo, 3] = 0
    arr[arr[..., 3] > 0, 3] = 255
    return arr


def bust_crop_arr(arr: np.ndarray) -> np.ndarray:
    ys, xs = np.where(arr[..., 3] > 0)
    if len(xs) == 0:
        return arr
    t, b, l, r = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    h = b - t
    # 머리 보존: 상단은 그대로, 하단만 자름
    nb = t + max(1, int(h * 0.78))
    return autocrop_arr(arr[t : nb + 1, l : r + 1], pad=8)


def process(src: Path, dest: Path, max_side: int, bust: bool) -> None:
    raw = downscale(Image.open(src).convert("RGBA"), 1000)
    print(f"cut {src.name}", flush=True)
    arr = remove_bg(raw, bust=bust)
    arr = autocrop_arr(arr)
    if bust:
        arr = bust_crop_arr(arr)
    im = downscale(Image.fromarray(arr, "RGBA"), max_side)
    arr = np.array(im)
    # 최종 해상도에서 헤일로만 한 번 더
    for _ in range(5):
        alpha = arr[..., 3] > 0
        fringe = ndimage.binary_dilation(~alpha, structure=STRUCT8) & alpha
        mx2 = np.maximum(np.maximum(arr[..., 0], arr[..., 1]), arr[..., 2]).astype(np.int16)
        ch2 = mx2 - np.minimum(np.minimum(arr[..., 0], arr[..., 1]), arr[..., 2]).astype(np.int16)
        ink2 = (mx2 <= 90) | ((mx2 <= 125) & (ch2 <= 50))
        vivid2 = ch2 >= 28
        halo = fringe & ~ink2 & ~vivid2 & (ch2 <= 30) & (mx2 >= 115)
        if not halo.any():
            break
        arr[halo, 3] = 0
    arr[arr[..., 3] > 0, 3] = 255
    arr = autocrop_arr(arr)
    dest.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, "RGBA").save(dest, "PNG", optimize=True)
    print(f"OK {dest.name} {arr.shape[1]}x{arr.shape[0]}", flush=True)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for p in list(OUT_DIR.glob("_check_*")) + list(OUT_DIR.glob("_prev*")) + list(OUT_DIR.glob("_preview*")):
        p.unlink(missing_ok=True)

    for src, dest in FULL_JOBS:
        process(src, dest, 720, False)
    for src, dest in BUST_JOBS:
        process(src, dest, 960, True)
    for src, names in POSE_SHEETS:
        if not src.exists():
            print(f"MISSING {src}", flush=True)
            continue
        im = Image.open(src).convert("RGBA")
        w, h = im.size
        mid = w // 2
        for part, name in ((im.crop((0, 0, mid, h)), names[0]), (im.crop((mid, 0, w, h)), names[1])):
            tmp = POSE_DIR / name
            # reuse process via temp path logic
            raw = downscale(part, 900)
            print(f"cut pose {name}", flush=True)
            arr = remove_bg(raw, bust=False)
            arr = autocrop_arr(arr)
            out = downscale(Image.fromarray(arr, "RGBA"), 720)
            arr = np.array(out)
            for _ in range(5):
                alpha = arr[..., 3] > 0
                fringe = ndimage.binary_dilation(~alpha, structure=STRUCT8) & alpha
                mx2 = np.maximum(np.maximum(arr[..., 0], arr[..., 1]), arr[..., 2]).astype(np.int16)
                ch2 = mx2 - np.minimum(np.minimum(arr[..., 0], arr[..., 1]), arr[..., 2]).astype(np.int16)
                ink2 = (mx2 <= 90) | ((mx2 <= 125) & (ch2 <= 50))
                vivid2 = ch2 >= 28
                halo = fringe & ~ink2 & ~vivid2 & (ch2 <= 30) & (mx2 >= 115)
                if not halo.any():
                    break
                arr[halo, 3] = 0
            arr[arr[..., 3] > 0, 3] = 255
            arr = autocrop_arr(arr)
            POSE_DIR.mkdir(parents=True, exist_ok=True)
            Image.fromarray(arr, "RGBA").save(tmp, "PNG", optimize=True)
            print(f"OK {name}", flush=True)

    for src, dest in BG_JOBS:
        if src.exists():
            im = Image.open(src).convert("RGB")
            im = ImageEnhance.Brightness(im).enhance(1.25)
            im = ImageEnhance.Contrast(im).enhance(1.05)
            im = downscale(im, 1920)
            dest.parent.mkdir(parents=True, exist_ok=True)
            im.save(dest, "PNG", optimize=True)
            print(f"OK bg {dest.name}", flush=True)


if __name__ == "__main__":
    main()
