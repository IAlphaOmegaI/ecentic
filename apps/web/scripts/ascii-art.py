#!/usr/bin/env python3
"""Build a `public/images/ascii/*.png` motif from a rendered source image.

Every asset in `public/images/ascii` is a real character grid — white glyphs on
transparent, laid out on a 9x18px Courier cell, picked from the density ramp
below. They are not drawings of text, which is why no image model can produce
one directly: ask for "ASCII art" and you get glyph-shaped noise on a grid that
does not survive being read as characters. This script does the conversion
instead, so the only thing the image model has to supply is a lit render of the
subject.

    Usage:  python3 scripts/ascii-art.py <source.png> <target.png> [columns]

Source images want a single subject, isolated on flat white, under a hard
directional key light — a long black-to-white ramp across the form is what the
glyph ramp reads. Flat mid-grey renders convert to flat mid-grey mush. Prompt
for the lighting explicitly; models default to soft and even.

Depends only on the standard library plus macOS `sips` for rescaling, so it
runs with no install step. The two things worth understanding before changing
anything are `foreground()` and the ramp direction — see their comments.
"""

import os
import struct
import subprocess
import sys
import zlib

# Classic density ramp, densest first. The pre-existing assets are built from
# this same set: composite coins.png over a dark fill and its Z, J, Q, C, L, U,
# Y, X, k, b, d, p, q, w, m, O and 0 all come from here.
RAMP = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. "

CELL_WIDTH = 9.0
CELL_HEIGHT = 18.0
FONT_SIZE = CELL_WIDTH / 0.6  # Courier's advance is 0.6em
MASK_SIZE = 320


def read_png(path):
    """Decode an 8-bit non-interlaced PNG to (width, height, channels, bytes)."""
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a png: %s" % path
    position = 8
    compressed = b""
    width = height = color = None
    while position < len(data):
        (length,) = struct.unpack(">I", data[position : position + 4])
        tag = data[position + 4 : position + 8]
        chunk = data[position + 8 : position + 8 + length]
        if tag == b"IHDR":
            width, height, depth, color, _, _, interlace = struct.unpack(
                ">IIBBBBB", chunk
            )
            assert depth == 8 and interlace == 0, "unsupported png: %s" % path
        elif tag == b"IDAT":
            compressed += chunk
        elif tag == b"IEND":
            break
        position += 12 + length

    raw = zlib.decompress(compressed)
    channels = {0: 1, 2: 3, 4: 2, 6: 4}[color]
    stride = width * channels
    out = bytearray(height * stride)
    previous = bytearray(stride)
    cursor = 0
    for y in range(height):
        method = raw[cursor]
        cursor += 1
        line = bytearray(raw[cursor : cursor + stride])
        cursor += stride
        if method == 1:
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 0xFF
        elif method == 2:
            for i in range(stride):
                line[i] = (line[i] + previous[i]) & 0xFF
        elif method == 3:
            for i in range(stride):
                left = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((left + previous[i]) >> 1)) & 0xFF
        elif method == 4:
            for i in range(stride):
                left = line[i - channels] if i >= channels else 0
                up = previous[i]
                corner = previous[i - channels] if i >= channels else 0
                estimate = left + up - corner
                da, db, dc = (
                    abs(estimate - left),
                    abs(estimate - up),
                    abs(estimate - corner),
                )
                nearest = left if (da <= db and da <= dc) else (up if db <= dc else corner)
                line[i] = (line[i] + nearest) & 0xFF
        out[y * stride : (y + 1) * stride] = line
        previous = line
    return width, height, channels, out


def luminance(source, size):
    """Rescale with sips, then read back a normalised luminance grid."""
    tiny = "%s.%dx%d.png" % (source, size[0], size[1])
    subprocess.run(
        ["sips", "-z", str(size[1]), str(size[0]), source, "--out", tiny],
        check=True,
        capture_output=True,
    )
    width, height, channels, pixels = read_png(tiny)
    os.remove(tiny)
    grid = []
    for y in range(height):
        line = []
        for x in range(width):
            i = (y * width + x) * channels
            if channels >= 3:
                r, g, b = pixels[i], pixels[i + 1], pixels[i + 2]
            else:
                r = g = b = pixels[i]
            line.append((0.299 * r + 0.587 * g + 0.114 * b) / 255.0)
        grid.append(line)
    return grid


def foreground(grid, tolerance=0.045):
    """Flood-fill the paper inwards from the border.

    Thresholding on brightness alone loses any part of the subject the key light
    blows out to near-white: the lit half of a crown sits at the same value as
    the paper behind it and simply disappears, leaving a lopsided half-motif.
    Reachability keeps it — that half is bright, but it is not connected to the
    outside. Everything the fill cannot reach is subject.
    """
    height, width = len(grid), len(grid[0])
    border = sorted(
        [grid[0][x] for x in range(width)]
        + [grid[height - 1][x] for x in range(width)]
        + [grid[y][0] for y in range(height)]
        + [grid[y][width - 1] for y in range(height)]
    )
    cutoff = border[len(border) // 2] - tolerance

    seen = [[False] * width for _ in range(height)]
    stack = []
    for x in range(width):
        stack.append((0, x))
        stack.append((height - 1, x))
    for y in range(height):
        stack.append((y, 0))
        stack.append((y, width - 1))
    while stack:
        y, x = stack.pop()
        if seen[y][x] or grid[y][x] < cutoff:
            continue
        seen[y][x] = True
        if y > 0:
            stack.append((y - 1, x))
        if y + 1 < height:
            stack.append((y + 1, x))
        if x > 0:
            stack.append((y, x - 1))
        if x + 1 < width:
            stack.append((y, x + 1))
    return [[not seen[y][x] for x in range(width)] for y in range(height)]


def glyphs(source, columns, rows, coverage=0.34, gamma=0.45):
    """Pick one glyph per cell.

    The ramp runs densest-first and is indexed by brightness, so dark source
    pixels land on `$` and light ones trail off to `'`. Gamma below 1 lifts the
    midtones toward the sparse end; that is what keeps the output as airy as the
    existing assets instead of a solid slab of `$`.
    """
    mask = foreground(luminance(source, (MASK_SIZE, MASK_SIZE)))
    tones = luminance(source, (columns, rows))

    # Fold the mask down to the character grid: a cell is subject if enough of
    # its footprint is.
    step_y = len(mask) / rows
    step_x = len(mask[0]) / columns
    solid = []
    for y in range(rows):
        line = []
        for x in range(columns):
            hits = total = 0
            for my in range(int(y * step_y), int((y + 1) * step_y)):
                for mx in range(int(x * step_x), int((x + 1) * step_x)):
                    total += 1
                    hits += mask[my][mx]
            line.append(bool(total) and hits / total >= coverage)
        solid.append(line)

    values = sorted(
        tones[y][x] for y in range(rows) for x in range(columns) if solid[y][x]
    )
    if not values:
        return []
    black = values[int(len(values) * 0.02)]
    white = values[int(len(values) * 0.98)]
    span = max(white - black, 0.01)

    # Reserve the trailing space so a blown-out highlight still prints a glyph;
    # only the paper is allowed to be empty.
    ink = len(RAMP) - 1
    out = []
    for y in range(rows):
        row = []
        for x in range(columns):
            if not solid[y][x]:
                row.append(" ")
                continue
            level = min(max((tones[y][x] - black) / span, 0.0), 1.0) ** gamma
            row.append(RAMP[min(int(level * ink), ink - 1)])
        out.append("".join(row).rstrip())
    return out


def pdf(rows, path):
    """Set the grid in Courier. A hand-written PDF avoids a font dependency —
    Courier is one of the 14 faces every PDF renderer ships."""
    width = int(max(len(row) for row in rows) * CELL_WIDTH)
    height = int(len(rows) * CELL_HEIGHT)
    content = "BT /F1 %.3f Tf %.3f TL 1 0 0 1 0 %.3f Tm\n" % (
        FONT_SIZE,
        CELL_HEIGHT,
        height - CELL_HEIGHT + 4.5,
    )
    for row in rows:
        escaped = row.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
        content += "(%s) Tj T*\n" % escaped
    content += "ET"
    body = content.encode("latin-1")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %d %d] "
            "/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"
            % (width, height)
        ).encode(),
        ("<< /Length %d >>\nstream\n" % len(body)).encode() + body + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
    ]
    out = b"%PDF-1.4\n"
    offsets = []
    for index, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out += ("%d 0 obj\n" % index).encode() + obj + b"\nendobj\n"
    start = len(out)
    out += ("xref\n0 %d\n" % (len(objects) + 1)).encode() + b"0000000000 65535 f \n"
    for offset in offsets:
        out += ("%010d 00000 n \n" % offset).encode()
    out += (
        "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n"
        % (len(objects) + 1, start)
    ).encode()
    open(path, "wb").write(out)


def whiten(source, target):
    """Black-on-white raster -> white glyphs on transparent, the shape every
    asset in public/images/ascii already has. `PageBanner` and the pricing cards
    recolour from there with `brightness-0` and `invert`."""
    width, height, channels, pixels = read_png(source)
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            i = (y * width + x) * channels
            if channels >= 3:
                r, g, b = pixels[i], pixels[i + 1], pixels[i + 2]
                alpha = pixels[i + 3] if channels == 4 else 255
            else:
                r = g = b = pixels[i]
                alpha = pixels[i + 1] if channels == 2 else 255
            ink = 255 - (0.299 * r + 0.587 * g + 0.114 * b)
            raw += bytes((255, 255, 255, int(ink * alpha / 255)))

    def chunk(tag, payload):
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    out += chunk(b"IEND", b"")
    open(target, "wb").write(out)
    return width, height


def convert(source, target, columns=68):
    # Cells are twice as tall as they are wide, so half as many rows as columns
    # keeps a square source square.
    rows = max(1, round(columns / 2))
    art = [row for row in glyphs(source, columns, rows) if row.strip()]
    if not art:
        raise SystemExit("no subject found in %s — is the background flat?" % source)

    page = "%s.page.pdf" % target
    raster = "%s.page.png" % target
    pdf(art, page)
    subprocess.run(
        ["sips", "-s", "format", "png", page, "--out", raster],
        check=True,
        capture_output=True,
    )
    size = whiten(raster, target)
    os.remove(page)
    os.remove(raster)
    return size, art


if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    size, art = convert(
        sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 68
    )
    print("%s  %dx%dpx  %d rows" % (sys.argv[2], size[0], size[1], len(art)))
    for row in art:
        print(row)
