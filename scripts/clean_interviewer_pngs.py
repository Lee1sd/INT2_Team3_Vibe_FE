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
    """체커보드·밝은 회색 배경 후보. (흰 깃털도 포함될 수 있어 outline wall과 함께 쓴다)"""
    r = rgb[..., 0].astype(np.int16)
    g = rgb[..., 1].astype(np.int16)
    b = rgb[..., 2].astype(np.int16)
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    flat = (chroma <= 28) & (mx >= 168)
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


def outline_wall(rgb: np.ndarray, dilate_iters: int = 3) -> np.ndarray:
    """검은 외곽선을 두껍게 막아 flood가 흰 본체로 새지 않게 한다."""
    mx = np.maximum(np.maximum(rgb[..., 0], rgb[..., 1]), rgb[..., 2]).astype(np.int16)
    chroma = (
        np.maximum(np.maximum(rgb[..., 0], rgb[..., 1]), rgb[..., 2])
        - np.minimum(np.minimum(rgb[..., 0], rgb[..., 1]), rgb[..., 2])
    ).astype(np.int16)
    wall = (mx <= 95) | ((mx <= 130) & (chroma <= 45))
    for _ in range(dilate_iters):
        wall = dilate8(wall)
    return wall


def border_connected(
    bg: np.ndarray,
    *,
    seed_top: bool = True,
    seed_bottom: bool = True,
    seed_left: bool = True,
    seed_right: bool = True,
) -> np.ndarray:
    seed = np.zeros_like(bg, dtype=bool)
    if seed_top:
        seed[0, :] = bg[0, :]
    if seed_bottom:
        seed[-1, :] = bg[-1, :]
    if seed_left:
        seed[:, 0] = bg[:, 0]
    if seed_right:
        seed[:, -1] = bg[:, -1]
    filled = seed
    while True:
        nxt = dilate4(filled) & bg
        if np.array_equal(nxt, filled):
            return filled
        filled = nxt


def label_components(mask: np.ndarray) -> tuple[np.ndarray, list[int]]:
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
    opaque = arr[..., 3] > 0
    if not opaque.any():
        return
    labels, sizes = label_components(opaque)
    if len(sizes) <= 1:
        return
    max_size = max(sizes[1:])
    keep_labels = {i for i, s in enumerate(sizes) if i > 0 and (s == max_size or s >= max_size * 0.08)}
    drop = opaque & ~np.isin(labels, list(keep_labels))
    arr[drop, 3] = 0


def scrub_halos(arr: np.ndarray, passes: int = 4) -> None:
    for _ in range(passes):
        alpha = arr[..., 3] > 0
        fringe = dilate8(~alpha) & alpha
        rgb = arr[..., :3].astype(np.int16)
        chroma = np.maximum(np.maximum(rgb[..., 0], rgb[..., 1]), rgb[..., 2]) - np.minimum(
            np.minimum(rgb[..., 0], rgb[..., 1]), rgb[..., 2]
        )
        mx = np.maximum(np.maximum(rgb[..., 0], rgb[..., 1]), rgb[..., 2])
        dark = mx <= 60
        near_dark = dilate8(dark) & alpha
        gray_tile = fringe & (chroma <= 22) & (mx >= 175) & (mx <= 242)
        soft_white_halo = fringe & (chroma <= 18) & (mx >= 242) & (mx < 252) & ~near_dark
        arr[gray_tile | soft_white_halo, 3] = 0


def remove_small_bg_islands(arr: np.ndarray, wall: np.ndarray, max_island: int = 3000) -> None:
    rgb = arr[..., :3]
    bg = near_bg(rgb) & (arr[..., 3] > 0) & ~wall
    if not bg.any():
        return
    labels, sizes = label_components(bg)
    drop_labels = {i for i, s in enumerate(sizes) if i > 0 and s <= max_island}
    if not drop_labels:
        return
    arr[np.isin(labels, list(drop_labels)), 3] = 0


def solidify_alpha(arr: np.ndarray, threshold: int = 40) -> None:
    opaque = arr[..., 3] >= threshold
    arr[opaque, 3] = 255
    arr[~opaque, 3] = 0


def fill_interior_holes(arr: np.ndarray) -> None:
    """테두리에 닿지 않은 투명 구멍(먹힌 흰 깃털)은 RGB가 남아 있으므로 알파만 복구."""
    transparent = arr[..., 3] == 0
    if not transparent.any():
        return
    labels, _sizes = label_components(transparent)
    touch_border = set(labels[0, :].tolist()) | set(labels[-1, :].tolist())
    touch_border |= set(labels[:, 0].tolist()) | set(labels[:, -1].tolist())
    touch_border.discard(0)
    hole = transparent & ~np.isin(labels, list(touch_border))
    if hole.any():
        arr[hole, 3] = 255


def border_connected_safe(
    bg: np.ndarray,
    *,
    protect_bottom_seed: bool,
    protect_side_body: bool,
) -> np.ndarray:
    """
    확대샷: 좌우 전체 시드는 날개/몸통으로 flood가 역류하므로
    상단 + 좌우 상단 일부만 시드한다.
    """
    h, _w = bg.shape
    if not protect_side_body:
        return border_connected(
            bg,
            seed_top=True,
            seed_bottom=not protect_bottom_seed,
            seed_left=True,
            seed_right=True,
        )
    seed = np.zeros_like(bg, dtype=bool)
    seed[0, :] = bg[0, :]
    top_band = max(2, int(h * 0.12))
    seed[:top_band, 0] = bg[:top_band, 0]
    seed[:top_band, -1] = bg[:top_band, -1]
    if not protect_bottom_seed:
        seed[-1, :] = bg[-1, :]
    filled = seed
    while True:
        nxt = dilate4(filled) & bg
        if np.array_equal(nxt, filled):
            return filled
        filled = nxt


def remove_checkerboard(im: Image.Image, *, protect_bottom_seed: bool = False) -> Image.Image:
    """
    누끼: 외곽선 wall로 본체 보호 후 테두리에서만 배경 flood.
    확대샷은 하단/측면 시드를 제한하고, 본체 내부 구멍은 다시 메운다.
    """
    arr = np.array(im.convert("RGBA"))
    rgb = arr[..., :3]
    wall = outline_wall(rgb, dilate_iters=4)
    floodable = near_bg(rgb) & ~wall
    remove = border_connected_safe(
        floodable,
        protect_bottom_seed=protect_bottom_seed,
        protect_side_body=protect_bottom_seed,
    )
    arr[remove, 3] = 0
    remove_small_bg_islands(arr, wall, max_island=3000)
    scrub_halos(arr, passes=3)
    fill_interior_holes(arr)

    solid = arr[..., 3] > 0
    solid = dilate4(erode4(solid))
    arr[~solid, 3] = 0
    fill_interior_holes(arr)

    keep_largest_opaque(arr)
    fill_interior_holes(arr)
    scrub_halos(arr, passes=2)
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
    cleaned = remove_checkerboard(raw, protect_bottom_seed=as_bust)
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
        cleaned = remove_checkerboard(part, protect_bottom_seed=False)
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
