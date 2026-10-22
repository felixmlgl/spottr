"""Halftone stills from the real demo clips: dot size follows brightness, pipeline skeletons on top.

Writes the site images (public/halftone/*.svg), the share card (public/og.png) and a deck image
(pitch-assets/halftone/squat-3up.png). Needs ffmpeg and Google Chrome (to turn SVG into PNG); stdlib only.

    python3 scripts/halftone.py
"""

import json
import math
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

INK, INK3, NIGHT = "#0E1117", "#636B7E", "#090B10"
DOT, BLUE, LIME = "#C3C9D6", "#4D80FF", "#C7FF6A"
BODY_EDGES = [(5, 6), (5, 7), (7, 9), (6, 8), (8, 10), (5, 11), (6, 12), (11, 12), (11, 13), (13, 15), (12, 14), (14, 16)]

SQUAT = ROOT / "public/videosCorrect/squat.mp4"
FELIX = 2  # the member the squat clip follows
FELIX_BOX = (386, 30, 438, 117)  # his box over the whole set, source pixels


def load(clip):
    d = ROOT / "public/demo-data" / clip
    return json.loads((d / "session.json").read_text()), json.loads((d / "overlay.json").read_text())


def rows_at(overlay, t):
    return min(overlay["frames"], key=lambda f: abs(f["t"] - t))["p"]


def luminance(src, crop, cols, rows, t=None):
    """Grey levels 0..1 of the crop (x, y, w, h), scaled to cols x rows."""
    x, y, w, h = (round(v) for v in crop)
    seek = ["-ss", str(t)] if t is not None else []
    raw = subprocess.run(
        ["ffmpeg", "-loglevel", "error", *seek, "-i", str(src), "-frames:v", "1",
         "-vf", f"crop={w}:{h}:{x}:{y},scale={cols}:{rows}:flags=area", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        capture_output=True, check=True).stdout
    return [b / 255 for b in raw]


def fit(box, aspect, pad, W, H):
    """Crop around box, padded, with width / height = aspect, kept inside the W x H frame."""
    x1, y1, x2, y2 = box
    h = min(H, max(y2 - y1, (x2 - x1) / aspect) * pad)
    w = min(W, h * aspect)
    h = w / aspect
    x = min(max((x1 + x2) / 2 - w / 2, 0), W - w)
    y = min(max((y1 + y2) / 2 - h / 2, 0), H - h)
    return x, y, w, h


def dots(lum, cols, rows, width, color, alpha=1.0, focus=None, floor=0.15):
    """One circle per cell, radius from brightness. focus = (cx, cy, rx, ry): full strength there, fading outside."""
    cell = width / cols
    out = [f'<g fill="{color}">']
    for j in range(rows):
        for i in range(cols):
            v = min(1, max(0, (lum[j * cols + i] - 0.18) / 0.62))
            r = cell / 2 * 0.92 * math.sqrt(v)
            if r < cell * 0.06:
                continue
            cx, cy = (i + 0.5) * cell, (j + 0.5) * cell
            a = alpha
            if focus:
                d = math.hypot((cx - focus[0]) / focus[2], (cy - focus[1]) / focus[3])
                a *= min(1, max(floor, 1.5 - d))
            op = f' fill-opacity="{a:.2f}"' if a < 0.995 else ""
            out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.2f}"{op}/>')
    out.append("</g>")
    return "".join(out)


def skeleton(row, crop, scale, bone=3.0, joint=4.5):
    """Body joints (COCO 5-16) of one overlay row, mapped from source pixels into the image."""
    def pt(i):
        x, y = row[5 + i * 2], row[6 + i * 2]
        return None if (x, y) == (-1, -1) else ((x - crop[0]) * scale, (y - crop[1]) * scale)
    out = [f'<g stroke="{BLUE}" stroke-width="{bone}" stroke-linecap="round">']
    for a, b in BODY_EDGES:
        pa, pb = pt(a), pt(b)
        if pa and pb:
            out.append(f'<line x1="{pa[0]:.1f}" y1="{pa[1]:.1f}" x2="{pb[0]:.1f}" y2="{pb[1]:.1f}"/>')
    out.append(f'</g><g fill="{LIME}" stroke="{INK}" stroke-width="{joint / 3:.2f}">')
    for i in range(5, 17):
        p = pt(i)
        if p:
            out.append(f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{joint}"/>')
    out.append("</g>")
    return "".join(out)


def svg(w, h, body, bg=None, rx=0):
    rect = f'<rect width="{w}" height="{h}" rx="{rx}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{rect}{body}</svg>'


def png(svg_text, out, w, h, scale=1):
    """Screenshot the SVG with headless Chrome."""
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
        f.write(f"<html><meta charset='utf-8'><body style='margin:0;background:{NIGHT}'>{svg_text}</body></html>")
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars", f"--force-device-scale-factor={scale}",
                    f"--window-size={w},{h}", f"--screenshot={out}", f.name], capture_output=True, check=True)


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    print(f"{path.relative_to(ROOT)}  {len(text) // 1024} KB")


def main():
    session, overlay = load("squat")
    W, H = session["width"], session["height"]
    full = (0, 0, W, H)

    # 1. Loading placeholder: the squat frame as quiet grey dots on the light panel
    cols, rows = 80, 44
    write(ROOT / "public/halftone/loading.svg",
          svg(800, 440, dots(luminance(SQUAT, full, cols, rows, 30.0), cols, rows, 800, INK3, alpha=0.45)))

    # 2. Privacy chapter: the busy middle of the floor as dots, plus the body points the pipeline works from
    crop = (230, 10, 400, 225)
    cols, rows = 96, 54
    t = 30.0
    scale = 1100 / crop[2]
    people = "".join(skeleton(r, crop, scale, bone=4, joint=5.5) for r in rows_at(overlay, t) if r[0] > 0)
    write(ROOT / "public/halftone/privacy.svg",
          svg(1100, 619, dots(luminance(SQUAT, crop, cols, rows, t), cols, rows, 1100, DOT, alpha=0.7) + people, NIGHT))

    # 3. Texture inside the contact block: the squat gym floor in logo blue, faded in by CSS
    cols, rows = 128, 70
    write(ROOT / "public/halftone/texture.svg",
          svg(1280, 700, dots(luminance(SQUAT, full, cols, rows, 30.0), cols, rows, 1280, BLUE)))

    # 4. Share card 1200x630: Felix mid-set on the right, the line on the left
    crop = fit(FELIX_BOX, 1.0, 1.25, W, H)
    t, side = 29.9, 630
    s = side / crop[2]
    row = next(r for r in rows_at(overlay, t) if r[0] == FELIX)
    cx, cy = (row[1] + row[3]) / 2, (row[2] + row[4]) / 2
    focus = ((cx - crop[0]) * s, (cy - crop[1]) * s, (row[3] - row[1]) * s * 0.75, (row[4] - row[2]) * s * 0.65)
    felix = f'<g transform="translate(570 0)">{dots(luminance(SQUAT, crop, 56, 56, t), 56, 56, side, DOT, focus=focus)}{skeleton(row, crop, s, 6, 9)}</g>'
    text = (f'<text x="72" y="250" fill="#FFFFFF" font-family="Georgia, serif" font-size="64">Your gym\'s cameras</text>'
            f'<text x="72" y="330" fill="#FFFFFF" font-family="Georgia, serif" font-size="64">count every rep.</text>'
            f'<text x="72" y="420" fill="{LIME}" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="600">Spottr · tryspottr.app</text>')
    png(svg(1200, 630, felix + text, NIGHT), ROOT / "public/og.png", 1200, 630)
    print("public/og.png")

    # 5. Deck: top / bottom / rep counted, like a contact sheet
    crop = fit(FELIX_BOX, 3 / 4, 1.3, W, H)
    pw, ph, gap = 360, 480, 24
    s = pw / crop[2]
    sets = next(p for p in session["people"] if p["id"] == FELIX)["sets"][0]
    panels = []
    for k, (t, label) in enumerate([(28.0, "TOP"), (29.9, "BOTTOM"), (30.7, "REP COUNTED")]):
        row = next(r for r in rows_at(overlay, t) if r[0] == FELIX)
        cx, cy = (row[1] + row[3]) / 2, (row[2] + row[4]) / 2
        focus = ((cx - crop[0]) * s, (cy - crop[1]) * s, (row[3] - row[1]) * s * 0.75, (row[4] - row[2]) * s * 0.65)
        reps = sum(rt <= t for rt in sets["rep_times_s"])
        pill = (f'<rect x="{pw - 186}" y="16" width="170" height="36" rx="18" fill="{BLUE}"/>'
                f'<text x="{pw - 101}" y="40" fill="#FFFFFF" text-anchor="middle" font-family="Menlo, monospace" font-size="15">'
                f'SQUAT · {reps} / {sets["reps"]}</text>') if k == 2 else ""
        tag = (f'<text x="18" y="{ph - 20}" fill="{LIME if k == 2 else "#FFFFFF"}" font-family="Menlo, monospace" '
               f'font-size="15" letter-spacing="1">{label}</text>')
        panels.append(f'<g transform="translate({k * (pw + gap)} 0)"><rect width="{pw}" height="{ph}" rx="20" fill="{NIGHT}"/>'
                      f'{dots(luminance(SQUAT, crop, 40, 53, t), 40, 53, pw, DOT, focus=focus)}{skeleton(row, crop, s, 4, 6)}{pill}{tag}</g>')
    w = 3 * pw + 2 * gap
    png(svg(w, ph, "".join(panels)), ROOT / "pitch-assets/halftone/squat-3up.png", w, ph, scale=2)
    print("pitch-assets/halftone/squat-3up.png")


if __name__ == "__main__":
    main()
