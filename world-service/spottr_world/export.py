"""Export a processed run as static API responses for the gym-pilot frontend (no Python server on Vercel).

  python -m spottr_world.export            -> ../public/world-demo/

Files mirror the HTTP API one-to-one (same payload builders in views.py):
  config.json                   = GET /world-map/config
  timeline.json                 = GET /playback/timeline (+ demo segments with clip URLs)
  segments/<id>/world.json      = GET /world-state/range?from=&to=
  segments/<id>/<cam>.json      = GET /camera-observations/range?cameraId=&from=&to=
  segments/<id>/<cam>.mp4       trimmed clip; video time 0 = segment start on the shared timeline
  metrics.json                  = GET /metrics
  plates/<cam>.jpg              background plates (calibration backdrop)
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

from .views import Run

SERVICE_ROOT = Path(__file__).resolve().parent.parent

SEGMENTS = [
    {"id": "arrivals", "title": "Arrivals", "from_s": 440.0, "to_s": 500.0,
     "summary": "A group walks in under one camera and crosses the room in view of both."},
    {"id": "settling", "title": "Settling in", "from_s": 30.0, "to_s": 90.0,
     "summary": "People walk in, sit down and get up again; one camera often loses them behind furniture."},
]

CLIP_SCRIPT = r'''
import av, sys, json, numpy as np
src, dst, t0, t1, w = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5])
heads = json.load(open(sys.argv[6]))  # [[t_local, [[x1,y1,x2,y2], ...]], ...] sorted by time
ht = np.array([h[0] for h in heads]) if heads else np.zeros(0)

def pixelate(img, boxes):
    H, W = img.shape[:2]
    for x1, y1, x2, y2 in boxes:
        x1, y1, x2, y2 = max(0, int(x1)), max(0, int(y1)), min(W, int(x2)), min(H, int(y2))
        if x2 - x1 < 2 or y2 - y1 < 2:
            continue
        roi = img[y1:y2, x1:x2]
        k = max(2, (x2 - x1) // 5)
        small = roi[::k, ::k]
        img[y1:y2, x1:x2] = np.repeat(np.repeat(small, k, 0), k, 1)[: y2 - y1, : x2 - x1]
    return img
inp = av.open(src); vs = inp.streams.video[0]
out = av.open(dst, "w", options={"movflags": "faststart"})
os_ = out.add_stream("libx264", rate=30)
h = int(round(vs.codec_context.height * w / vs.codec_context.width / 2) * 2)
os_.width, os_.height, os_.pix_fmt = w, h, "yuv420p"
os_.options = {"crf": "28", "preset": "slow", "g": "30"}
inp.seek(int(max(0, t0 - 2) / vs.time_base), stream=vs)
n = 0
for f in inp.decode(vs):
    t = float(f.pts * vs.time_base)
    if t < t0 - 1e-3:
        continue
    if t > t1:
        break
    if len(ht):
        i = int(np.argmin(np.abs(ht - t)))
        if abs(ht[i] - t) <= 0.07:
            f = av.VideoFrame.from_ndarray(pixelate(f.to_ndarray(format="rgb24"), heads[i][1]), format="rgb24")
    g = f.reformat(width=w, height=h, format="yuv420p")
    g.pts = n; g.time_base = __import__("fractions").Fraction(1, 30); n += 1
    for p in os_.encode(g):
        out.mux(p)
for p in os_.encode():
    out.mux(p)
out.close()
print(n)
'''


PLATE_SCRIPT = r'''
import sys, json, cv2
img = cv2.imread(sys.argv[1])
for x1, y1, x2, y2 in json.loads(sys.argv[3]):
    x1, y1, x2, y2 = max(0, x1), max(0, y1), min(img.shape[1], x2), min(img.shape[0], y2)
    if x2 - x1 > 2 and y2 - y1 > 2:
        roi = img[y1:y2, x1:x2]
        k = max(2, (x2 - x1) // 5)
        img[y1:y2, x1:x2] = cv2.resize(cv2.resize(roi, ((x2 - x1) // k + 1, (y2 - y1) // k + 1)), (x2 - x1, y2 - y1),
                                       interpolation=cv2.INTER_NEAREST)
cv2.imwrite(sys.argv[2], img, [cv2.IMWRITE_JPEG_QUALITY, 88])
'''


def persistent_heads(run_dir: Path, camera_id: str, min_s: float = 20.0) -> list:
    """Median head box of every track present for >= min_s: people who sit long enough to show up in the
    median background plate get pixelated there too."""
    import numpy as np

    from .rawio import load_raw

    by: dict[int, list] = {}
    for o in load_raw(run_dir, camera_id, derive=False):
        by.setdefault(o["local_track_id"], []).append(o)
    out = []
    for obs in by.values():
        if obs[-1]["t_local"] - obs[0]["t_local"] < min_s:
            continue
        boxes = np.array(head_boxes_for(obs), float)
        if len(boxes):
            centres = (boxes[:, :2] + boxes[:, 2:]) / 2
            b = np.median(boxes, axis=0)
            spread = np.median(np.linalg.norm(centres - np.median(centres, axis=0), axis=1))
            if spread > 0.35 * (b[2] - b[0]):
                continue  # moved around: the median plate does not show them
            pad = 0.25 * (b[2] - b[0])
            out.append([int(b[0] - pad), int(b[1] - pad), int(b[2] + pad), int(b[3] + pad)])
    return out


def head_boxes_for(obs: list[dict]) -> list:
    out = []
    for o in obs:
        x1, y1, x2, y2 = o["bbox"]
        bw = x2 - x1
        pts = [k for k in (o["keypoints"] or [])[:5] if k[2] >= 0.3]
        if len(pts) >= 2:
            cx = sum(k[0] for k in pts) / len(pts)
            cy = sum(k[1] for k in pts) / len(pts)
            r = max(0.32 * bw, 1.2 * max(max(k[0] for k in pts) - min(k[0] for k in pts), 8))
        else:
            cx, cy, r = (x1 + x2) / 2, y1 + 0.12 * (y2 - y1), 0.4 * bw
        out.append([round(cx - r), round(cy - r * 1.1), round(cx + r), round(cy + r)])
    return out


def head_boxes(run_dir: Path, camera_id: str, t0: float, t1: float) -> list:
    """Head regions of every detected person (pose nose/eyes/ears, else top of the box) for pixelation.

    Only people the detector found are covered; anyone it missed stays visible in the clip.
    """
    from .rawio import load_raw

    by_t: dict[float, list] = {}
    for o in load_raw(run_dir, camera_id, derive=False):
        if not (t0 <= o["t_local"] <= t1):
            continue
        by_t.setdefault(o["t_local"], []).extend(head_boxes_for([o]))
    return [[t, b] for t, b in sorted(by_t.items())]


def export(run_dir: Path, out_dir: Path, videos: dict[str, str] | None, width: int = 854) -> None:
    run = Run(run_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    w = lambda p, d: (out_dir / p).parent.mkdir(parents=True, exist_ok=True) or (out_dir / p).write_text(
        json.dumps(d, separators=(",", ":")))
    w("config.json", run.world_map_config(media_base=""))
    segs = []
    for s in SEGMENTS:
        sid = s["id"]
        w(f"segments/{sid}/world.json", run.world_state_range(s["from_s"], s["to_s"]))
        clips = {}
        for c in run.calibration["cameras"]:
            cid = c["camera_id"]
            w(f"segments/{sid}/{cid}.json", run.camera_observations_range(cid, s["from_s"], s["to_s"]))
            clip = out_dir / "segments" / sid / f"{cid}.mp4"
            if videos and not clip.exists():
                off = run.calibration["sync"]["offsets_s"][cid]
                # local time = shared time - offset, so both clips start at the same shared instant
                heads_path = clip.with_suffix(".heads.json")
                heads_path.write_text(json.dumps(head_boxes(run_dir, cid, s["from_s"] - off - 0.2, s["to_s"] - off + 0.2)))
                r = subprocess.run([sys.executable, "-c", CLIP_SCRIPT, videos[cid], str(clip),
                                    str(s["from_s"] - off), str(s["to_s"] - off), str(width), str(heads_path)],
                                   capture_output=True, text=True)
                heads_path.unlink()
                if r.returncode != 0:
                    raise RuntimeError(r.stderr[-2000:])
                print(f"  clip {clip.relative_to(out_dir)}: {r.stdout.strip()} frames, {clip.stat().st_size / 1e6:.1f} MB")
            clips[cid] = f"segments/{sid}/{cid}.mp4"
        segs.append(dict(s, world_url=f"segments/{sid}/world.json",
                         camera_urls={c["camera_id"]: f"segments/{sid}/{c['camera_id']}.json" for c in run.calibration["cameras"]},
                         clip_urls=clips, clip_start_s=s["from_s"]))
    w("timeline.json", run.timeline(media_base="", segments=segs, clips=True))
    w("metrics.json", run.metrics_payload())
    for c in run.calibration["cameras"]:
        cid = c["camera_id"]
        src = run_dir / "plates" / f"{cid}.jpg"
        if src.exists():
            (out_dir / "plates").mkdir(exist_ok=True)
            r = subprocess.run([sys.executable, "-c", PLATE_SCRIPT, str(src), str(out_dir / "plates" / f"{cid}.jpg"),
                                json.dumps(persistent_heads(run_dir, cid))], capture_output=True, text=True)
            if r.returncode != 0:
                raise RuntimeError(r.stderr[-2000:])
    total = sum(f.stat().st_size for f in out_dir.rglob("*") if f.is_file())
    print(f"exported to {out_dir} ({total / 1e6:.1f} MB)")


if __name__ == "__main__":
    from .pipeline import default_video_dir, find_videos

    ap = argparse.ArgumentParser()
    ap.add_argument("--run", default="great_hall")
    ap.add_argument("--out", default=str(SERVICE_ROOT.parent / "public" / "world-demo"))
    ap.add_argument("--video-dir", default=default_video_dir())
    ap.add_argument("--no-video", action="store_true")
    a = ap.parse_args()
    vids = None if a.no_video else {c["camera_id"]: c["video"] for c in find_videos(a.video_dir)}
    export(SERVICE_ROOT / "out" / a.run, Path(a.out), vids)
