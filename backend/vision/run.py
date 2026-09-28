"""End-to-end: video -> session.json (+ overlay.json, annotated.mp4, snapshots, person thumbnails).

    python -m vision.run path/to/video.mp4                 # writes out/<video-stem>/
    python -m vision.run clip.mp4 --out out/clip1 --no-render
    python -m vision.run clip.mp4 --retrack --imgsz 1280   # re-run the pose model (otherwise cached)
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

from .analyze import Params, analyze
from .exercises import muscle_load

ROOT = Path(__file__).resolve().parent.parent


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def covered_by_front(box, others, own_ids):
    """Share of `box` under the boxes of people standing in front of it (feet lower in the frame).
    blur_people pixelates those boxes over whoever is behind them."""
    x1, y1, x2, y2 = box
    cov = 0.0
    for q in others:
        qx1, qy1, qx2, qy2 = q["box"]
        if q["id"] in own_ids or qy2 < y2:
            continue
        cov += max(0, min(x2, qx2) - max(x1, qx1)) * max(0, min(y2, qy2) - max(y1, qy1))
    return min(1.0, cov / max(1.0, (x2 - x1) * (y2 - y1)))


def save_thumbnails(video_path, data, people, out_dir):
    """One crop per person for the 'pick a person' UI: their own face blurred, everyone else head to toe."""
    from .classify import blur_people, people_at, read_frames
    out_dir.mkdir(parents=True, exist_ok=True)
    picks = []
    for p in people:
        tr = p["_track"]
        # Prefer a frame inside their first set; otherwise the largest box. Either way, first pick among
        # frames where nobody stands in front of them, or they'd be blurred out of their own thumbnail.
        s = p["sets"][0] if p["sets"] else None
        cand = np.where((tr.t >= s["start_s"]) & (tr.t <= s["end_s"]))[0] if s else []
        if len(cand):
            pref = np.abs(tr.t[cand] - s["rep_rest_s"][0])
        else:
            cand = np.arange(len(tr.t))
            pref = -(tr.box[cand, 3] - tr.box[cand, 1])
        cover = [covered_by_front(tr.box[i], people_at(data, int(tr.fi[i])), tr.ids) for i in cand]
        i = int(cand[np.lexsort((pref, np.round(cover, 1)))[0]])
        picks.append((p, tr, i, int(tr.fi[i])))
    frames = read_frames(video_path, [fi for *_, fi in picks])
    for p, tr, i, fi in picks:
        if fi not in frames:
            continue
        frame = blur_people(frames[fi], people_at(data, fi), keep=tr.ids)
        x1, y1, x2, y2 = tr.box[i]
        pw, ph = 0.2 * (x2 - x1), 0.08 * (y2 - y1)
        crop = frame[int(max(0, y1 - ph)):int(y2 + ph), int(max(0, x1 - pw)):int(x2 + pw)]
        crop = cv2.resize(crop, (int(crop.shape[1] * 200 / crop.shape[0]), 200), interpolation=cv2.INTER_CUBIC)
        cv2.imwrite(str(out_dir / f"p{p['id']}.jpg"), crop)
        p["thumbnail"] = f"people/p{p['id']}.jpg"


def build_session(data, people):
    frames = data["frames"]
    session = {
        "video": data["video"],
        "duration_s": round(frames[-1]["t"], 2),
        "width": data["width"],
        "height": data["height"],
        "fps": round((len(frames) - 1) / max(frames[-1]["t"], 1e-6), 2),
        "pipeline": {"pose_model": data.get("model"), "imgsz": data.get("imgsz"), "tracker": "botsort+reid",
                     "processing_fps": data.get("processing_fps")},
        "people": [],
    }
    for p in people:
        per_ex = {}
        for s in p["sets"]:
            per_ex[s["exercise"]] = per_ex.get(s["exercise"], 0) + s["reps"]
        session["people"].append({
            "id": p["id"],
            "track_ids": p["track_ids"],
            "first_seen_s": p["first_seen_s"],
            "last_seen_s": p["last_seen_s"],
            "thumbnail": p.get("thumbnail"),
            "total_reps": sum(s["reps"] for s in p["sets"]),
            "exercises": per_ex,
            "muscle_load": muscle_load(p["sets"]) if p["sets"] else {},
            "sets": p["sets"],
        })
    return session


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--out", help="output dir (default out/<video stem>)")
    ap.add_argument("--model", default=str(ROOT / "models" / "yolo26n-pose.pt"))
    ap.add_argument("--imgsz", type=int, default=960, help="pose input size; upscaling helps small/far people")
    ap.add_argument("--device", default=None, help="mps / cpu / cuda:0 (default: auto)")
    ap.add_argument("--retrack", action="store_true", help="re-run pose tracking even if tracks.json exists")
    ap.add_argument("--no-gemini", action="store_true", help="skip Gemini; use heuristic exercise labels")
    ap.add_argument("--no-render", action="store_true", help="skip annotated.mp4")
    a = ap.parse_args()

    video = Path(a.video)
    out = Path(a.out) if a.out else ROOT / "out" / video.stem.replace(" ", "_")
    out.mkdir(parents=True, exist_ok=True)

    tracks_path = out / "tracks.json"
    if tracks_path.exists() and not a.retrack:
        log(f"[1/5] pose tracking: cached {tracks_path}")
        data = json.loads(tracks_path.read_text())
    else:
        from .track import track_video
        log(f"[1/5] pose tracking {video.name} ({Path(a.model).name}, imgsz={a.imgsz})")
        data = track_video(video, a.model, a.imgsz, device=a.device)
        tracks_path.write_text(json.dumps(data, separators=(",", ":")))

    log("[2/5] people, sets, reps")
    people = analyze(data, Params())
    for p in people:
        for s in p["sets"]:
            log(f"  P{p['id']}: {s['reps']} reps {s['start_s']:.1f}-{s['end_s']:.1f}s (heuristic: {s['exercise']})")

    log("[3/5] exercise classification")
    if a.no_gemini:
        log("  skipped (--no-gemini)")
    else:
        from .classify import classify_sets
        classify_sets(video, data, people, snap_dir=out / "snapshots", log=log)

    log("[4/5] thumbnails + session.json + overlay.json")
    save_thumbnails(video, data, people, out / "people")
    session = build_session(data, people)
    (out / "session.json").write_text(json.dumps(session, indent=1))
    from .render import overlay_json, render_video
    (out / "overlay.json").write_text(json.dumps(overlay_json(data, people), separators=(",", ":")))

    if a.no_render:
        log("[5/5] render: skipped")
    else:
        log("[5/5] rendering annotated.mp4")
        render_video(video, data, people, out / "annotated.mp4")

    lifters = [p for p in session["people"] if p["total_reps"]]
    log(f"\ndone -> {out}")
    log(f"  {len(session['people'])} people tracked, {len(lifters)} with sets")
    for p in lifters:
        log(f"  P{p['id']}: " + ", ".join(f"{ex} x{n}" for ex, n in p["exercises"].items()))


if __name__ == "__main__":
    main()
