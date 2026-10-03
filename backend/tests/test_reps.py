"""Synthetic stress test for the rep counter: skeletons with realistic jitter, tempo variation and dropouts.

    .venv/bin/python tests/test_reps.py

Each scenario builds a fake tracks.json (same format as vision/track.py) and checks the counted reps.
"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from vision.analyze import Params, analyze  # noqa: E402

FPS = 30
# Standing person facing the camera, units of body height, origin between the feet, y down.
BASE = np.array([
    [0, -0.93], [-0.02, -0.95], [0.02, -0.95], [-0.04, -0.94], [0.04, -0.94],   # nose eyes ears
    [-0.11, -0.80], [0.11, -0.80], [-0.13, -0.62], [0.13, -0.62],               # shoulders elbows
    [-0.13, -0.46], [0.13, -0.46], [-0.08, -0.50], [0.08, -0.50],               # wrists hips
    [-0.08, -0.27], [0.08, -0.27], [-0.08, -0.02], [0.08, -0.02]])              # knees ankles


def curl(ph):
    d = np.zeros((17, 2))
    th = ph * np.radians(140)                     # forearm swings up around the elbow
    for e, w in ((7, 9), (8, 10)):
        d[w] = BASE[e] + 0.16 * np.array([0, np.cos(th)]) - BASE[w] + [0, 0.0]
    return d


def press(ph):
    d = np.zeros((17, 2))
    for s, (e, w) in ((-1, (7, 9)), (1, (8, 10))):
        rest_e, top_e = np.array([0.2 * s, -0.72]), np.array([0.15 * s, -0.98])
        rest_w, top_w = np.array([0.18 * s, -0.86]), np.array([0.10 * s, -1.12])
        d[e] = rest_e + ph * (top_e - rest_e) - BASE[e]
        d[w] = rest_w + ph * (top_w - rest_w) - BASE[w]
    return d


def squat(ph):
    d = np.zeros((17, 2))
    d[:13, 1] += 0.2 * ph                         # everything above the knees drops
    d[[13, 14], 1] += 0.05 * ph
    d[13, 0] -= 0.03 * ph
    d[14, 0] += 0.03 * ph
    return d


def dip(ph):
    d = np.zeros((17, 2))
    d[:, 1] += 0.25 * ph                          # whole body, feet included, lowers between the bars
    d[[9, 10], 1] -= 0.25 * ph                    # hands stay on the bars
    d[[7, 8], 0] += np.array([-0.06, 0.06]) * ph  # elbows flare back as they bend
    return d


def lateral_raise(ph):
    d = np.zeros((17, 2))
    for s, (e, w) in ((-1, (7, 9)), (1, (8, 10))):
        d[w] = ph * (np.array([0.45 * s, -0.80]) - BASE[w])
        d[e] = ph * (np.array([0.30 * s, -0.80]) - BASE[e])
    return d


def rep_schedule(t0, n, period, rng, pause=(0.2, 0.8)):
    """[(start, end)] of n reps with +-20% tempo variation and short pauses at the rest position."""
    reps, t = [], t0
    for _ in range(n):
        dur = period * rng.uniform(0.8, 1.2)
        reps.append((t, t + dur))
        t += dur + rng.uniform(*pause)
    return reps, t


def person_frames(duration, pose_fn, pos_fn, H, noise, rng, dropout=0.05):
    """Per-frame (box, kp) for one synthetic person. pose_fn(t) -> (17,2) offsets, pos_fn(t) -> feet px."""
    out = []
    for i in range(int(duration * FPS)):
        t = i / FPS
        p = pos_fn(t)
        if p is None:
            out.append(None)
            continue
        kp = (BASE + pose_fn(t)) * H + p + rng.normal(0, noise * H, (17, 2))
        conf = np.where(rng.random(17) < dropout, 0.1, rng.uniform(0.6, 0.95, 17))
        x1, y1 = kp.min(0) - 0.05 * H
        x2, y2 = kp.max(0) + 0.03 * H
        out.append(([x1, y1, x2, y2], [[x, y, c] for (x, y), c in zip(kp, conf)]))
    return out


def phase_from(reps, fn):
    def pose(t):
        for a, b in reps:
            if a <= t < b:
                return fn((1 - np.cos(2 * np.pi * (t - a) / (b - a))) / 2)
        return fn(0.0)  # hold the exercise's rest pose between reps (e.g. dumbbells at the shoulders)
    return pose


def build(people, duration):
    frames = [{"i": i, "t": i / FPS, "people": []} for i in range(int(duration * FPS))]
    for tid, fr in enumerate(people, start=1):
        for i, x in enumerate(fr):
            if x is not None:
                frames[i]["people"].append({"id": tid, "box": x[0], "score": 0.9, "kp": x[1]})
    return {"video": "synthetic", "width": 1920, "height": 1080, "fps": FPS, "frames": frames}


def still(x, y):
    return lambda t: np.array([x, y])


def scenario(name, seed, n_reps, fn, period, noise=0.012, H=300, dropout=0.05, occlusion=None):
    rng = np.random.default_rng(seed)
    reps, t_end = rep_schedule(8.0, n_reps, period, rng)
    dur = t_end + 8
    pos = still(800, 900)
    if occlusion:  # the tracker loses the person for a moment (someone walks past)
        a, b = occlusion
        pos = lambda t: None if a <= t < b else np.array([800, 900])  # noqa: E731
    fr = person_frames(dur, phase_from(reps, fn), pos, H, noise, rng, dropout)
    return name, build([fr], dur), [n_reps]


def walker(seed):
    rng = np.random.default_rng(seed)
    dur, H = 14, 250

    def pose(t):
        d = np.zeros((17, 2))
        s = np.sin(2 * np.pi * t / 1.0)
        d[[15, 13], 0] += [0.12 * s, 0.06 * s]
        d[[16, 14], 0] -= [0.12 * s, 0.06 * s]
        d[[9, 10], 0] += [-0.06 * s, 0.06 * s]
        d[:13, 1] += 0.015 * np.abs(s)
        return d
    fr = person_frames(dur, pose, lambda t: np.array([100 + 0.7 * H * t, 700]), H, 0.012, rng)
    return "walker crossing", build([fr], dur), []


def fidgeter(seed):
    rng = np.random.default_rng(seed)
    dur, H = 40, 280
    events = [(3, 5), (9.5, 11), (12, 14.5), (22, 23), (31, 34)]  # irregular phone / water-bottle moves

    def pose(t):
        for a, b in events:
            if a <= t < b:
                return curl((1 - np.cos(2 * np.pi * (t - a) / (b - a))) / 2) * [0, 1] * 0.8
        return np.zeros((17, 2))
    fr = person_frames(dur, pose, still(900, 800), H, 0.015, rng)
    return "idle + fidgeting", build([fr], dur), []


def two_sets(seed):
    rng = np.random.default_rng(seed)
    r1, e1 = rep_schedule(6, 10, 2.0, rng)
    r2, e2 = rep_schedule(e1 + 60, 8, 3.0, rng)  # 60 s rest, then a different exercise
    dur = e2 + 6

    def pose(t):
        return phase_from(r1, curl)(t) if t < e1 + 1 else phase_from(r2, press)(t)
    fr = person_frames(dur, pose, still(700, 850), 260, 0.012, rng)
    return "curls, rest, presses", build([fr], dur), [10, 8]


def continuous(seed):
    """Touch-and-go presses with no pause at rest: dwell cue is ambiguous, falls back to the set edges."""
    rng = np.random.default_rng(seed)
    reps, t_end = rep_schedule(6.0, 10, 2.2, rng, pause=(0.0, 0.05))
    dur = t_end + 6
    fr = person_frames(dur, phase_from(reps, press), still(800, 900), 280, 0.012, rng)
    return "continuous presses x10 (no pauses)", build([fr], dur), [10]


def rerack(seed):
    """Squats where the set window also contains unracking / re-racking the bar (arms reach up)."""
    rng = np.random.default_rng(seed)
    reps, t_end = rep_schedule(9.0, 8, 3.0, rng)
    dur = t_end + 9
    squat_pose = phase_from(reps, squat)

    def pose(t):
        d = squat_pose(t)
        for a, b in ((5.5, 8.0), (t_end + 0.8, t_end + 3.5)):
            if a <= t < b:
                u = np.sin(np.pi * (t - a) / (b - a))
                d = d.copy()
                d[[7, 8, 9, 10], 1] -= 0.12 * u   # hands up to the hooks
                d[:13, 1] -= 0.03 * u             # rises onto toes
        return d
    fr = person_frames(dur, pose, still(800, 900), 280, 0.012, rng)
    return "squats x8 with unrack + rerack", build([fr], dur), [8]


def ragged_tail(seed):
    """A clean set, then (without leaving the spot) slow, uneven torso moves: shifting on the knees, getting up.
    Used to drag the whole window's periodicity below the threshold and drop the set; now the evenly paced
    reps are kept."""
    rng = np.random.default_rng(seed)
    reps, t_end = rep_schedule(4.0, 10, 1.8, rng, pause=(0.1, 0.3))
    tail = [(t_end + 1.0, t_end + 3.5), (t_end + 6.0, t_end + 9.5), (t_end + 10.5, t_end + 11.7)]
    dur = tail[-1][1] + 4
    clean = phase_from(reps, curl)

    def pose(t):
        for a, b in tail:
            if a <= t < b:
                d = np.zeros((17, 2))
                d[:13, 1] -= 0.15 * (1 - np.cos(2 * np.pi * (t - a) / (b - a))) / 2  # torso rises, feet stay
                return d
        return clean(t)
    fr = person_frames(dur, pose, still(800, 900), 280, 0.012, rng)
    return "curl x10 + uneven tail (same spot)", build([fr], dur), [10]


def crowd(seed):
    """A squatter, a curler and a walker in the same video."""
    rng = np.random.default_rng(seed)
    rs, es = rep_schedule(5, 8, 3.0, rng)
    rc, ec = rep_schedule(12, 12, 1.8, rng)
    dur = max(es, ec) + 6
    a = person_frames(dur, phase_from(rs, squat), still(500, 700), 220, 0.012, rng)
    b = person_frames(dur, phase_from(rc, curl), still(1300, 750), 240, 0.012, rng)
    w = person_frames(dur, lambda t: np.zeros((17, 2)), lambda t: np.array([1900 - 150 * t, 900]), 300, 0.012, rng)
    return "crowd: squat + curl + walker", build([a, b, w], dur), [8, 12]


SCENARIOS = [
    lambda: scenario("bicep curl x12", 1, 12, curl, 2.0),
    lambda: scenario("shoulder press x8", 2, 8, press, 3.0),
    lambda: scenario("squat x10", 3, 10, squat, 2.5),
    lambda: scenario("lateral raise x15", 4, 15, lateral_raise, 1.8),
    lambda: scenario("dips x10 (feet move with reps)", 17, 10, dip, 3.0),
    lambda: scenario("curl x10, heavy jitter", 5, 10, curl, 2.2, noise=0.025),
    lambda: scenario("curl x10, small in frame (60px)", 6, 10, curl, 2.2, H=60, noise=0.02),
    lambda: scenario("press x8, 20% keypoint dropout", 7, 8, press, 3.0, dropout=0.2),
    lambda: scenario("squat x10, 0.6 s occlusion", 8, 10, squat, 2.5, occlusion=(15.0, 15.6)),
    lambda: scenario("slow squats x6 (5 s/rep)", 9, 6, squat, 5.0),
    lambda: scenario("fast curls x15 (1 s/rep)", 10, 15, curl, 1.0),
    lambda: continuous(15),
    lambda: rerack(16),
    lambda: walker(11),
    lambda: fidgeter(12),
    lambda: two_sets(13),
    lambda: ragged_tail(18),
    lambda: crowd(14),
]


if __name__ == "__main__":
    fails = 0
    for make in SCENARIOS:
        name, data, expected = make()
        got = sorted(s["reps"] for p in analyze(data, Params()) for s in p["sets"])
        ok = got == sorted(expected)
        fails += not ok
        print(f"{'PASS' if ok else 'FAIL'}  {name:36s} expected {sorted(expected)}  got {got}")
    print(f"\n{len(SCENARIOS) - fails}/{len(SCENARIOS)} passed")
    sys.exit(1 if fails else 0)
