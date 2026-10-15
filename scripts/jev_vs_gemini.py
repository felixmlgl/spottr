"""Compare TypeSafe Jev (keypoints only, no pixels) with the Gemini labels already in public/demo-data.

For every labelled set we describe one rep as joint angles over time (from overlay.json) and ask Jev
to pick an exercise id. Gemini's answer is read from session.json, so only Jev is called.

    TYPESAFE_API_KEY=... python3 scripts/jev_vs_gemini.py
    python3 scripts/jev_vs_gemini.py --dry-run     # print the Jev states, no API call
    ... --images   # send Gemini's own blurred snapshot instead (Jev image support is experimental)
    JEV_MODEL=jev-preview ...   # try Jev 1.14 instead of jev-latest
"""
import argparse
import base64
import json
import math
import os
import sys
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from backend.vision.exercises import EXERCISE_IDS  # noqa: E402  (read-only use of the shared vocabulary)

DATA = ROOT / "public" / "demo-data"
API = "https://api.typesafe.ai/v1/systemone"
SAMPLES = 8  # frames per rep sent to Jev

# COCO-17 indices
SH, EL, WR, HIP, KN, AN = (5, 6), (7, 8), (9, 10), (11, 12), (13, 14), (15, 16)
ANGLES = {  # name: (a, joint, c) per side, angle measured at the joint
    "elbow": (SH, EL, WR),
    "shoulder": (HIP, SH, EL),
    "hip": (SH, HIP, KN),
    "knee": (HIP, KN, AN),
}


def kp(row, i):
    x, y = row[5 + 2 * i], row[6 + 2 * i]
    return None if x < 0 else (x, y)


def angle(a, b, c):
    if None in (a, b, c):
        return None
    v1, v2 = (a[0] - b[0], a[1] - b[1]), (c[0] - b[0], c[1] - b[1])
    n = math.hypot(*v1) * math.hypot(*v2)
    if n == 0:
        return None
    return round(math.degrees(math.acos(max(-1, min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / n)))))


def mid(row, pair):
    a, b = kp(row, pair[0]), kp(row, pair[1])
    pts = [p for p in (a, b) if p]
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)) if pts else None


def pose_line(row, hip0):
    """One frame of one person -> 'elbow L/R ..., torso lean .., wrists .., hips ..' (image y points down)."""
    parts = []
    for name, (a, j, c) in ANGLES.items():
        lr = [angle(kp(row, a[s]), kp(row, j[s]), kp(row, c[s])) for s in (0, 1)]
        parts.append(f"{name} {'/'.join('?' if v is None else str(v) for v in lr)}")
    sh, hip, wr = mid(row, SH), mid(row, HIP), mid(row, WR)
    if sh and hip:
        torso = math.hypot(sh[0] - hip[0], sh[1] - hip[1]) or 1
        parts.append(f"torso lean {round(math.degrees(math.atan2(abs(sh[0] - hip[0]), hip[1] - sh[1])))}")
        if wr:
            parts.append(f"wrists {(sh[1] - wr[1]) / torso:+.1f} torso above shoulders")
        if hip0:  # tells a dip/squat (whole body moves) from a curl/raise (only limbs move)
            parts.append(f"hips {(hip0[1] - hip[1]) / torso:+.2f} torso above rep start")
    return ", ".join(parts)


def rep_window(s, ri):
    """Start/end time of rep ri: from its rest position to the next rest (or the rep's end)."""
    start = s["rep_rest_s"][ri]
    end = s["rep_rest_s"][ri + 1] if ri + 1 < len(s["rep_rest_s"]) else s["rep_times_s"][ri]
    return start, end


def build_state(s, frames, pid):
    ri = min(1, s["reps"] - 1)  # rep 2, same as the Gemini snapshot
    t0, t1 = rep_window(s, ri)
    rows = [(f["t"], r) for f in frames if t0 <= f["t"] <= t1 for r in f["p"] if r[0] == pid]
    if not rows:
        return None
    picks = [rows[round(k * (len(rows) - 1) / (SAMPLES - 1))] for k in range(SAMPLES)]
    hip0 = mid(picks[0][1], HIP)
    lines = [f"t={t - t0:.1f}s: {pose_line(r, hip0)}" for t, r in picks]
    return (
        "One person in a gym, filmed by a fixed security camera, repeating an exercise.\n"
        f"Set: {s['reps']} reps, {s['period_s']}s per rep. Joints moving most: {', '.join(s['moving_joints'])}.\n"
        "Below is one rep as 2D joint angles in degrees (left/right, 180 = straight, ? = not visible),\n"
        "torso lean in degrees from vertical (0 = upright, 90 = lying), wrist height, and how far the hips moved.\n"
        + "\n".join(lines)
    )


IMAGE_STATE = (
    "Three frames from a fixed gym security camera, cropped around one person (their face and all other "
    "people are blurred on purpose). Left to right: start position, halfway, and furthest point of ONE "
    "repetition of an exercise they are repeating. Joints moving the most: {joints}."
)


def image_state(s, clip):
    """Same snapshot + context Gemini got. Returns (state, assets), or None if the snapshot is missing."""
    snap = clip / s.get("snapshot", "")
    if not snap.is_file():
        return None
    ref = str(uuid.uuid4())
    state = {"description": IMAGE_STATE.format(joints=", ".join(s["moving_joints"])), "snapshot": ref}
    data = base64.b64encode(snap.read_bytes()).decode("ascii")
    return state, {ref: {"type": "image", "format": "jpg", "data_base64": data}}


def ask_jev(state, key, assets=None):
    body = {
        "state": state,
        "model": os.environ.get("JEV_MODEL", "jev-latest"),  # jev-preview = 1.14
        "questions": {"exercise": {
            "type": "choice",
            "instructions": "Which exercise is this person doing?",
            "criteria": {e: e.replace("_", " ") for e in EXERCISE_IDS},
        }},
    }
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if assets:
        body["assets"] = assets
        body["questions"]["exercise"]["instructions"] = "Which exercise is the person in the centre of `snapshot` doing?"
        headers["TypeSafe-Danger-Zone-Images"] = "true"
    req = urllib.request.Request(API, json.dumps(body).encode(), headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def self_check():
    assert angle((0, 0), (1, 0), (2, 0)) == 180
    assert angle((0, 1), (0, 0), (1, 0)) == 90
    assert angle(None, (0, 0), (1, 0)) is None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="print states, do not call Jev")
    ap.add_argument("--images", action="store_true", help="send the Gemini snapshot instead of keypoints")
    args = ap.parse_args()
    self_check()
    key = os.environ.get("TYPESAFE_API_KEY")
    if not key and not args.dry_run:
        sys.exit("Set TYPESAFE_API_KEY (console.typesafe.ai/keys) or use --dry-run")

    agree = total = tokens = 0
    for clip in sorted(p for p in DATA.iterdir() if (p / "session.json").exists()):
        session = json.loads((clip / "session.json").read_text())
        frames = json.loads((clip / "overlay.json").read_text())["frames"]
        for person in session["people"]:
            for k, s in enumerate(person["sets"]):
                if "exercise_source" not in s or not s.get("rep_rest_s"):
                    continue  # no Gemini label to compare against
                name = f"{clip.name} P{person['id']} set {k + 1}"
                assets = None
                if args.images:
                    got = image_state(s, clip)
                    if got is None:
                        print(f"{name}: snapshot file missing, skipped")
                        continue
                    state, assets = got
                else:
                    state = build_state(s, frames, person["id"])
                    if state is None:
                        print(f"{name}: person not in overlay during rep, skipped")
                        continue
                if args.dry_run:
                    shown = {**state, "snapshot": s["snapshot"]} if assets else state
                    print(f"--- {name} (gemini: {s['exercise']})\n{shown}\n")
                    continue
                try:
                    res = ask_jev(state, key, assets)
                except Exception as e:  # one bad call shouldn't hide the other results
                    print(f"{name}: Jev failed ({type(e).__name__}: {e})")
                    continue
                ans = res["answers"]["exercise"]
                tokens += res.get("usage", {}).get("input_tokens", 0)
                total += 1
                agree += ans["choice"] == s["exercise"]
                print(f"{name}: gemini={s['exercise']} ({s['confidence']})  "
                      f"jev={ans['choice']} ({ans['confidence']:.2f})  "
                      f"{'AGREE' if ans['choice'] == s['exercise'] else 'differ'}")
                top = sorted(ans["probabilities"].items(), key=lambda kv: -kv[1])[:3]
                print("    jev top 3: " + ", ".join(f"{e} {p:.2f}" for e, p in top))
    if total:
        print(f"\nAgreement: {agree}/{total} sets. Input tokens: {tokens} "
              f"(~{tokens / total:.0f} per set, ${tokens * 0.042e-6:.6f} at $0.042/M)")


if __name__ == "__main__":
    main()
