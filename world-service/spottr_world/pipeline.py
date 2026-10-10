"""End-to-end Great Hall demo pipeline.

  python -m spottr_world.pipeline --video-dir "../video material"            # everything after tracking
  python -m spottr_world.pipeline --video-dir "../video material" --track    # also (re)run detection/tracking
  python -m spottr_world.pipeline ... --offset -0.2                          # manual time-offset override

Outputs (out/<run>/):
  raw/<cam>.jsonl.gz            immutable raw observations (track stage)
  calibration.json              calibration actually used for this run
  world_state.jsonl.gz          one shared world-state frame per tick (5 Hz)
  camera_obs/<cam>.jsonl.gz     per-camera observations per tick, with the identity they resolved to
  events.json                   identity audit log (links, revocations, re-acquisitions, merges, splits)
  tracklets.json                tracklet summaries
  metrics.json                  processing, calibration, sync and association statistics
"""
from __future__ import annotations

import argparse
import glob
import gzip
import json
import os
import time
from pathlib import Path

import cv2
import numpy as np

from . import calibration as cal
from .appearance import white_balance_gains
from .association import Coverage, build_pair_evidence
from .identity import LAG_S, IdentityResolver
from .rawio import load_meta, load_raw
from .tracklets import TICK_S, build_tracklets, project_observations

SERVICE_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CALIBRATION = SERVICE_ROOT / "data" / "calibration" / "great_hall.json"

CAMERAS = [
    {"camera_id": "cam1", "label": "Perspective 1", "pattern": "*erspective 1 Great Hall*"},
    {"camera_id": "cam2", "label": "Perspective 2", "pattern": "*erspective2 Great Hall*"},
]


def default_video_dir() -> str:
    """SPOTTR_VIDEO_DIR, else the first of the usual folder names next to the service that exists."""
    env = os.environ.get("SPOTTR_VIDEO_DIR")
    if env:
        return env
    for name in ("video material", "spottr video materials", "video materials"):
        d = SERVICE_ROOT.parent / name
        if d.is_dir():
            return str(d)
    return str(SERVICE_ROOT.parent / "video material")


def find_videos(video_dir: str) -> list[dict]:
    out = []
    for c in CAMERAS:
        hits = sorted(p for p in glob.glob(str(Path(video_dir) / c["pattern"])) if not p.endswith(".mov"))
        if not hits:
            hits = sorted(glob.glob(str(Path(video_dir) / c["pattern"])))
        if not hits:
            raise FileNotFoundError(f"no video matching {c['pattern']} in {video_dir}")
        out.append({**c, "video": hits[0]})
    return out


def _nearest_per_track(obs: list[dict], offset: float) -> dict[int, dict[int, int]]:
    """tick -> {local_track_id: raw index} keeping the observation closest to the tick centre."""
    out: dict[int, dict[int, tuple[float, int]]] = {}
    for i, o in enumerate(obs):
        ts = o["t_local"] + offset
        k = int(round(ts / TICK_S))
        d = abs(ts - k * TICK_S)
        cur = out.setdefault(k, {}).get(o["local_track_id"])
        if cur is None or d < cur[0]:
            out[k][o["local_track_id"]] = (d, i)
    return {k: {tid: i for tid, (_, i) in v.items()} for k, v in out.items()}


def run(run_dir: Path, cameras: list[dict], calib: dict, log=print) -> dict:
    t_start = time.time()
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "calibration.json").write_text(json.dumps(calib, indent=2))
    cam_doc = {c["camera_id"]: c for c in calib["cameras"]}
    offsets = calib["sync"]["offsets_s"]

    obs, proj, tracklets, tstats = {}, {}, [], {}
    for c in cameras:
        cid = c["camera_id"]
        obs[cid] = load_raw(run_dir, cid)
        H = np.asarray(cam_doc[cid]["homography_image_to_world"])
        pos, sig, ts = project_observations(obs[cid], H, offsets[cid])
        proj[cid] = (pos, sig, ts)
        plate = cv2.imread(str(run_dir / "plates" / f"{cid}.jpg"))
        gains = white_balance_gains(plate) if plate is not None else np.ones(3)
        tr, st = build_tracklets(cid, obs[cid], pos, sig, ts, run_dir, gains)
        tracklets += tr
        tstats[cid] = dict(st, tracklets=len(tr))
        log(f"  {cid}: {len(obs[cid])} raw observations -> {len(tr)} tracklets {st}")

    coverage = Coverage({cid: d["coverage_polygon_world"] for cid, d in cam_doc.items()})
    t0 = time.time()
    pairs = build_pair_evidence(tracklets, coverage)
    log(f"  pair evidence: {len(pairs)} candidate cross-camera pairs ({time.time() - t0:.1f}s)")

    n_ticks = max(t.t_end for t in tracklets) + 1
    resolver = IdentityResolver(tracklets, pairs, n_ticks)
    nearest = {c["camera_id"]: _nearest_per_track(obs[c["camera_id"]], offsets[c["camera_id"]]) for c in cameras}
    key_of = {}
    for t in tracklets:
        for k in t.ticks:
            key_of[(t.camera_id, int(k), t.local_track_id)] = t.key

    (run_dir / "camera_obs").mkdir(exist_ok=True)
    wf = gzip.open(run_dir / "world_state.jsonl.gz", "wt")
    cf = {c["camera_id"]: gzip.open(run_dir / "camera_obs" / f"{c['camera_id']}.jsonl.gz", "wt") for c in cameras}
    stats = {"frames": 0, "people_ticks": 0, "multi_camera_ticks": 0, "ambiguous_ticks": 0}

    def on_frame(frame: dict, gmap: dict[str, int]) -> None:
        tick = frame["tick"]
        wf.write(json.dumps(frame, separators=(",", ":")) + "\n")
        stats["frames"] += 1
        by_gid = {p["global_person_id"]: p for p in frame["people"]}
        for p in frame["people"]:
            if p["state"] in ("active", "ambiguous"):
                stats["people_ticks"] += 1
                stats["multi_camera_ticks"] += len(p["camera_ids"]) > 1
                stats["ambiguous_ticks"] += p["state"] == "ambiguous"
        for c in cameras:
            cid = c["camera_id"]
            pos, _, _ = proj[cid]
            entries = []
            for tid, i in nearest[cid].get(tick, {}).items():
                o = obs[cid][i]
                key = key_of.get((cid, tick, tid))
                gid = gmap.get(key) if key else None
                g = f"g{gid:03d}" if gid else None
                person = by_gid.get(g) if g else None
                w = pos[i]
                entries.append({
                    "local_track_id": tid,
                    "tracklet": key,
                    "bbox": o["bbox"],
                    "det_conf": o["det_conf"],
                    "floor_point_px": o["floor_point_px"],
                    "floor_method": o["floor_method"],
                    "world": None if not np.isfinite(w[0]) else [round(float(w[0]), 3), round(float(w[1]), 3)],
                    "global_person_id": g,
                    "label": person["label"] if person else None,
                    "display_state": person["display_state"] if person else None,
                    "quality_flags": o["quality_flags"],
                    "keypoints": o["keypoints"],
                })
            entries.sort(key=lambda e: e["local_track_id"])
            t_local = round(frame["t"] - offsets[cid], 3)
            cf[cid].write(json.dumps({"tick": tick, "t": frame["t"], "t_local": t_local, "observations": entries},
                                     separators=(",", ":")) + "\n")

    t0 = time.time()
    resolver.run(on_frame)
    assoc_s = time.time() - t0
    wf.close()
    for f in cf.values():
        f.close()

    events = [dict(e, t=round(e["tick"] * TICK_S, 2)) for e in resolver.events]
    (run_dir / "events.json").write_text(json.dumps(events, default=float))
    (run_dir / "tracklets.json").write_text(json.dumps([
        {"key": t.key, "camera_id": t.camera_id, "local_track_id": t.local_track_id,
         "t_start": round(t.t_start * TICK_S, 2), "t_end": round(t.t_end * TICK_S, 2),
         "gid": resolver.gid_of.get(t.key), "n_appearance": t.n_appearance, "crops": t.crops[:6]}
        for t in tracklets]))

    track_meta = {c["camera_id"]: load_meta(run_dir, c["camera_id"]) for c in cameras}
    duration = n_ticks * TICK_S
    ev_types: dict[str, int] = {}
    for e in events:
        ev_types[e["type"]] = ev_types.get(e["type"], 0) + 1
    metrics = {
        "run": run_dir.name,
        "tick_s": TICK_S,
        "decision_lag_s": LAG_S,
        "duration_s": round(duration, 1),
        "processing": {
            cid: {k: m[k] for k in ("model", "imgsz", "stride", "processed_frames", "processing_fps", "inference_ms_per_frame", "wall_s")}
            for cid, m in track_meta.items()
        },
        "association_wall_s": round(assoc_s, 1),
        "association_realtime_factor": round(duration / max(assoc_s, 1e-6), 1),
        "post_tracking_wall_s": round(time.time() - t_start, 1),
        "tracklets": tstats,
        "candidate_pairs": len(pairs),
        "global_identities": resolver.next_gid - 1,
        "events": ev_types,
        "world_state": stats,
    }
    (run_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    log(f"  identities: {resolver.next_gid - 1}  events: {ev_types}")
    log(f"  association: {assoc_s:.1f}s for {duration:.0f}s of video ({metrics['association_realtime_factor']}x realtime)")
    return metrics


def main() -> None:
    ap = argparse.ArgumentParser(description="Spottr shared-world Great Hall pipeline")
    ap.add_argument("--video-dir", default=default_video_dir(),
                    help="folder with the Great Hall videos (env SPOTTR_VIDEO_DIR); files are matched by name")
    ap.add_argument("--run", default="great_hall")
    ap.add_argument("--track", action="store_true", help="run detection + local tracking first (slow)")
    ap.add_argument("--device", default=None)
    ap.add_argument("--calibration", default=str(DEFAULT_CALIBRATION))
    ap.add_argument("--bootstrap", action="store_true", help="re-derive calibration + sync from co-observed people")
    ap.add_argument("--offset", type=float, default=None, help="manual time offset for camera 2 (s)")
    a = ap.parse_args()

    run_dir = SERVICE_ROOT / "out" / a.run
    cams = find_videos(a.video_dir)
    if a.track:
        from .track import track_camera
        for c in cams:
            print(f"tracking {c['camera_id']} ({Path(c['video']).name})")
            track_camera(c["camera_id"], c["video"], run_dir, device=a.device)

    if a.bootstrap or not Path(a.calibration).exists():
        from .bootstrap import bootstrap, finalize_room
        print("bootstrapping calibration + sync from co-observed people")
        doc = bootstrap(run_dir, cams, manual_offset=a.offset)
        clicks = Path(a.calibration).with_name(Path(a.calibration).stem + "_clicks.json")
        if clicks.exists():
            doc = finalize_room(doc, json.loads(clicks.read_text()), run_dir)
        cal.save(doc, a.calibration)
    calib = cal.load(a.calibration)
    if a.offset is not None:
        calib["sync"]["offsets_s"][cams[1]["camera_id"]] = a.offset
        calib["sync"]["method"] = "manual override"
    print("resolving identities")
    run(run_dir, cams, calib)


if __name__ == "__main__":
    main()
