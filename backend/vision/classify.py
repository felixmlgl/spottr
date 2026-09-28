"""Stage 3: exercise label per set from a vision-language model (Gemini Flash).

Once per set we send three frames of one rep (rest -> halfway -> furthest point), cropped around the
lifter, faces blurred, ~384 px tall. That single low-res image is all that leaves the device.
"""
import json
import os
from pathlib import Path

import cv2
import numpy as np

from .exercises import EXERCISE_IDS

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
EQUIPMENT = ["barbell", "dumbbell", "cable", "machine", "smith_machine", "kettlebell", "bodyweight", "other"]

SCHEMA = {
    "type": "object",
    "properties": {
        "exercise": {"type": "string", "enum": EXERCISE_IDS},
        "equipment": {"type": "string", "enum": EQUIPMENT},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
    },
    "required": ["exercise", "equipment", "confidence"],
}

PROMPT = """Three frames from a fixed gym security camera, cropped around one person (faces blurred on purpose).
Left to right: start position, halfway, and furthest point of ONE repetition of an exercise they are repeating.
Joints moving the most: {joints}.
Which exercise is this person doing? Pick the closest id from the allowed list; use "other" only if nothing fits.
Judge only the person in the centre of the crop, ignore people in the background."""


def load_api_key():
    for k in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
        if os.environ.get(k):
            return os.environ[k]
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            k, _, v = line.partition("=")
            if k.strip() in ("GEMINI_API_KEY", "GOOGLE_API_KEY") and v.strip():
                return v.strip().strip("'\"")
    return None


def blur_faces(img, people, min_conf=0.3):
    """Pixelate every face in the frame, located from the pose model's nose/eye/ear keypoints."""
    out = img.copy()
    H, W = img.shape[:2]
    for p in people:
        kp = np.array(p["kp"])
        face = kp[:5][kp[:5, 2] >= min_conf]
        if len(face) == 0:
            continue
        cx, cy = face[:, :2].mean(0)
        bh = p["box"][3] - p["box"][1]
        spread = np.ptp(face[:, 0]) if len(face) > 1 else 0
        r = int(max(1.2 * spread, 0.09 * bh, 6))
        x0, y0, x1, y1 = max(0, int(cx - r)), max(0, int(cy - r)), min(W, int(cx + r)), min(H, int(cy + r))
        if x1 <= x0 or y1 <= y0:
            continue
        roi = out[y0:y1, x0:x1]
        small = cv2.resize(roi, (max(1, (x1 - x0) // 6), max(1, (y1 - y0) // 6)), interpolation=cv2.INTER_AREA)
        out[y0:y1, x0:x1] = cv2.resize(small, (x1 - x0, y1 - y0), interpolation=cv2.INTER_NEAREST)
    return out


def read_frames(video_path, indices):
    """Exact frames by index in one sequential pass (seeking is off by a few frames on VFR phone video)."""
    want = set(int(i) for i in indices)
    out = {}
    if not want:
        return out
    cap = cv2.VideoCapture(str(video_path))
    last = max(want)
    for i in range(last + 1):
        if not cap.grab():
            break
        if i in want:
            out[i] = cap.retrieve()[1]
    cap.release()
    return out


def snapshot_detections(track, s, rep_index=1):
    """Indices into `track` of the rest / halfway / peak moments of one rep."""
    ri = min(rep_index, s["reps"] - 1)
    times = [s["rep_rest_s"][ri], s["rep_mid_s"][ri], s["rep_peak_s"][ri]]
    return [int(np.argmin(np.abs(track.t - t))) for t in times]


def make_snapshot(frames, data, track, det_idx, height=384):
    """Tile the given detections of one person (face-blurred crops) side by side. Returns a BGR image.

    frames: {frame_index: BGR image} containing track.fi[det_idx].
    """
    boxes = track.box[det_idx]
    x0, y0 = boxes[:, 0].min(), boxes[:, 1].min()
    x1, y1 = boxes[:, 2].max(), boxes[:, 3].max()
    pw, ph = 0.35 * (x1 - x0), 0.2 * (y1 - y0)  # context: bench, rack, cable stack
    W, H = data["width"], data["height"]
    x0, y0, x1, y1 = int(max(0, x0 - pw)), int(max(0, y0 - ph)), int(min(W, x1 + pw)), int(min(H, y1 + ph))
    tiles = []
    for i in det_idx:
        fi = int(track.fi[i])
        frame = blur_faces(frames[fi], data["frames"][fi]["people"])
        crop = frame[y0:y1, x0:x1]
        scale = height / crop.shape[0]
        tiles.append(cv2.resize(crop, (int(crop.shape[1] * scale), height), interpolation=cv2.INTER_CUBIC))
    sep = np.full((height, 6, 3), 255, np.uint8)
    out = []
    for k, t in enumerate(tiles):
        out += [t] if k == 0 else [sep, t]
    return np.hstack(out)


def classify_image(img, joints, model=DEFAULT_MODEL, api_key=None):
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key or load_api_key())
    ok, jpg = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    resp = client.models.generate_content(
        model=model,
        contents=[types.Part.from_bytes(data=jpg.tobytes(), mime_type="image/jpeg"),
                  PROMPT.format(joints=", ".join(joints))],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=SCHEMA,
            temperature=0,
        ),
    )
    return json.loads(resp.text)


def classify_sets(video_path, data, people, snap_dir=None, model=DEFAULT_MODEL, log=print):
    """Label every set in place. Falls back to the heuristic label if the call fails."""
    api_key = load_api_key()
    # Snapshot of rep 2 (like the live system: classify once two reps are in), plus a mid-set fallback.
    jobs = []
    for person in people:
        tr = person["_track"]
        for k, s in enumerate(person["sets"]):
            first = snapshot_detections(tr, s, rep_index=1)
            retry = snapshot_detections(tr, s, rep_index=s["reps"] // 2 + 1)
            jobs.append((person, k, s, first, retry))
    frames = read_frames(video_path, [int(j[0]["_track"].fi[i]) for j in jobs for i in j[3] + j[4]])

    for person, k, s, first, retry in jobs:
        tr = person["_track"]
        img = make_snapshot(frames, data, tr, first)
        if snap_dir:
            Path(snap_dir).mkdir(parents=True, exist_ok=True)
            name = f"p{person['id']}_set{k + 1}.jpg"
            cv2.imwrite(str(Path(snap_dir) / name), img)
            s["snapshot"] = f"snapshots/{name}"
        if not api_key:
            continue
        try:
            res = classify_image(img, s["moving_joints"], model, api_key)
            # Low confidence: try again later in the set, where the lifter is fully in the groove.
            if res["confidence"] < 0.5 and s["reps"] >= 4:
                img2 = make_snapshot(frames, data, tr, retry)
                res2 = classify_image(img2, s["moving_joints"], model, api_key)
                if res2["confidence"] > res["confidence"]:
                    res = res2
                    if snap_dir:
                        cv2.imwrite(str(Path(snap_dir) / name), img2)
            s.update(exercise=res["exercise"], equipment=res["equipment"],
                     confidence=round(float(res["confidence"]), 2), exercise_source=model)
            log(f"  P{person['id']} set {k + 1}: {res['exercise']} ({res['equipment']}, {res['confidence']:.2f})")
        except Exception as e:  # network, quota, model name... never break the rep count
            log(f"  P{person['id']} set {k + 1}: Gemini failed ({type(e).__name__}: {e}); keeping heuristic")
    if not api_key:
        log("  no GEMINI_API_KEY (env or .env) -> snapshots saved, keeping heuristic exercise labels")
