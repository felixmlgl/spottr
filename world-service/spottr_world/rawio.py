"""Reading the immutable raw-observation layer."""
from __future__ import annotations

import gzip
import json
from pathlib import Path

from .observation import refresh_floor


def load_raw(run_dir: str | Path, camera_id: str, derive: bool = True) -> list[dict]:
    """Raw observations; with derive=True, floor points are re-derived from the stored keypoints
    (the file on disk is never modified)."""
    with gzip.open(Path(run_dir) / "raw" / f"{camera_id}.jsonl.gz", "rt") as f:
        obs = [json.loads(line) for line in f]
    if derive:
        meta_p = Path(run_dir) / "raw" / f"{camera_id}.meta.json"
        w, h = 1280, 720
        if meta_p.exists():
            v = json.loads(meta_p.read_text()).get("video", {})
            w, h = v.get("width", w), v.get("height", h)
        for o in obs:
            o["floor_point_px_raw"] = o["floor_point_px"]
            refresh_floor(o, w, h)
    return obs


def load_meta(run_dir: str | Path, camera_id: str) -> dict:
    return json.loads((Path(run_dir) / "raw" / f"{camera_id}.meta.json").read_text())
