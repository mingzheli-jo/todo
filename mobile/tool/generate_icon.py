"""Generate Toto launcher icon source PNGs.

Produces:
  assets/icon.png            — 1024x1024, brand gradient + white "T"
                               (legacy round/square Android icon)
  assets/icon_foreground.png — 1024x1024, transparent + white "T"
                               (Android adaptive-icon foreground)

Usage:
    python tool/generate_icon.py

Then refresh density-specific resources with:
    dart run flutter_launcher_icons

Requires Pillow:
    pip install Pillow
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 1024

# Brand gradient endpoints (top-left → bottom-right).
START = (0x63, 0x66, 0xF1)  # #6366F1
END = (0x8B, 0x5C, 0xF6)    # #8B5CF6

# Foreground "T" sizing relative to canvas.
BAR_WIDTH_RATIO = 0.50      # horizontal bar width
BAR_THICKNESS_RATIO = 0.13  # bar thickness
STEM_WIDTH_RATIO = 0.14     # vertical stem width
STEM_HEIGHT_RATIO = 0.55    # vertical stem height
TOP_OFFSET_RATIO = 0.22     # top padding


def make_gradient(size: int = SIZE) -> Image.Image:
    """Linear gradient from START (top-left) to END (bottom-right)."""
    img = Image.new("RGB", (size, size))
    pixels = img.load()
    denom = 2 * (size - 1)
    for y in range(size):
        for x in range(size):
            t = (x + y) / denom
            r = round(START[0] * (1 - t) + END[0] * t)
            g = round(START[1] * (1 - t) + END[1] * t)
            b = round(START[2] * (1 - t) + END[2] * t)
            pixels[x, y] = (r, g, b)
    return img


def draw_letter_t(img: Image.Image, color=(255, 255, 255, 255)) -> None:
    """Paint a centered, bold T inside the canvas."""
    size = img.width
    bar_w = round(size * BAR_WIDTH_RATIO)
    bar_h = round(size * BAR_THICKNESS_RATIO)
    stem_w = round(size * STEM_WIDTH_RATIO)
    stem_h = round(size * STEM_HEIGHT_RATIO)
    bar_left = (size - bar_w) // 2
    bar_top = round(size * TOP_OFFSET_RATIO)
    stem_left = (size - stem_w) // 2
    stem_top = bar_top
    radius = max(8, round(bar_h * 0.35))

    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(
        (bar_left, bar_top, bar_left + bar_w - 1, bar_top + bar_h - 1),
        radius=radius,
        fill=color,
    )
    draw.rounded_rectangle(
        (stem_left, stem_top, stem_left + stem_w - 1, stem_top + stem_h - 1),
        radius=radius,
        fill=color,
    )


def main() -> None:
    assets = Path(__file__).resolve().parent.parent / "assets"
    assets.mkdir(parents=True, exist_ok=True)

    # Legacy icon: gradient background + T.
    legacy = make_gradient().convert("RGBA")
    draw_letter_t(legacy)
    legacy_path = assets / "icon.png"
    legacy.save(legacy_path, format="PNG", optimize=True)
    print(f"Wrote {legacy_path} ({SIZE}x{SIZE})")

    # Adaptive foreground: transparent canvas + T only.
    foreground = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw_letter_t(foreground)
    fg_path = assets / "icon_foreground.png"
    foreground.save(fg_path, format="PNG", optimize=True)
    print(f"Wrote {fg_path} ({SIZE}x{SIZE})")


if __name__ == "__main__":
    main()
