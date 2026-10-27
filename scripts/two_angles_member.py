"""Member-app data for the "Two angles" demo clip: one session for both cameras, a pose overlay per camera.

1. clips: the segment of videosCorrect/GymAngle1.mp4 / GymAngle2.mp4 that the world map shows, without the
   world export's face pixelation (the member app pixelates everyone but the member itself, like the other
   demo clips): public/videosCorrect/angles-cam1.mp4, angles-cam2.mp4.
2. The vision pipeline (backend/) on each of those clips.
3. merge: each camera's pipeline track is matched to the world identity whose boxes it overlaps
   (public/world-demo-angles/, see scripts/gym_two_angles.py), so "Person 2" is the same person in both
   cameras, as on the shared floor map.

    PY=world-service/.venv/bin/python
    $PY scripts/two_angles_member.py clips
    for c in cam1 cam2; do (cd backend && PYTHONDONTWRITEBYTECODE=1 ../$PY -m vision.run \
        ../public/videosCorrect/angles-$c.mp4 --out ../world-service/out/angles_member/$c \
        --model ../world-service/models/yolo26s-pose.pt --no-gemini --no-render); done
    python3 scripts/two_angles_member.py merge world-service/out/angles_member

Output: public/demo-data/angles/ (session.json, cam1/overlay.json, cam2/overlay.json, people/).
"""
import json
import shutil
import sys
from collections import Counter
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORLD = ROOT / "public" / "world-demo-angles"
OUT = ROOT / "public" / "demo-data" / "angles"
CAMERAS = ["cam1", "cam2"]
SOURCES = {"cam1": ROOT / "videosCorrect" / "GymAngle1.mp4", "cam2": ROOT / "videosCorrect" / "GymAngle2.mp4"}
CLIPS = {c: ROOT / "public" / "videosCorrect" / f"angles-{c}.mp4" for c in CAMERAS}


def cut_clips():
    """Same time window as the world export's clips (both cameras start together), source frame rate."""
    import av

    seg = json.loads((WORLD / "timeline.json").read_text())["segments"][0]
    for cam in CAMERAS:
        inp = av.open(str(SOURCES[cam]))
        vs = inp.streams.video[0]
        rate = Fraction(vs.average_rate)
        out = av.open(str(CLIPS[cam]), "w", options={"movflags": "faststart"})
        st = out.add_stream("libx264", rate=rate)
        st.width, st.height, st.pix_fmt = vs.codec_context.width, vs.codec_context.height, "yuv420p"
        st.options = {"crf": "26", "preset": "slow", "g": "24"}
        n = 0
        for f in inp.decode(vs):
            t = float(f.pts * vs.time_base)
            if t < seg["from_s"] - 1e-3:
                continue
            if t > seg["to_s"]:
                break
            g = f.reformat(format="yuv420p")
            g.pts, g.time_base = n, 1 / rate
            n += 1
            for p in st.encode(g):
                out.mux(p)
        for p in st.encode():
            out.mux(p)
        out.close()
        print(f"-> {CLIPS[cam].relative_to(ROOT)}: {n} frames, {CLIPS[cam].stat().st_size / 1e6:.1f} MB")


def iou(a, b):
    w = min(a[2], b[2]) - max(a[0], b[0])
    h = min(a[3], b[3]) - max(a[1], b[1])
    if w <= 0 or h <= 0:
        return 0.0
    inter = w * h
    return inter / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter)


def final_identity(timeline):
    """World id -> the id it ends up as after the service merged two sightings into one person."""
    merged = {e["absorbed"]: e["gid"] for e in timeline["events"] if e["type"] == "identities_merged"}

    def resolve(gid):
        while gid in merged:
            gid = merged[gid]
        return gid

    return resolve


def match_tracks(overlay, world_rows, resolve):
    """Pipeline person id -> world person id, by box overlap with the world service's observations."""
    votes = {}
    for f in overlay["frames"]:
        row = min(world_rows, key=lambda r: abs(r["t"] - f["t"]))
        if abs(row["t"] - f["t"]) > 0.1:
            continue
        for p in f["p"]:
            if p[0] < 0:
                continue
            best = max(row["observations"], key=lambda o: iou(p[1:5], o["bbox"]), default=None)
            if best and best["global_person_id"] and iou(p[1:5], best["bbox"]) > 0.3:
                gid = resolve(int(best["global_person_id"].lstrip("g")))
                votes.setdefault(p[0], Counter())[gid] += 1
    return {pid: c.most_common(1)[0][0] for pid, c in votes.items()}


def box_height(overlay, pid):
    hs = sorted(p[4] - p[2] for f in overlay["frames"] for p in f["p"] if p[0] == pid)
    return hs[len(hs) // 2] if hs else 0


def merge(src: Path):
    timeline = json.loads((WORLD / "timeline.json").read_text())
    seg = timeline["segments"][0]
    resolve = final_identity(timeline)

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "people").mkdir(exist_ok=True)
    sessions = {}
    people = {}  # world id -> [(camera, pipeline person, box height)]
    for cam in CAMERAS:
        session = json.loads((src / cam / "session.json").read_text())
        overlay = json.loads((src / cam / "overlay.json").read_text())
        rows = json.loads((WORLD / seg["camera_urls"][cam]).read_text())["rows"]
        ids = match_tracks(overlay, rows, resolve)
        unmatched = [p["id"] for p in session["people"] if p["id"] not in ids]
        if unmatched:
            sys.exit(f"{cam}: no world identity for pipeline people {unmatched}")
        for f in overlay["frames"]:
            for p in f["p"]:
                if p[0] > 0:
                    p[0] = ids[p[0]]
        (OUT / cam).mkdir(exist_ok=True)
        (OUT / cam / "overlay.json").write_text(json.dumps(overlay, separators=(",", ":")))
        sessions[cam] = session
        for p in session["people"]:
            people.setdefault(ids[p["id"]], []).append((cam, p, box_height(overlay, p["id"])))

    merged = []
    for gid, seen in sorted(people.items()):
        # Sets come from the camera that counted the most reps (never summed: it's the same workout twice);
        # the thumbnail from the camera where the person is largest.
        counted = max(seen, key=lambda s: (s[1]["total_reps"], s[2]))[1]
        cam, largest, _ = max(seen, key=lambda s: s[2])
        if largest["thumbnail"]:
            shutil.copy(src / cam / largest["thumbnail"], OUT / "people" / f"p{gid}.jpg")
        merged.append({
            **counted,
            "id": gid,
            "track_ids": [],
            "first_seen_s": min(s[1]["first_seen_s"] for s in seen),
            "last_seen_s": max(s[1]["last_seen_s"] for s in seen),
            "thumbnail": f"people/p{gid}.jpg" if largest["thumbnail"] else None,
            "cameras": sorted(s[0] for s in seen),
        })

    base = sessions[CAMERAS[0]]
    session = {**base, "video": "two angles", "people": merged}
    (OUT / "session.json").write_text(json.dumps(session, indent=1))
    print(f"-> {OUT.relative_to(ROOT)}: " + ", ".join(f"Person {p['id']} ({' + '.join(p['cameras'])}, {p['total_reps']} reps)" for p in merged))


if __name__ == "__main__":
    if sys.argv[1:2] == ["clips"]:
        cut_clips()
    elif sys.argv[1:2] == ["merge"] and len(sys.argv) == 3:
        merge(Path(sys.argv[2]))
    else:
        sys.exit(__doc__)
