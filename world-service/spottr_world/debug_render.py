"""Developer visual checks (not used by the API).

  python -m spottr_world.debug_render birdseye  out/great_hall calibration.json  -> birdseye.png
  python -m spottr_world.debug_render frame     out/great_hall <t> <video1> <video2> -> frame_<t>.jpg
"""
from __future__ import annotations

import gzip
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np

from .calibration import apply_h
from .rawio import load_raw

PX_PER_M = 50
COLORS = [(52, 199, 89), (255, 149, 0), (0, 122, 255), (175, 82, 222), (255, 59, 48), (90, 200, 250),
          (255, 204, 0), (88, 86, 214), (162, 132, 94), (255, 45, 85)]


def _canvas(doc):
    W = int(doc["floor_map"]["width_m"] * PX_PER_M) + 2 * PX_PER_M * 6
    H = int(doc["floor_map"]["height_m"] * PX_PER_M) + 2 * PX_PER_M * 6
    img = np.full((H, W, 3), 250, np.uint8)
    off = np.array([PX_PER_M * 6, PX_PER_M * 6])
    to = lambda p: tuple(int(v) for v in (np.asarray(p) * PX_PER_M + off))
    for x in range(-6, int(doc["floor_map"]["width_m"]) + 7):
        cv2.line(img, to((x, -6)), to((x, doc["floor_map"]["height_m"] + 6)), (235, 235, 235), 1)
    for y in range(-6, int(doc["floor_map"]["height_m"]) + 7):
        cv2.line(img, to((-6, y)), to((doc["floor_map"]["width_m"] + 6, y)), (235, 235, 235), 1)
    for c, col in zip(doc["cameras"], [(0, 122, 255), (255, 149, 0)]):
        poly = np.array([to(p) for p in c["coverage_polygon_world"]], np.int32)
        cv2.polylines(img, [poly], True, col[::-1], 1)
        pos = c["position_world"]
        cv2.circle(img, to(pos), 8, col[::-1], -1)
        for d in (-c["horizontal_fov_deg"] / 2, c["horizontal_fov_deg"] / 2):
            a = math.radians(c["heading_deg"] + d)
            cv2.line(img, to(pos), to((pos[0] + 8 * math.cos(a), pos[1] + 8 * math.sin(a))), col[::-1], 1)
        cv2.putText(img, c["camera_id"], to((pos[0] + 0.3, pos[1] - 0.3)), 0, 0.6, col[::-1], 2)
    return img, to


def birdseye(run_dir: Path, calib_path: Path) -> Path:
    doc = json.loads(Path(calib_path).read_text())
    img, to = _canvas(doc)
    for c, col in zip(doc["cameras"], [(0, 122, 255), (255, 149, 0)]):
        obs = load_raw(run_dir, c["camera_id"])
        H = np.asarray(c["homography_image_to_world"])
        px = np.array([o["floor_point_px"] for o in obs[::3]])
        w = apply_h(H, px)
        for p in w:
            if np.all(np.isfinite(p)):
                cv2.circle(img, to(p), 1, col[::-1], -1)
    out = run_dir / "birdseye.png"
    cv2.imwrite(str(out), img)
    return out


def frame(run_dir: Path, t: float, videos: list[str]) -> Path:
    """Both camera frames at shared time t with resolved identities, plus the bird's-eye map."""
    doc = json.loads((run_dir / "calibration.json").read_text())
    tick = int(round(t / 0.2))
    world = cam_rows = None
    with gzip.open(run_dir / "world_state.jsonl.gz", "rt") as f:
        for line in f:
            r = json.loads(line)
            if r["tick"] == tick:
                world = r
                break
    cam_rows = {}
    for c in doc["cameras"]:
        with gzip.open(run_dir / "camera_obs" / f"{c['camera_id']}.jsonl.gz", "rt") as f:
            for line in f:
                r = json.loads(line)
                if r["tick"] == tick:
                    cam_rows[c["camera_id"]] = r
                    break
    color_of = lambda g: COLORS[int(g[1:]) % len(COLORS)][::-1] if g else (160, 160, 160)
    panels = []
    for c, vid in zip(doc["cameras"], videos):
        cap = cv2.VideoCapture(vid)
        cap.set(cv2.CAP_PROP_POS_MSEC, (t - c["time_offset_s"]) * 1000)
        ok, img = cap.read()
        for o in cam_rows.get(c["camera_id"], {}).get("observations", []):
            x1, y1, x2, y2 = [int(v) for v in o["bbox"]]
            col = color_of(o["global_person_id"])
            cv2.rectangle(img, (x1, y1), (x2, y2), col, 2)
            cv2.circle(img, tuple(int(v) for v in o["floor_point_px"]), 4, col, -1)
            lab = f"{o['label'] or '?'} ({c['camera_id']}:{o['local_track_id']})"
            cv2.putText(img, lab, (x1, y1 - 4), 0, 0.45, col, 1)
        panels.append(img)
    bev, to = _canvas(doc)
    for p in (world or {}).get("people", []):
        col = color_of(p["global_person_id"])
        cv2.circle(bev, to((p["x"], p["y"])), 9, col, -1 if p["state"] == "active" else 2)
        cv2.putText(bev, f"{p['label']} {p['display_state'] or p['state']}", to((p["x"] + 0.25, p["y"])), 0, 0.45, col, 1)
    bev = cv2.resize(bev, (int(bev.shape[1] * 720 / bev.shape[0]), 720))
    out = run_dir / f"frame_{t:07.1f}.jpg"
    cv2.imwrite(str(out), np.hstack(panels + [bev]))
    return out


if __name__ == "__main__":
    if sys.argv[1] == "birdseye":
        print(birdseye(Path(sys.argv[2]), Path(sys.argv[3])))
    else:
        print(frame(Path(sys.argv[2]), float(sys.argv[3]), sys.argv[4:6]))
