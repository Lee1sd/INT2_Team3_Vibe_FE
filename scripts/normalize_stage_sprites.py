"""Normalize interviewer full-body/pose sprites to identical canvas + silhouette height."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "interviewers"
CANVAS_W, CANVAS_H = 560, 640
TARGET_H = 580
PAD_BOTTOM = 12


def content_bbox(im: Image.Image) -> tuple[int, int, int, int]:
    arr = np.array(im)
    alpha = arr[..., 3] > 0
    ys, xs = np.where(alpha)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def normalize(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    l, t, r, b = content_bbox(im)
    crop = im.crop((l, t, r, b))
    cw, ch = crop.size
    scale = TARGET_H / ch
    new_w = max(1, int(round(cw * scale)))
    resized = crop.resize((new_w, TARGET_H), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    x = (CANVAS_W - new_w) // 2
    y = CANVAS_H - PAD_BOTTOM - TARGET_H
    if new_w > CANVAS_W:
        left = (new_w - CANVAS_W) // 2
        resized = resized.crop((left, 0, left + CANVAS_W, TARGET_H))
        x = 0
    canvas.alpha_composite(resized, (x, y))
    canvas.save(path, "PNG", optimize=True)
    print(f"OK {path.name} -> {CANVAS_W}x{CANVAS_H} silhouette_h={TARGET_H}", flush=True)


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
        else:
            print(f"MISSING {f}", flush=True)


if __name__ == "__main__":
    main()
