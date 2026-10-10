"""Ground-truth review helper.

Renders both cameras side by side at fixed steps with *camera-local* track IDs only (never the system's
global IDs, so the reviewer is not biased by the output being evaluated). The reviewer then writes
data/ground_truth/<segment>.json mapping local tracks to real people (see docs/EVALUATION.md).

  python -m spottr_world.gt_tool sheet out/great_hall 30 90 4 <video1> <video2>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np

from .rawio import load_raw

PALETTE = [(48, 199, 89), (0, 149, 255), (255, 122, 0), (222, 82, 175), (48, 59, 255), (250, 200, 90),
           (0, 204, 255), (214, 86, 88), (94, 132, 162), (85, 45, 255), (160, 160, 40), (40, 160, 160)]


def sheet(run_dir: Path, t0: float, t1: float, step: float, videos: list[str]) -> list[Path]:
    calib = json.loads((run_dir / "calibration.json").read_text()) if (run_dir / "calibration.json").exists() else None
    offsets = calib["sync"]["offsets_s"] if calib else {"cam1": 0.0, "cam2": 0.0}
    cams = ["cam1", "cam2"]
    obs = {c: load_raw(run_dir, c, derive=False) for c in cams}
    out_dir = run_dir / "gt_sheets"
    out_dir.mkdir(exist_ok=True)
    caps = {c: cv2.VideoCapture(v) for c, v in zip(cams, videos)}
    paths = []
    for t in np.arange(t0, t1 + 1e-6, step):
        panels = []
        for c in cams:
            tl = t - offsets[c]
            caps[c].set(cv2.CAP_PROP_POS_MSEC, tl * 1000)
            ok, img = caps[c].read()
            near = {}
            for o in obs[c]:
                if abs(o["t_local"] - tl) <= 0.07:
                    near[o["local_track_id"]] = o
            for tid, o in near.items():
                x1, y1, x2, y2 = [int(v) for v in o["bbox"]]
                col = PALETTE[tid % len(PALETTE)]
                cv2.rectangle(img, (x1, y1), (x2, y2), col, 2)
                cv2.rectangle(img, (x1, y1 - 18), (x1 + 52, y1), col, -1)
                cv2.putText(img, f"{c[-1]}:{tid}", (x1 + 2, y1 - 4), 0, 0.5, (255, 255, 255), 1)
            cv2.putText(img, f"{c}  t={t:.1f}s", (10, 30), 0, 0.9, (255, 255, 255), 2)
            panels.append(img[120:, :])
        p = out_dir / f"gt_{t:06.1f}.jpg"
        cv2.imwrite(str(p), cv2.resize(np.hstack(panels), None, fx=0.75, fy=0.75), [cv2.IMWRITE_JPEG_QUALITY, 88])
        paths.append(p)
    return paths


def track_strips(run_dir: Path, t0: float, t1: float, videos: list[str], per_track: int = 10) -> Path:
    """One row per local track in [t0, t1]: crops sampled along it with shared-time stamps.

    This is the second review pass: clothing across a whole track exposes tracker swaps and duplicate
    boxes that frame sheets at a few-second spacing miss.
    """
    calib = json.loads((run_dir / "calibration.json").read_text())
    offsets = calib["sync"]["offsets_s"]
    rows = []
    for cam, vid in zip(("cam1", "cam2"), videos):
        obs = load_raw(run_dir, cam, derive=False)
        by: dict[int, list[dict]] = {}
        for o in obs:
            if t0 <= o["t_local"] + offsets[cam] <= t1:
                by.setdefault(o["local_track_id"], []).append(o)
        cap = cv2.VideoCapture(vid)
        for tid, mine in sorted(by.items()):
            pick = [mine[i] for i in np.linspace(0, len(mine) - 1, min(per_track, len(mine))).astype(int)]
            cells = []
            for o in pick:
                cap.set(cv2.CAP_PROP_POS_MSEC, o["t_local"] * 1000)
                ok, f = cap.read()
                x1, y1, x2, y2 = [int(v) for v in o["bbox"]]
                c = f[max(0, y1):max(y2, y1 + 2), max(0, x1):max(x2, x1 + 2)]
                c = cv2.resize(c, (64, 110))
                cv2.putText(c, f"{o['t_local'] + offsets[cam]:.0f}", (2, 105), 0, 0.4, (0, 255, 255), 1)
                cells.append(c)
            cells += [np.zeros((110, 64, 3), np.uint8)] * (per_track - len(cells))
            lab = np.zeros((110, 96, 3), np.uint8)
            cv2.putText(lab, f"{cam}:{tid}", (2, 40), 0, 0.5, (255, 255, 255), 1)
            b = mine[len(mine) // 2]["bbox"]
            cv2.putText(lab, f"x{int((b[0] + b[2]) / 2)} y{int(b[3])}", (2, 70), 0, 0.4, (180, 180, 180), 1)
            rows.append(np.hstack([lab] + cells))
    out = run_dir / "gt_sheets" / f"tracks_{t0:.0f}_{t1:.0f}.jpg"
    out.parent.mkdir(exist_ok=True)
    cv2.imwrite(str(out), np.vstack(rows))
    return out


if __name__ == "__main__":
    if sys.argv[1] == "sheet":
        for p in sheet(Path(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6:8]):
            print(p)
    elif sys.argv[1] == "tracks":
        print(track_strips(Path(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), sys.argv[5:7]))
