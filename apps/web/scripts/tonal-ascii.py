#!/usr/bin/env python3
"""Rebuild the selected Tonal dots artwork from existing, complete source images.

Run from any directory with Python 3 + Pillow:
    python3 apps/web/scripts/tonal-ascii.py

Each source retains its aspect ratio. White-background coverage removes the
backdrop, luminance controls dot radius, and an exposure value retains shading
in dark products. The headphones settings are the selected prototype settings.
No generated text, invented outlines, API calls, or product attributes are used.
"""

from hashlib import sha256
from pathlib import Path
import json
from PIL import Image

WEB = Path(__file__).resolve().parents[1]
DESTINATION = WEB / "public/images/ascii/tonal"
SUBJECTS = (
    ("headphones", "images/products/sony-wh-1000xm5.webp", 120, 0.46, 0.15),
    ("catalog", "images/ascii/connect-catalog.png", 120, 0.95, 0.03),
)


def tonal_mask(source, columns, exposure, background_feather):
    """Sample coverage and luminance into one variable-radius circle per cell."""
    original = Image.open(source).convert("RGBA")
    canvas = Image.new("RGBA", original.size, "white")
    canvas.alpha_composite(original)
    rows = round(columns * original.height / original.width)
    sample = canvas.convert("L").resize((columns, rows), Image.Resampling.LANCZOS)
    circles = []
    for index, pixel in enumerate(sample.tobytes()):
        luminance = pixel / 255
        coverage = min(1, max(0, (0.97 - luminance) / background_feather))
        tone = coverage * (0.22 + 0.78 * min(1, luminance / exposure) ** 0.6)
        if tone < 0.045:
            continue
        radius = 0.46 * tone ** 0.6
        x = index % columns + 0.5
        y = index // columns + 0.5
        circles.append(f'<circle cx="{x:g}" cy="{y:g}" r="{radius:.3f}"/>')
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {columns} {rows}">'
        + '<g fill="white">' + ''.join(circles) + '</g></svg>\n'
    )
    return svg, rows, len(circles)


def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    records = []
    for subject, relative_source, columns, exposure, background_feather in SUBJECTS:
        source = WEB / "public" / relative_source
        svg, rows, marks = tonal_mask(source, columns, exposure, background_feather)
        destination = DESTINATION / f"{subject}.svg"
        destination.write_text(svg)
        records.append({
            "subject": subject,
            "source": "/" + relative_source,
            "sourceSha256": sha256(source.read_bytes()).hexdigest(),
            "asset": "/images/ascii/tonal/" + destination.name,
            "assetSha256": sha256(destination.read_bytes()).hexdigest(),
            "grid": [columns, rows],
            "exposure": exposure,
            "backgroundFeather": background_feather,
            "marks": marks,
        })
    provenance = {
        "method": "Tonal dots",
        "selected": "2026-11-11",
        "generator": "apps/web/scripts/tonal-ascii.py",
        "description": "Variable-radius circles sampled from source luminance and white-background coverage; complete source aspect ratio retained.",
        "usage": "Illustrative artwork only. The photographs and rendered artwork do not supply product record attributes.",
        "subjects": records,
    }
    (DESTINATION / "provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
    print(json.dumps(provenance, indent=2))


if __name__ == "__main__":
    main()
