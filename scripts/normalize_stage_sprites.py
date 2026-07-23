"""Normalize stage sprites to identical body silhouette height (excludes speech bubbles/stars)."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1] / "public" / "interviewers"
CANVAS_W, CANVAS_H = 560, 640
TARGET_BODY_H = 580
PAD_BOTTOM = 12
STRUCT = ndimage.generate_binary_structure(2, 2)


def body_mask(arr: np.ndarray) -> np.ndarray:
    opaque = arr[..., 3] > 0
    labels, n = ndimage.label(opaque, structure=STRUCT)
    if n == 0:
        return opaque
    sizes = ndimage.sum(opaque, labels, index=np.arange(1, n + 1))
    main_id = int(np.argmax(sizes)) + 1
    main = labels == main_id
    main_size = float(sizes[main_id - 1])
    main_top = int(np.where(main)[0].min())
    main_h = int(np.where(main)[0].max() - main_top + 1)
    body = main.copy()
    dilated = ndimage.binary_dilation(main, structure=STRUCT, iterations=18)
    for i in range(1, n + 1):
        if i == main_id:
            continue
        m = labels == i
        ys = np.where(m)[0]
        top = int(ys.min())
        size = float(sizes[i - 1])
        # 말풍선/별 등 상단 장식은 몸 높이에서 제외
        if size < main_size * 0.18 and (top < main_top or float(ys.mean()) < main_top + main_h * 0.18):
            continue
        # 본체에 인접한 조각만 포함 (분리된 장식이 몸통으로 편입되지 않게)
        if (m & dilated).any():
            body |= m
    return body


def normalize(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    body = body_mask(arr)
    ys, xs = np.where(body)
    bt, bb = int(ys.min()), int(ys.max())
    body_h = bb - bt + 1
    body_cx = (int(xs.min()) + int(xs.max())) / 2.0
    full = arr[..., 3] > 0
    fys, fxs = np.where(full)
    ft, fb, fl, fr = int(fys.min()), int(fys.max()), int(fxs.min()), int(fxs.max())
    crop = im.crop((fl, ft, fr + 1, fb + 1))
    body_top_in_crop = bt - ft
    body_cx_in_crop = body_cx - fl
    scale = TARGET_BODY_H / body_h
    new_w = max(1, int(round(crop.width * scale)))
    new_h = max(1, int(round(crop.height * scale)))
    resized = crop.resize((new_w, new_h), Image.Resampling.LANCZOS)
    body_bottom_scaled = int(round((body_top_in_crop + body_h) * scale))
    body_cx_scaled = body_cx_in_crop * scale
    y = (CANVAS_H - PAD_BOTTOM) - body_bottom_scaled
    # 전체 crop이 아니라 몸통 x-중심으로 정렬해 말풍선 비대칭으로 몸이 밀리지 않게 한다.
    x = int(round(CANVAS_W / 2 - body_cx_scaled))
    if new_w > CANVAS_W or x < 0 or x + new_w > CANVAS_W:
        left = max(0, int(round(body_cx_scaled - CANVAS_W / 2)))
        left = min(left, max(0, new_w - CANVAS_W))
        resized = resized.crop((left, 0, left + min(CANVAS_W, new_w), new_h))
        x = max(0, (CANVAS_W - resized.width) // 2)
    if y < 0:
        resized = resized.crop((0, -y, resized.width, resized.height))
        y = 0
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    canvas.alpha_composite(resized, (x, y))
    canvas.save(path, "PNG", optimize=True)
    print(f"OK {path.name} body_h={body_h} scale={scale:.3f}", flush=True)


def main() -> None:
    files = [
        ROOT / "lv1-casual.png",
        ROOT / "lv2-strict.png",
        *sorted((ROOT / "poses").glob("lv1-casual-pose-*.png")),
        *sorted((ROOT / "poses").glob("lv2-strict-pose-*.png")),
    ]
    for f in files:
        if f.exists():
            normalize(f)


if __name__ == "__main__":
    main()
