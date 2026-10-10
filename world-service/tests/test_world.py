"""Synthetic tests for calibration and identity logic (no video, no GPU).

  .venv/bin/python tests/test_world.py
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from spottr_world import calibration as cal  # noqa: E402
from spottr_world.association import Coverage, build_pair_evidence  # noqa: E402
from spottr_world.identity import IdentityResolver  # noqa: E402
from spottr_world.tracklets import TICK_S, Tracklet, _smooth_velocity  # noqa: E402

RNG = np.random.default_rng(7)
RED = np.eye(1, 72, 3)[0].astype(np.float32)
BLUE = np.eye(1, 72, 40)[0].astype(np.float32)
GREY = np.eye(1, 72, 60)[0].astype(np.float32)


def make_tracklet(key, cam, t0, t1, path, sigma=0.15, app=None, noise=0.08, edge=False):
    ticks = np.arange(int(t0 / TICK_S), int(t1 / TICK_S))
    pos = np.array([path(k * TICK_S) for k in ticks]) + RNG.normal(0, noise, (len(ticks), 2))
    a = None if app is None else (app + RNG.normal(0, 0.02, app.shape)).astype(np.float32)
    if a is not None:
        a /= np.linalg.norm(a)
    return Tracklet(key, cam, int(key.split(":")[1]), ticks, pos, np.full(len(ticks), sigma),
                    _smooth_velocity(ticks, pos), np.full(len(ticks), 0.8), [[0]] * len(ticks),
                    np.full(len(ticks), edge), a, 10 if a is not None else 0)


def resolve(tracklets):
    cov = Coverage({"cam1": [[-50, -50], [50, -50], [50, 50], [-50, 50]], "cam2": [[-50, -50], [50, -50], [50, 50], [-50, 50]]})
    pairs = build_pair_evidence(tracklets, cov)
    n = max(t.t_end for t in tracklets) + 1
    r = IdentityResolver(tracklets, pairs, n)
    frames = []
    r.run(lambda f, g: frames.append((f, dict(g))))
    return r, frames


def ids_at(frames, t, key):
    for f, gmap in frames:
        if abs(f["t"] - t) < 1e-6:
            return gmap.get(key)
    return None


def test_camera_model_roundtrip():
    cam = cal.FloorCamera(950, math.radians(25), math.radians(1.5), 5.0, 640, 360)
    G = np.column_stack([RNG.uniform(-5, 5, 100), RNG.uniform(4, 20, 100)])
    px = cam.project(np.column_stack([G, np.zeros(100)]))
    assert np.abs(cal.apply_h(cam.image_to_floor_h(), px) - G).max() < 1e-9


def test_self_calibration_recovers_camera():
    true = cal.FloorCamera(1000, math.radians(20), math.radians(1), 5.0, 640, 360)
    G = np.column_stack([RNG.uniform(-6, 6, 300), RNG.uniform(5, 22, 300), np.zeros(300)])
    foot = true.project(G)
    eye = true.project(G + np.array([0, 0, 1.0]) * RNG.normal(cal.EYE_HEIGHT_M, 0.05, (300, 1)))
    ok = (foot[:, 0] > 0) & (foot[:, 0] < 1280) & (foot[:, 1] > 0) & (foot[:, 1] < 720)
    s = np.column_stack([foot, eye])[ok] + RNG.normal(0, 1.0, (ok.sum(), 4))
    cam, _ = cal.self_calibrate(s, (1280, 720), vp=true.vertical_vp())
    assert abs(cam.f - 1000) < 80, cam.f
    assert abs(math.degrees(cam.pitch) - 20) < 2.0
    assert abs(cam.height - 5.0) < 0.5


def test_homography_grading_flags_weak_calibration():
    H_true = np.array([[0.02, 0.001, -6], [0.0005, 0.05, -8], [0, 0.0012, 1]])
    good_px = np.array([[100, 400], [1180, 410], [640, 700], [300, 600], [1000, 620], [640, 450], [200, 690]], float)
    world = cal.apply_h(H_true, good_px)
    H, _ = cal.fit_homography(good_px, world)
    rep = cal.reprojection_report(H, good_px, world, (1280, 720))
    assert rep["rmse_m"] < 1e-6 and cal.grade(rep)[0] == "good"
    clustered = np.array([[600, 500], [620, 505], [610, 520], [630, 515]], float)
    rep2 = cal.reprojection_report(*cal.fit_homography(clustered, cal.apply_h(H_true, clustered))[:1], clustered,
                                   cal.apply_h(H_true, clustered), (1280, 720))
    grade, reasons = cal.grade(rep2)
    assert grade == "weak" and any("clustered" in r for r in reasons)


def test_one_person_seen_by_both_cameras_is_one_identity():
    walk = lambda t: (1 + 0.9 * t, 3.0)
    a = make_tracklet("cam1:1", "cam1", 0, 12, walk, app=RED)
    b = make_tracklet("cam2:1", "cam2", 0, 12, walk, app=RED)
    r, frames = resolve([a, b])
    assert ids_at(frames, 6.0, "cam1:1") == ids_at(frames, 6.0, "cam2:1")
    # thanks to the decision lag the two tracks share an identity from (nearly) the first tick
    assert ids_at(frames, 1.0, "cam1:1") == ids_at(frames, 1.0, "cam2:1")
    people = [f for f, _ in frames if abs(f["t"] - 6.0) < 1e-6][0]["people"]
    assert len([p for p in people if p["state"] in ("active", "ambiguous")]) == 1


def test_handoff_between_cameras_keeps_identity():
    walk = lambda t: (0.8 * t, 2.0)
    a = make_tracklet("cam1:1", "cam1", 0, 10, walk, app=RED)        # leaves camera 1 at t=10 ...
    b = make_tracklet("cam2:1", "cam2", 7, 18, walk, app=RED)        # ... camera 2 has them from t=7
    r, frames = resolve([a, b])
    assert ids_at(frames, 15.0, "cam2:1") == ids_at(frames, 5.0, "cam1:1")


def test_temporary_occlusion_reacquired():
    still = lambda t: (4.0, 4.0)
    a = make_tracklet("cam1:1", "cam1", 0, 10, still, app=BLUE)
    b = make_tracklet("cam1:2", "cam1", 12, 20, still, app=BLUE)     # 2 s gap, same place
    r, frames = resolve([a, b])
    assert ids_at(frames, 15.0, "cam1:2") == ids_at(frames, 5.0, "cam1:1")


def test_seated_neighbours_with_different_clothes_not_merged():
    # each seen by one camera only, sitting 0.6 m apart, clothing clearly different
    a = make_tracklet("cam1:1", "cam1", 0, 60, lambda t: (5.0, 5.0), sigma=0.45, app=GREY, noise=0.15)
    b = make_tracklet("cam2:1", "cam2", 0, 60, lambda t: (5.6, 5.0), sigma=0.45, app=RED, noise=0.15)
    r, frames = resolve([a, b])
    assert ids_at(frames, 50.0, "cam1:1") != ids_at(frames, 50.0, "cam2:1")


def test_teleport_is_rejected():
    a = make_tracklet("cam1:1", "cam1", 0, 10, lambda t: (1.0, 1.0), app=BLUE)
    b = make_tracklet("cam1:2", "cam1", 10.4, 20, lambda t: (12.0, 9.0), app=BLUE)  # 13 m in 0.4 s
    r, frames = resolve([a, b])
    assert ids_at(frames, 15.0, "cam1:2") != ids_at(frames, 5.0, "cam1:1")


def test_two_similar_people_crossing_stay_distinct():
    # same clothes, walking towards each other, crossing at t=5, both cameras see both
    p = lambda t: (1 + 0.8 * t, 3.0)
    q = lambda t: (9 - 0.8 * t, 3.4)
    ts = [make_tracklet("cam1:1", "cam1", 0, 10, p, app=GREY), make_tracklet("cam1:2", "cam1", 0, 10, q, app=GREY),
          make_tracklet("cam2:1", "cam2", 0, 10, p, app=GREY), make_tracklet("cam2:2", "cam2", 0, 10, q, app=GREY)]
    r, frames = resolve(ts)
    g = {k: ids_at(frames, 8.0, k) for k in ("cam1:1", "cam1:2", "cam2:1", "cam2:2")}
    assert g["cam1:1"] == g["cam2:1"] and g["cam1:2"] == g["cam2:2"] and g["cam1:1"] != g["cam1:2"]


def test_edge_truncated_person_is_not_linked_on_geometry():
    a = make_tracklet("cam1:1", "cam1", 0, 40, lambda t: (2.0, 2.0), app=GREY, edge=True)
    b = make_tracklet("cam2:1", "cam2", 0, 40, lambda t: (2.2, 2.0), app=RED)
    r, frames = resolve([a, b])
    assert ids_at(frames, 30.0, "cam1:1") != ids_at(frames, 30.0, "cam2:1")


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"ok    {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL  {t.__name__}: {e}")
    print(f"{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
