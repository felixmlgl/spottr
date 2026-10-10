"""API payloads built from a processed run. Used by the HTTP API (api.py) and the static export (export.py),
so the frontend sees exactly the same schema whether it talks to a live service or to exported files.
Schema reference: docs/SCHEMA.md.
"""
from __future__ import annotations

import bisect
import gzip
import json
from functools import lru_cache
from pathlib import Path

API_VERSION = "spottr.world/1"

DISPLAY_STATES = ("Confirmed", "Tracking", "Needs confirmation")


class Run:
    """Read-only access to one processed run (out/<run>/)."""

    def __init__(self, run_dir: Path, calibration_path: Path | None = None):
        self.dir = Path(run_dir)
        self.calibration = json.loads(((calibration_path or self.dir / "calibration.json")).read_text())
        self.metrics = json.loads((self.dir / "metrics.json").read_text())
        self._frames: list[dict] | None = None
        self._ticks: list[int] = []
        self._cam: dict[str, tuple[list[int], list[dict]]] = {}

    # ------------------------------------------------------------------ loading
    def frames(self) -> list[dict]:
        if self._frames is None:
            with gzip.open(self.dir / "world_state.jsonl.gz", "rt") as f:
                self._frames = [json.loads(line) for line in f]
            self._ticks = [fr["tick"] for fr in self._frames]
        return self._frames

    def camera_rows(self, camera_id: str) -> tuple[list[int], list[dict]]:
        if camera_id not in self._cam:
            p = self.dir / "camera_obs" / f"{camera_id}.jsonl.gz"
            if not p.exists():
                raise KeyError(camera_id)
            with gzip.open(p, "rt") as f:
                rows = [json.loads(line) for line in f]
            self._cam[camera_id] = ([r["tick"] for r in rows], rows)
        return self._cam[camera_id]

    @property
    def tick_s(self) -> float:
        return self.metrics["tick_s"]

    def _nearest(self, ticks: list[int], t: float) -> int:
        k = round(t / self.tick_s)
        i = bisect.bisect_left(ticks, k)
        if i >= len(ticks):
            return len(ticks) - 1
        if i > 0 and abs(ticks[i - 1] - k) < abs(ticks[i] - k):
            return i - 1
        return i

    # ------------------------------------------------------------------ payloads
    def world_map_config(self, media_base: str = "") -> dict:
        cal = self.calibration
        fm = cal["floor_map"]
        return {
            "api_version": API_VERSION,
            "site": {"name": cal["site"], "label": "Great Hall", "anonymised": True},
            "units": "m",
            "frame": cal.get("frame"),
            "floor_map": {
                "width_m": fm["width_m"], "height_m": fm["height_m"],
                "outline": fm.get("outline"),
                "walls": fm.get("walls", {}),
                "landmarks": fm.get("landmarks", []),
                "scale_note": fm.get("scale_note"),
            },
            "cameras": [{
                "camera_id": c["camera_id"],
                "label": c["label"],
                "position": c["position_world"],
                "heading_deg": c["heading_deg"],
                "fov_deg": c["horizontal_fov_deg"],
                "coverage_polygon": c["coverage_polygon_world"],
                "image_size": c["image_size"],
                "plate_url": f"{media_base}plates/{c['camera_id']}.jpg",
                "landmarks_px": c.get("landmarks", []),
                "homography_image_to_world": c["homography_image_to_world"],
                "calibration_quality": c.get("quality"),
                "camera_model": {k: c["camera_model"][k] for k in ("fx", "pitch_deg", "roll_deg", "height_m")},
            } for c in cal["cameras"]],
            "calibration": {
                "calibration_id": cal["calibration_id"],
                "quality": cal.get("quality", {}),
                "method": cal["cross_camera_alignment"]["method"],
            },
            "sync": {k: cal["sync"][k] for k in ("reference_camera", "offsets_s", "method", "confidence")},
            "tick_s": self.tick_s,
            "decision_lag_s": self.metrics["decision_lag_s"],
            "display_states": list(DISPLAY_STATES),
        }

    def timeline(self, media_base: str = "", segments: list[dict] | None = None, clips: bool = False) -> dict:
        """clips=False: full source videos, video time = shared time - offset.
        clips=True: one exported clip per camera and segment, video time = shared time - segment start."""
        frames = self.frames()
        events = json.loads((self.dir / "events.json").read_text())
        keep = {"cross_camera_link", "reacquired", "identities_merged", "link_revoked", "ambiguous_reacquisition", "identity_split"}
        return {
            "api_version": API_VERSION,
            "t_start": frames[0]["t"], "t_end": frames[-1]["t"], "tick_s": self.tick_s,
            "cameras": [{
                "camera_id": c["camera_id"], "label": c["label"],
                "offset_s": self.calibration["sync"]["offsets_s"][c["camera_id"]],
                "video_url": None if clips else f"{media_base}video/{c['camera_id']}.mp4",
                "video_start_s": None if clips else self.calibration["sync"]["offsets_s"][c["camera_id"]],
            } for c in self.calibration["cameras"]],
            "segments": segments or [],
            "events": [_public_event(e) for e in events if e["type"] in keep],
        }

    def world_state(self, t: float) -> dict:
        frames = self.frames()
        fr = frames[self._nearest(self._ticks, t)]
        return dict(compact_frame(fr), api_version=API_VERSION)

    def world_state_range(self, t0: float, t1: float, step: int = 1) -> dict:
        frames = self.frames()
        a = self._nearest(self._ticks, t0)
        b = self._nearest(self._ticks, t1)
        return {"api_version": API_VERSION, "tick_s": self.tick_s * step,
                "frames": [compact_frame(f) for f in frames[a:b + 1:step]]}

    def camera_observations(self, camera_id: str, t: float, keypoints: bool = False) -> dict:
        ticks, rows = self.camera_rows(camera_id)
        r = rows[self._nearest(ticks, t)]
        return dict(compact_camera_row(r, keypoints), camera_id=camera_id, api_version=API_VERSION)

    def camera_observations_range(self, camera_id: str, t0: float, t1: float, keypoints: bool = False) -> dict:
        ticks, rows = self.camera_rows(camera_id)
        a, b = self._nearest(ticks, t0), self._nearest(ticks, t1)
        return {"api_version": API_VERSION, "camera_id": camera_id,
                "rows": [compact_camera_row(r, keypoints) for r in rows[a:b + 1]]}

    def identity(self, gid: str) -> dict:
        n = int(gid.lstrip("g"))
        events = json.loads((self.dir / "events.json").read_text())
        mine = [_public_event(e) for e in events if e.get("gid") == n or e.get("absorbed") == n]
        return {"api_version": API_VERSION, "global_person_id": gid, "label": f"Person {n:02d}", "events": mine}

    def metrics_payload(self) -> dict:
        ev = {}
        for p in sorted(self.dir.glob("evaluation_*.json")):
            ev[p.stem.replace("evaluation_", "")] = json.loads(p.read_text())
        return {"api_version": API_VERSION, "processing": self.metrics, "evaluation": ev,
                "calibration_quality": self.calibration.get("quality", {}),
                "sync": {k: v for k, v in self.calibration["sync"].items() if k != "scan"}}


def compact_frame(f: dict) -> dict:
    """WorldState frame (docs/SCHEMA.md). Positions in metres on the floor map; heading in map degrees."""
    return {"t": f["t"], "people": [{
        "global_person_id": p["global_person_id"], "label": p["label"], "x": p["x"], "y": p["y"],
        "vx": p["vx"], "vy": p["vy"], "speed_mps": p["speed_mps"], "heading_deg": p["heading_deg"],
        "camera_ids": p["camera_ids"], "local_track_ids": p["local_track_ids"],
        "identity_confidence": p["identity_confidence"], "state": p["state"], "display_state": p["display_state"],
        "evidence": _compact_evidence(p["evidence"]), "last_observed_t": p["last_observed_t"],
    } for p in f["people"]]}


def _compact_evidence(e: dict) -> dict:
    out = {"supported_by": e["supported_by"], "cameras_now": e["cameras_now"]}
    if e["links"]:
        l = e["links"][0]
        out["link"] = {k: l.get(k) for k in ("type", "tracklets", "confidence", "floor_distance_m", "overlap_s",
                                              "appearance_similarity", "gap_s", "distance_m") if l.get(k) is not None}
    if e["ambiguous_with"]:
        out["ambiguous_with"] = [a.get("gid") for a in e["ambiguous_with"] if a.get("gid") is not None]
    return out


def compact_camera_row(r: dict, keypoints: bool = False) -> dict:
    obs = []
    for o in r["observations"]:
        d = {"local_track_id": o["local_track_id"], "tracklet": o["tracklet"], "bbox": [round(v) for v in o["bbox"]],
             "det_conf": o["det_conf"], "floor_point_px": [round(v) for v in o["floor_point_px"]],
             "floor_method": o["floor_method"], "world": o["world"], "global_person_id": o["global_person_id"],
             "label": o["label"], "display_state": o["display_state"], "quality_flags": o["quality_flags"]}
        if keypoints:
            d["keypoints"] = o["keypoints"]
        obs.append(d)
    return {"t": r["t"], "t_local": r["t_local"], "observations": obs}


def _public_event(e: dict) -> dict:
    out = {"t": e["t"], "type": e["type"]}
    for k in ("link", "gid", "absorbed", "label", "tracklet", "reason", "confidence"):
        if k in e:
            out[k] = e[k]
    if "gid" in e and "label" not in e:
        out["label"] = f"Person {e['gid']:02d}"
    ev = e.get("evidence")
    if isinstance(ev, dict):
        out["evidence"] = {k: ev[k] for k in ("geo", "motion", "app", "app_sim", "overlap_s", "mean_dist_m", "margin",
                                              "gap_s", "dist_m", "mode") if k in ev and ev[k] is not None}
    if "candidates" in e:
        out["candidates"] = [{"gid": c["gid"], "score": c["score"], "need": c["need"]} for c in e["candidates"]]
    return out


@lru_cache(maxsize=4)
def open_run(run_dir: str, calibration_path: str | None = None) -> Run:
    return Run(Path(run_dir), Path(calibration_path) if calibration_path else None)
