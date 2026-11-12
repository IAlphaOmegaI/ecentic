#!/usr/bin/env python3
"""Rebuild the dimensional 404 in the site's selected tonal-dot grammar.

Uses Pillow/FreeType and the repository's own LT Superior font. The source is
procedural typography, not a generated photograph. The shared tonal sampler
turns bevel/extrusion luminance into regular, variable-radius circles.
"""
from pathlib import Path
from hashlib import sha256
import importlib.util
import json
import re
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

WEB = Path(__file__).resolve().parents[1]
DESTINATION = WEB / "public/images/ascii/tonal"
FONT = WEB / "public/fonts/LTSuperior/LTSuperior-SemiBold.woff2"
SAMPLER = importlib.util.spec_from_file_location("tonal_ascii", Path(__file__).with_name("tonal-ascii.py"))
tonal = importlib.util.module_from_spec(SAMPLER)
SAMPLER.loader.exec_module(tonal)


def main():
    font = ImageFont.truetype(str(FONT), 500)
    mask = Image.new("L", (1200, 620), 0)
    ImageDraw.Draw(mask).text((86, 58), "404", font=font, fill=255)
    source = Image.new("L", mask.size, 255)
    coverage = Image.new("L", mask.size, 0)
    depth = 80
    for step in range(depth, 0, -1):
        shifted = ImageChops.offset(mask, step, round(step * 0.52))
        source.paste(round(65 + 42 * (1 - step / depth)), (0, 0), shifted)
        coverage = ImageChops.lighter(coverage, shifted)
    front = Image.new("L", mask.size)
    drawing = ImageDraw.Draw(front)
    for row in range(front.height):
        drawing.line((0, row, front.width, row), fill=round(230 - 58 * row / front.height))
    source.paste(front, (0, 0), mask)
    bevel = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(7)))
    source.paste(239, (0, 0), bevel)
    coverage = ImageChops.lighter(coverage, mask)
    projection = (1, 0.12, -26, -0.055, 1, 40)
    source = source.transform(source.size, Image.Transform.AFFINE, projection, Image.Resampling.BICUBIC, fillcolor=255)
    coverage = coverage.transform(coverage.size, Image.Transform.AFFINE, projection, Image.Resampling.BICUBIC)
    x0, y0, x1, y1 = coverage.getbbox()
    source = source.crop((x0 - 24, y0 - 24, x1 + 24, y1 + 24))
    DESTINATION.mkdir(parents=True, exist_ok=True)
    source_file = DESTINATION / "not-found-source.png"
    source.save(source_file)
    svg, rows, marks = tonal.tonal_mask(source_file, 220, 0.95, 0.03)
    # The large type planes need stronger dot-size separation than photographs.
    svg = re.sub(r'r="([0-9.]+)"', lambda match: f'r="{0.46 * (float(match[1]) / 0.46) ** 2.4:.3f}"', svg)
    asset = DESTINATION / "not-found.svg"
    asset.write_text(svg)
    mobile_svg, mobile_rows, mobile_marks = tonal.tonal_mask(source_file, 132, 0.95, 0.03)
    mobile_svg = re.sub(r'r="([0-9.]+)"', lambda match: f'r="{0.46 * (float(match[1]) / 0.46) ** 2.4:.3f}"', mobile_svg)
    (DESTINATION / "not-found-mobile.svg").write_text(mobile_svg)
    provenance = {
        "method": "Tonal dots from dimensional typography",
        "generator": "apps/web/scripts/not-found-tonal.py",
        "font": "fonts/LTSuperior/LTSuperior-SemiBold.woff2",
        "fontSha256": sha256(FONT.read_bytes()).hexdigest(),
        "text": "404", "extrusion": [80, 41.6], "projection": list(projection),
        "source": "/images/ascii/tonal/not-found-source.png",
        "sourceSha256": sha256(source_file.read_bytes()).hexdigest(),
        "asset": "/images/ascii/tonal/not-found.svg",
        "assetSha256": sha256(asset.read_bytes()).hexdigest(),
        "grid": [220, rows], "marks": marks, "dotRadiusContrast": 2.4,
        "mobileAsset": "/images/ascii/tonal/not-found-mobile.svg",
        "mobileGrid": [132, mobile_rows], "mobileMarks": mobile_marks,
        "note": "Decorative typography only. Semantic 404 status is rendered separately in the page heading."
    }
    (DESTINATION / "not-found.provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
    print(json.dumps(provenance, indent=2))


if __name__ == "__main__":
    main()
