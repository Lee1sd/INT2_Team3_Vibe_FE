"""Clean baked checkerboard, export full/bust/pose assets, brighten session backgrounds."""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

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


def near_bg(rgb: np.ndarray) -> np.ndarray:
    """체커보드·밝은 회색 배경 후보(본체 흰 깃털보다 넓게 잡아 외곽 flood용)."""
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    # 저채도 + 밝은 회색/흰색 타일
    flat = (chroma <= 28) & (mx >= 168)
    # 전형적인 체커보드 회색대
    grayish = flat & (mx - mn <= 28) & (mx <= 250)
    near_white_tile = flat & (mx >= 232)
    return grayish | near_white_tile


def dilate4(mask: np.ndarray) -> np.ndarray:
    out = mask.copy()
    out[1:, :] |= mask[:-1, :]
    out[:-1, :] |= mask[1:, :]
    out[:, 1:] |= mask[:, :-1]
    out[:, :-1] |= mask[:, 1:]
    return out


def dilate8(mask: np.ndarray) -> np.ndarray:
    out = dilate4(mask)
    out[1:, 1:] |= mask[:-1, :-1]
    out[1:, :-1] |= mask[:-1, 1:]
    out[:-1, 1:] |= mask[1:, :-1]
    out[:-1, :-1] |= mask[1:, 1:]
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


def label_components(mask: np.ndarray) -> tuple[np.ndarray, list[int]]:
    """4-connected component labels. Returns label map (0=bg) and sizes[label]."""
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    sizes: list[int] = [0]
    current = 0
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or labels[y, x]:
                continue
            current += 1
            q: deque[tuple[int, int]] = deque([(y, x)])
            labels[y, x] = current
            count = 0
            while q:
                cy, cx = q.popleft()
                count += 1
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and labels[ny, nx] == 0:
                        labels[ny, nx] = current
                        q.append((ny, nx))
            sizes.append(count)
    return labels, sizes


def keep_largest_opaque(arr: np.ndarray) -> None:
    """가장 큰 불투명 덩어리(캐릭터)만 남기고 체커보드 섬/잡티 제거."""
    opaque = arr[..., 3] > 0
    if not opaque.any():
        return
    labels, sizes = label_components(opaque)
    if len(sizes) <= 1:
        return
    # 최대 컴포넌트 + 아주 큰 보조(전체의 8% 이상)만 유지 — 보통 캐릭터 하나
    max_size = max(sizes[1:])
    keep_labels = {i for i, s in enumerate(sizes) if i > 0 and (s == max_size or s >= max_size * 0.08)}
    drop = opaque & ~np.isin(labels, list(keep_labels))
    arr[drop, 3] = 0


def scrub_halos(arr: np.ndarray, passes: int = 5) -> None:
    """투명 경계의 밝은 회색·잔여 타일만 제거. 순백 본체·검은 외곽선은 보존."""
    for _ in range(passes):
        alpha = arr[..., 3] > 0
        fringe = dilate8(~alpha) & alpha
        rgb = arr[..., :3].astype(np.int16)
        chroma = np.maximum(np.maximum(rgb[..., 0], rgb[..., 1]), rgb[..., 2]) - np.minimum(
            np.minimum(rgb[..., 0], rgb[..., 1]), rgb[..., 2]
        )
        mx = np.maximum(np.maximum(rgb[..., 0], rgb[..., 1]), rgb[..., 2])
        # 외곽의 저채도 밝은 픽셀(체커보드 잔여). 순백(mx>=250)이어도 fringe면 대부분 헤일로
        # 다만 흰 깃털 가장자리 손상을 줄이기 위해 mx>=252 & 이웃에 진한 외곽선 있으면 보존
        dark = mx <= 60
        near_dark = dilate8(dark) & alpha
        halo = fringe & (chroma <= 30) & (mx >= 160) & ~((mx >= 248) & near_dark)
        # 회색 타일(220 전후)은 무조건 제거
        gray_tile = fringe & (chroma <= 25) & (mx >= 175) & (mx <= 245)
        arr[halo | gray_tile, 3] = 0


def remove_enclosed_bg(arr: np.ndarray) -> None:
    """다리 사이 등 외곽과 끊긴 체커보드 섬 제거."""
    rgb = arr[..., :3]
    bg = near_bg(rgb) & (arr[..., 3] > 0)
    if not bg.any():
        return
    # 이미 투명인 영역과 맞닿은 near_bg도 배경으로 확장 제거
    transparent = arr[..., 3] == 0
    seed = dilate8(transparent) & bg
    filled = seed
    while True:
        nxt = dilate4(filled) & bg
        if np.array_equal(nxt, filled):
            break
        filled = nxt
    arr[filled, 3] = 0


def solidify_alpha(arr: np.ndarray, threshold: int = 40) -> None:
    opaque = arr[..., 3] >= threshold
    arr[opaque, 3] = 255
    arr[~opaque, 3] = 0


def remove_checkerboard(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    bg = near_bg(arr[..., :3])
    remove = border_connected(bg)
    arr[remove, 3] = 0
    remove_enclosed_bg(arr)
    scrub_halos(arr, passes=5)
    remove_enclosed_bg(arr)

    solid = arr[..., 3] > 0
    # 작은 구멍/돌기 정리
    solid = dilate4(erode4(solid))
    solid = erode4(dilate4(solid))
    arr[~solid, 3] = 0

    keep_largest_opaque(arr)
    scrub_halos(arr, passes=3)
    solidify_alpha(arr, threshold=40)
    return Image.fromarray(arr, "RGBA")


def autocrop(im: Image.Image, pad: int = 10) -> Image.Image:
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    return im.crop(
        (max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad))
    )


def bust_crop(im: Image.Image) -> Image.Image:
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    h = b - t
    new_b = t + int(h * 0.72)
    cropped = im.crop((l, t, r, max(t + 1, new_b)))
    return autocrop(cropped, pad=8)


def downscale(im: Image.Image, max_side: int) -> Image.Image:
    w, h = im.size
    scale = min(1.0, max_side / max(w, h))
    if scale >= 1.0:
        return im
    return im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)


def process_sprite(src: Path, dest: Path, max_side: int, as_bust: bool) -> None:
    raw = downscale(Image.open(src).convert("RGBA"), max_side=1600)
    cleaned = remove_checkerboard(raw)
    cleaned = autocrop(cleaned)
    if as_bust:
        cleaned = bust_crop(cleaned)
    cleaned = downscale(cleaned, max_side=max_side)
    arr = np.array(cleaned)
    solidify_alpha(arr, threshold=32)
    cleaned = Image.fromarray(arr, "RGBA")
    dest.parent.mkdir(parents=True, exist_ok=True)
    cleaned.save(dest, "PNG", optimize=True)
    print(
        f"OK {src.name} -> {dest.name} size={cleaned.size} alpha={cleaned.getchannel('A').getextrema()}",
        flush=True,
    )


def split_pose_sheet(src: Path, left_name: str, right_name: str) -> None:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    mid = w // 2
    left = im.crop((0, 0, mid, h))
    right = im.crop((mid, 0, w, h))
    for part, name in ((left, left_name), (right, right_name)):
        cleaned = remove_checkerboard(part)
        cleaned = autocrop(cleaned)
        cleaned = downscale(cleaned, max_side=720)
        arr = np.array(cleaned)
        solidify_alpha(arr, threshold=32)
        cleaned = Image.fromarray(arr, "RGBA")
        POSE_DIR.mkdir(parents=True, exist_ok=True)
        cleaned.save(POSE_DIR / name, "PNG", optimize=True)
        print(f"OK pose {src.name} -> {name} size={cleaned.size}", flush=True)


def brighten_background(src: Path, dest: Path, factor: float = 1.22) -> None:
    im = Image.open(src).convert("RGB")
    im = ImageEnhance.Brightness(im).enhance(factor)
    im = ImageEnhance.Contrast(im).enhance(1.05)
    im = downscale(im, max_side=1920)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG", optimize=True)
    print(f"OK bg {src.name} -> {dest.name} size={im.size} brightness={factor}", flush=True)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for src, dest in FULL_JOBS:
        process_sprite(src, dest, max_side=720, as_bust=False)
    for src, dest in BUST_JOBS:
        process_sprite(src, dest, max_side=960, as_bust=True)
    for src, names in POSE_SHEETS:
        if not src.exists():
            print(f"MISSING pose sheet: {src}", flush=True)
            continue
        split_pose_sheet(src, names[0], names[1])
    for src, dest in BG_JOBS:
        if not src.exists():
            print(f"MISSING bg: {src}", flush=True)
            continue
        brighten_background(src, dest, factor=1.25)


if __name__ == "__main__":
    main()
