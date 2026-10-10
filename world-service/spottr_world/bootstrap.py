"""Bootstrap a shared floor calibration + time offset from people seen by both cameras.

Used for the Great Hall, which has no surveyed floor plan. Produces a calibration document in the same
format an operator-landmark calibration produces (calibration.py), so the rest of the pipeline does not
care where the homographies came from.
"""
from __future__ import annotations

import json
import math
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

from . import calibration as cal
from .crosscam_align import bin_samples, ransac_align, rigid_from_pairs, score, transform
from .rawio import load_meta, load_raw
from .tracklets import project_observations


def _sim_matrix(s: float, theta: float, t: np.ndarray) -> np.ndarray:
    c, si = math.cos(theta), math.sin(theta)
    return np.array([[s * c, -s * si, t[0]], [s * si, s * c, t[1]], [0, 0, 1.0]])


def background_plate(video: str, out: Path, n: int = 60) -> np.ndarray:
    """Median of frames spread over the video: removes people, keeps the room (calibration backdrop)."""
    if out.exists():
        return cv2.imread(str(out))
    cap = cv2.VideoCapture(video)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frames = []
    for i in np.linspace(int(total * 0.05), total - 30, n).astype(int):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(i))
        ok, f = cap.read()
        if ok:
            frames.append(f)
    cap.release()
    plate = np.median(np.stack(frames), axis=0).astype(np.uint8)
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), plate, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return plate


def audio_prior(video_a: str, video_b: str, out: Path) -> dict:
    if out.exists():
        return json.loads(out.read_text())
    r = subprocess.run([sys.executable, "-m", "spottr_world.audio_sync", video_a, video_b],
                       capture_output=True, text=True, check=True)
    out.write_text(r.stdout)
    return json.loads(r.stdout)


def bootstrap(run_dir: Path, cameras: list[dict], manual_offset: float | None = None, log=print) -> dict:
    """cameras: [{"camera_id", "label", "video"}]; the first one is the reference clock and frame."""
    assert len(cameras) == 2, "bootstrap aligns exactly two cameras; add more cameras pairwise"
    ca, cb = cameras
    obs = {c["camera_id"]: load_raw(run_dir, c["camera_id"]) for c in cameras}
    meta = {c["camera_id"]: load_meta(run_dir, c["camera_id"]) for c in cameras}

    # 1. self-calibrate each camera from standing people + plumb-line vanishing point
    models, reports, Hcam, vps = {}, {}, {}, {}
    for c in cameras:
        cid = c["camera_id"]
        size = (meta[cid]["video"]["width"], meta[cid]["video"]["height"])
        plate = background_plate(c["video"], run_dir / "plates" / f"{cid}.jpg")
        vpr = cal.plumb_vanishing_point(plate)
        vps[cid] = np.array(vpr["vp"]) if vpr else None
        log(f"  plumb-line vanishing point {cid}: {vpr}")
        samples = cal.standing_samples(obs[cid])
        cam, rep = cal.self_calibrate(samples, size, vps[cid])
        models[cid], reports[cid], Hcam[cid] = cam, rep, cam.image_to_floor_h()
        log(f"  self-calibration {cid}: {cam.to_dict()}  {rep}")

    # 2. time-offset prior from audio
    prior = audio_prior(ca["video"], cb["video"], run_dir / "audio_sync.json")
    log(f"  audio prior: offset {prior['offset_s']} s, z={prior['z']}, confidence {prior['confidence']}")
    off0 = manual_offset if manual_offset is not None else (prior["offset_s"] if prior["confidence"] != "low" else 0.0)

    # 3. rigid alignment of B's floor frame into A's, by RANSAC over co-observed people
    pa, _, _ = project_observations(obs[ca["camera_id"]], Hcam[ca["camera_id"]], 0.0)
    pb, _, _ = project_observations(obs[cb["camera_id"]], Hcam[cb["camera_id"]], 0.0)
    dur = min(meta[ca["camera_id"]]["video"]["duration_s"], meta[cb["camera_id"]]["video"]["duration_s"])
    nb = int(dur) + 1
    A = bin_samples(obs[ca["camera_id"]], pa, 0.0, 0.0, nb)
    B = bin_samples(obs[cb["camera_id"]], pb, off0, 0.0, nb)
    al = ransac_align(A, B)
    log(f"  alignment @offset {off0:+.2f}s: scale {al['scale']:.3f} theta {math.degrees(al['theta']):.1f} deg "
        f"t {al['t'].round(2)} inliers {al['inliers']} support {al['support']:.0f} residual {al['mean_residual_m']:.2f} m")

    # 3b. joint refinement of both cameras + rigid transform on the RANSAC inlier pairs
    def refine(Abin, Bbin, al_):
        n_, _, (bins_, ia_, ib_) = score(Abin, Bbin, al_["scale"], al_["theta"], al_["t"])
        qa = Abin.weight[bins_, ia_] * Bbin.weight[bins_, ib_]
        # Only pairs that are independently plausible: clothing agrees, or both people are walking
        # (two walkers cannot coincide on the floor by accident for long). Stationary look-alikes are
        # exactly what would drag a calibration onto a wrong correspondence.
        sim = np.einsum("nd,nd->n", Abin.app[bins_, ia_], Bbin.app[bins_, ib_])
        has_app = Abin.app[bins_, ia_].any(1) & Bbin.app[bins_, ib_].any(1)
        mv = Abin.moving[bins_, ia_] & Bbin.moving[bins_, ib_]
        ok_ = (has_app & (sim >= 0.8)) | mv
        qa = np.where(ok_, qa * (1 + 2 * mv), 0)
        # cap each track pair so long-seated people do not dominate the fit
        ta, tb = Abin.track[bins_, ia_], Bbin.track[bins_, ib_]
        order = np.argsort(-qa)
        seen_pairs: dict = {}
        keep = []
        for k_ in order:
            if qa[k_] <= 0:
                break
            key_ = (int(ta[k_]), int(tb[k_]))
            if seen_pairs.get(key_, 0) >= 15:
                continue
            seen_pairs[key_] = seen_pairs.get(key_, 0) + 1
            keep.append(k_)
            if len(keep) >= 600:
                break
        keep = np.asarray(keep, int)
        pxa = Abin.px[bins_[keep], ia_[keep]]
        pxb = Bbin.px[bins_[keep], ib_[keep]]
        mb = models[cb["camera_id"]]
        mb_scaled = cal.FloorCamera(mb.f, mb.pitch, mb.roll, mb.height * al_["scale"], mb.cx, mb.cy)
        a2, b2, th2, t2, rep_ = cal.joint_refine(models[ca["camera_id"]], mb_scaled,
                                                  cal.standing_samples(obs[ca["camera_id"]]),
                                                  cal.standing_samples(obs[cb["camera_id"]]), pxa, pxb,
                                                  al_["theta"], al_["t"], vps[ca["camera_id"]], vps[cb["camera_id"]])
        models[ca["camera_id"]], models[cb["camera_id"]] = a2, b2
        for cid_ in (ca["camera_id"], cb["camera_id"]):
            Hcam[cid_] = models[cid_].image_to_floor_h()
        log(f"  joint refinement: A {a2.to_dict()}  B {b2.to_dict()}  {rep_}")
        return {"scale": 1.0, "theta": th2, "t": t2}, rep_

    al, joint_rep = refine(A, B, al)
    pa, _, _ = project_observations(obs[ca["camera_id"]], Hcam[ca["camera_id"]], 0.0)
    pb, _, _ = project_observations(obs[cb["camera_id"]], Hcam[cb["camera_id"]], 0.0)

    # 4. offset refinement: fine bins, agreement of *moving* people only (stationary ones match at any offset)
    def moving(o_list, p):
        keep = []
        by_tr: dict[int, list[int]] = {}
        for i, o in enumerate(o_list):
            by_tr.setdefault(o["local_track_id"], []).append(i)
        for idx in by_tr.values():
            idx.sort(key=lambda i: o_list[i]["t_local"])
            P = p[idx]
            T = np.array([o_list[i]["t_local"] for i in idx])
            for j, i in enumerate(idx):
                lo, hi = max(0, j - 7), min(len(idx) - 1, j + 7)
                if T[hi] - T[lo] > 0.5 and np.all(np.isfinite(P[[lo, hi]])):
                    if np.linalg.norm(P[hi] - P[lo]) / (T[hi] - T[lo]) > 0.5:
                        keep.append(i)
        return keep

    ka, kb = moving(obs[ca["camera_id"]], pa), moving(obs[cb["camera_id"]], pb)
    oa = [obs[ca["camera_id"]][i] for i in ka]
    ob = [obs[cb["camera_id"]][i] for i in kb]
    bin_s = 0.2
    nbf = int(dur / bin_s) + 1
    Af = bin_samples(oa, pa[ka], 0.0, 0.0, nbf, bin_s=bin_s)
    scan = []
    s, th, t = al["scale"], al["theta"], al["t"]
    center = off0
    for width, step in ((4.0, 0.2), (0.6, 0.033)):
        for off in np.arange(center - width, center + width + 1e-9, step):
            Bf = bin_samples(ob, pb[kb], off, 0.0, nbf, bin_s=bin_s)
            n, res, _ = score(Af, Bf, s, th, t, inlier_m=0.6)
            scan.append((round(float(off), 3), n, round(res, 3)))
        center = max(scan, key=lambda r: (r[1], -r[2]))[0]
    offset = manual_offset if manual_offset is not None else center
    best = max(scan, key=lambda r: (r[1], -r[2]))
    ns = sorted({r[1] for r in scan})
    second = max((r[1] for r in scan if abs(r[0] - best[0]) > 0.5), default=0)
    sync_conf = "high" if best[1] >= 1.5 * max(second, 1) and best[1] >= 30 else "medium" if best[1] > second else "low"
    log(f"  trajectory offset: {best[0]:+.3f}s ({best[1]} moving matches, next-best elsewhere {second}) -> {sync_conf}")

    # 5. re-pair at the chosen offset and refine once more
    A = bin_samples(obs[ca["camera_id"]], pa, 0.0, 0.0, nb)
    B = bin_samples(obs[cb["camera_id"]], pb, offset, 0.0, nb)
    al, joint_rep = refine(A, B, al)
    pa, _, _ = project_observations(obs[ca["camera_id"]], Hcam[ca["camera_id"]], 0.0)
    pb, _, _ = project_observations(obs[cb["camera_id"]], Hcam[cb["camera_id"]], 0.0)
    A = bin_samples(obs[ca["camera_id"]], pa, 0.0, 0.0, nb)
    B = bin_samples(obs[cb["camera_id"]], pb, offset, 0.0, nb)
    _, res, pairs = score(A, B, al["scale"], al["theta"], al["t"])
    n = len(pairs[0])
    log(f"  final alignment: inliers {n}  residual {res:.2f} m")

    # 6. room frame: x along the line from camera A to camera B (landscape map), y down (SVG convention)
    camB_in_A = transform(al["scale"], al["theta"], al["t"], np.zeros((1, 2)))[0]
    ang = math.atan2(camB_in_A[1], camB_in_A[0])
    R = np.array([[math.cos(-ang), -math.sin(-ang), 0], [math.sin(-ang), math.cos(-ang), 0], [0, 0, 1]])
    flip = np.diag([1.0, -1.0, 1.0])
    S_A = flip @ R
    S_B = flip @ R @ _sim_matrix(al["scale"], al["theta"], al["t"])
    Hw = {ca["camera_id"]: S_A @ Hcam[ca["camera_id"]], cb["camera_id"]: S_B @ Hcam[cb["camera_id"]]}
    # translate so people positions start near (1, 1)
    allp = []
    for c in cameras:
        cid = c["camera_id"]
        pw, _, _ = project_observations(obs[cid], Hw[cid], 0.0)
        allp.append(pw[np.isfinite(pw[:, 0])])
    allp = np.vstack(allp)
    lo = np.percentile(allp, 1, axis=0)
    hi = np.percentile(allp, 99, axis=0)
    shift = np.array([[1, 0, -lo[0] + 1.5], [0, 1, -lo[1] + 1.5], [0, 0, 1.0]])
    for cid in Hw:
        Hw[cid] = shift @ Hw[cid]
        Hw[cid] /= Hw[cid][2, 2]
    room_w, room_h = float(hi[0] - lo[0] + 3.0), float(hi[1] - lo[1] + 3.0)

    # camera poses in the room frame, coverage from where people were actually observed
    cams_doc = []
    for c, S in ((ca, shift @ S_A), (cb, shift @ S_B)):
        cid = c["camera_id"]
        m = models[cid]
        pos = (S @ np.array([0, 0, 1.0]))[:2]
        fwd = (S @ np.array([0, 1, 1.0]))[:2] - pos
        heading = math.degrees(math.atan2(fwd[1], fwd[0]))
        W, Hh = meta[cid]["video"]["width"], meta[cid]["video"]["height"]
        fov = math.degrees(2 * math.atan(W / 2 / m.f))
        fp = np.array([o["floor_point_px"] for o in obs[cid] if o["floor_method"] in ("ankles", "one_ankle", "knees", "seated_hips")
                       and "touches_frame_edge" not in o["quality_flags"]], np.float32)
        hull_px = cv2.convexHull(fp).reshape(-1, 2)
        hull_w = cal.apply_h(Hw[cid], hull_px)
        cams_doc.append({
            "camera_id": cid,
            "label": c["label"],
            "video": Path(c["video"]).name,
            "image_size": [W, Hh],
            "time_offset_s": 0.0 if cid == ca["camera_id"] else round(float(offset), 3),
            "position_world": [round(float(pos[0]), 2), round(float(pos[1]), 2)],
            "heading_deg": round(heading, 1),
            "horizontal_fov_deg": round(fov, 1),
            "camera_model": dict(m.to_dict(), source="self_calibration_people+joint_crosscam_refinement", initial_fit=reports[cid]),
            "homography_image_to_world": Hw[cid].round(10).tolist(),
            "coverage_polygon_px": hull_px.round(1).tolist(),
            "coverage_polygon_world": hull_w.round(2).tolist(),
            "landmarks": [],
            "source": "bootstrap_people",
        })

    doc = {
        "schema_version": cal.SCHEMA_VERSION,
        "calibration_id": "great_hall_bootstrap",
        "site": "Great Hall",
        "units": "m",
        "frame": "x along camera 1 -> camera 2, y down (SVG); origin near the room's first corner",
        "floor_map": {"width_m": round(room_w, 2), "height_m": round(room_h, 2), "landmarks": [],
                      "scale_note": "metric scale from average adult eye height; no surveyed floor plan"},
        "cameras": cams_doc,
        "sync": {
            "reference_camera": ca["camera_id"],
            "offsets_s": {ca["camera_id"]: 0.0, cb["camera_id"]: round(float(offset), 3)},
            "method": "manual override" if manual_offset is not None else "audio prior + moving-people trajectory agreement",
            "audio_prior": {k: v for k, v in prior.items() if k != "windows"},
            "trajectory_scan_best": {"offset_s": best[0], "moving_matches": best[1], "mean_residual_m": best[2],
                                     "next_best_elsewhere": second},
            "confidence": sync_conf,
            "scan": scan,
        },
        "cross_camera_alignment": {
            "method": "RANSAC rigid on co-observed people (1 s bins), then joint least-squares refinement of both cameras",
            "joint_refinement": joint_rep,
            "rotation_deg": round(math.degrees(al["theta"]), 2),
            "inlier_pairs": int(n),
            "mean_residual_m": round(float(res), 3),
        },
    }
    return doc


def _line_intersection(p1, p2, q1, q2) -> np.ndarray:
    a = np.cross(np.append(p1, 1), np.append(p2, 1))
    b = np.cross(np.append(q1, 1), np.append(q2, 1))
    x = np.cross(a, b)
    return x[:2] / x[2]


def finalize_room(doc: dict, clicks: dict, run_dir: Path, log=print) -> dict:
    """Align the map to the room walls, add the room outline, landmarks and a calibration quality report.

    clicks: data/calibration/<site>_clicks.json. Wall-base lines: each camera's far end wall and one long
    side wall. The two long side walls set the map orientation (long axis horizontal); the four lines
    give the outline. How far the walls are from meeting at right angles is reported as a quality signal.
    """
    cams = {c["camera_id"]: c for c in doc["cameras"]}
    H = {cid: np.asarray(c["homography_image_to_world"]) for cid, c in cams.items()}
    walls = {}
    for cid, cc in clicks["cameras"].items():
        for name, seg in cc["wall_base"].items():
            walls[(cid, name)] = cal.apply_h(H[cid], np.asarray(seg, float))
    ids = sorted(clicks["cameras"])
    sides = [walls[(cid, "long_side")] for cid in ids]
    angs = [math.atan2(*(s[1] - s[0])[::-1]) for s in sides]
    # average direction mod pi
    ang = math.atan2(np.mean([math.sin(2 * a) for a in angs]), np.mean([math.cos(2 * a) for a in angs])) / 2
    R = np.array([[math.cos(-ang), -math.sin(-ang), 0], [math.sin(-ang), math.cos(-ang), 0], [0, 0, 1.0]])
    rot = lambda P: (np.c_[P, np.ones(len(P))] @ R.T)[:, :2]
    W = {k: rot(v) for k, v in walls.items()}
    a_side, b_side = W[(ids[0], "long_side")], W[(ids[1], "long_side")]
    a_end, b_end = W[(ids[0], "far_end")], W[(ids[1], "far_end")]
    corners = np.array([_line_intersection(*a_side, *a_end), _line_intersection(*a_end, *b_side),
                        _line_intersection(*b_side, *b_end), _line_intersection(*b_end, *a_side)])
    lo = corners.min(0)
    T = np.array([[1, 0, -lo[0]], [0, 1, -lo[1]], [0, 0, 1.0]]) @ R
    corners = corners - lo

    def wall_angle(seg):
        d = seg[1] - seg[0]
        return math.degrees(math.atan2(d[1], d[0])) % 180

    side_a = [wall_angle(W[(cid, "long_side")]) for cid in ids]
    end_a = [wall_angle(W[(cid, "far_end")]) for cid in ids]
    dev = [abs(((e - s) % 180) - 90) for e in end_a for s in side_a]
    rect_dev = round(float(np.mean(dev)), 1)

    for cid, c in cams.items():
        Hn = T @ H[cid]
        c["homography_image_to_world"] = (Hn / Hn[2, 2]).round(10).tolist()
        c["position_world"] = [round(float(v), 2) for v in (T @ np.r_[c["position_world"], 1])[:2]]
        c["heading_deg"] = round(c["heading_deg"] - math.degrees(ang), 1)
        c["coverage_polygon_world"] = np.round((np.c_[c["coverage_polygon_world"], np.ones(len(c["coverage_polygon_world"]))] @ T.T)[:, :2], 2).tolist()
        cl = clicks["cameras"].get(cid, {})
        c["landmarks"] = [{"landmark_id": l["id"], "pixel": l["pixel"]} for l in cl.get("landmarks", [])]
        c["wall_base_px"] = cl.get("wall_base", {})
    landmarks = []
    for cid, cl in clicks["cameras"].items():
        Hn = np.asarray(cams[cid]["homography_image_to_world"])
        for l in cl["landmarks"]:
            w = cal.apply_h(Hn, [l["pixel"]])[0]
            landmarks.append({"id": l["id"], "name": l["name"], "camera_id": cid,
                              "world": [round(float(w[0]), 2), round(float(w[1]), 2)],
                              "world_source": "derived from bootstrap (no surveyed floor plan)"})
    width, height = corners.max(0)
    doc["floor_map"].update({
        "width_m": round(float(width), 2), "height_m": round(float(height), 2),
        "outline": corners.round(2).tolist(),
        "walls": {f"{cid}:{name}": np.round(v - lo, 2).tolist() for (cid, name), v in W.items()},
        "landmarks": landmarks,
    })
    doc["frame"] = "x along the room's long walls, y across (SVG convention, y down); origin at the outline's min corner"

    # --- quality report: only checks that are independent of the fit itself
    jr = doc["cross_camera_alignment"]["joint_refinement"]
    vp = {cid: {"measured": c["camera_model"].get("initial_fit", {}).get("plumb_vanishing_point"),
                "model": [round(float(v), 1) for v in cal.FloorCamera(
                    c["camera_model"]["fx"], math.radians(c["camera_model"]["pitch_deg"]),
                    math.radians(c["camera_model"]["roll_deg"]), c["camera_model"]["height_m"],
                    c["camera_model"]["cx"], c["camera_model"]["cy"]).vertical_vp()]}
          for cid, c in cams.items()}
    reasons = []
    level = 0
    if jr["pair_p90_m"] > 0.8:
        level, _ = 2, reasons.append(f"cross-camera p90 {jr['pair_p90_m']} m")
    elif jr["pair_p90_m"] > cal.FAIR_RMSE_M:
        level = max(level, 1)
        reasons.append(f"co-observed people agree within {jr['pair_p90_m']} m (p90), not within {cal.FAIR_RMSE_M} m")
    if rect_dev > 10:
        level = max(level, 1)
        reasons.append(f"room walls meet {rect_dev} deg away from square: far-field distortion, positions near the far walls are less reliable")
    reasons.append("metric scale rests on an average eye-height prior (~5 % uncertainty)")
    reasons.append("landmark world positions are derived, not surveyed: they do not independently test accuracy")
    doc["quality"] = {
        "grade": ["good", "fair", "weak"][level],
        "reasons": reasons,
        "cross_camera_floor_agreement_m": {"median": jr["pair_median_m"], "p90": jr["pair_p90_m"], "pairs": jr["pairs"],
                                           "what": "same person at the same time, projected by each camera (people with visible feet or seated estimates)"},
        "eye_height_residual_px": jr["eye_median_px"],
        "wall_rectangularity_deviation_deg": rect_dev,
        "plumb_vanishing_points": vp,
    }
    for c in doc["cameras"]:
        c["quality"] = doc["quality"]["grade"]
        c["quality_reasons"] = reasons
    log(f"  room: {width:.1f} x {height:.1f} m, walls {rect_dev} deg from square, grade {doc['quality']['grade']}")
    return doc
