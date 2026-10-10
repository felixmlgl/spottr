"""Camera calibration to one shared floor map.

Two ways to get a camera's image->floor homography, stored in the same document format
(see docs/SCHEMA.md, "Calibration"):

1. Operator landmarks (the product workflow): an operator clicks >= 4 (ideally 6-8) fixed floor
   landmarks in a camera image and places the same landmarks on the floor plan. We fit a homography
   (normalized DLT + RANSAC + least-squares refinement), report reprojection error and flag weak
   calibrations instead of pretending they are accurate.

2. Self-calibration from people (used to bootstrap the Great Hall, which has no surveyed floor plan):
   standing people with visible feet and eyes constrain a pinhole camera (focal, pitch, roll, height)
   given an average adult eye height. That yields a metric floor homography in a camera-centric frame;
   the cameras are then aligned to each other by a 2D rigid transform (see crosscam_align.py).

World frame: metres on the floor plane, x to the right on the floor plan, y down the floor plan
(SVG-style), z up. Every camera is a set of observations of that one frame.
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
from scipy.optimize import least_squares

SCHEMA_VERSION = "spottr.calibration/1"

# Quality thresholds (metres on the floor). Association gates are ~1 m, so >0.5 m error is not usable.
GOOD_RMSE_M = 0.25
FAIR_RMSE_M = 0.5
MIN_LANDMARKS = 4
RECOMMENDED_LANDMARKS = 6


# --------------------------------------------------------------------------------------------------
# Homography helpers
# --------------------------------------------------------------------------------------------------

def apply_h(H: np.ndarray, pts: np.ndarray) -> np.ndarray:
    pts = np.asarray(pts, np.float64).reshape(-1, 2)
    p = np.hstack([pts, np.ones((len(pts), 1))]) @ H.T
    return p[:, :2] / p[:, 2:3]


def h_valid_mask(H: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """True where the image point is below the floor horizon (projects in front of the camera)."""
    pts = np.asarray(pts, np.float64).reshape(-1, 2)
    w = np.hstack([pts, np.ones((len(pts), 1))]) @ H[2]
    return w > 1e-9 if np.median(w) > 0 else w < -1e-9


def world_sigma(H: np.ndarray, px: np.ndarray, sigma_px: float) -> float:
    """1-sigma world position uncertainty (m) for a vertical image uncertainty of sigma_px."""
    a = apply_h(H, [px])[0]
    b = apply_h(H, [[px[0], px[1] + sigma_px]])[0]
    return float(np.linalg.norm(b - a))


def fit_homography(px: np.ndarray, world: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Image px -> world metres. Returns (H, inlier mask)."""
    px = np.asarray(px, np.float64)
    world = np.asarray(world, np.float64)
    if len(px) < MIN_LANDMARKS:
        raise ValueError(f"need at least {MIN_LANDMARKS} landmarks, got {len(px)}")
    if len(px) == 4:
        H = cv2.getPerspectiveTransform(px.astype(np.float32), world.astype(np.float32))
        return H, np.ones(4, bool)
    H, mask = cv2.findHomography(px, world, cv2.RANSAC, 0.6)
    if H is None:
        H, mask = cv2.findHomography(px, world, 0)
    mask = mask.ravel().astype(bool) if mask is not None else np.ones(len(px), bool)
    # Least-squares refinement on inliers
    if mask.sum() >= 5:
        H2, _ = cv2.findHomography(px[mask], world[mask], 0)
        if H2 is not None:
            H = H2
    return H / H[2, 2], mask


def reprojection_report(H: np.ndarray, px: np.ndarray, world: np.ndarray, image_size: tuple[int, int]) -> dict:
    px = np.asarray(px, np.float64)
    world = np.asarray(world, np.float64)
    pred_w = apply_h(H, px)
    err_m = np.linalg.norm(pred_w - world, axis=1)
    Hinv = np.linalg.inv(H)
    pred_px = apply_h(Hinv, world)
    err_px = np.linalg.norm(pred_px - px, axis=1)
    # Leave-one-out error: the honest number when the fit has few points (training error is optimistic).
    loo = []
    if len(px) >= 6:
        for k in range(len(px)):
            m = np.ones(len(px), bool)
            m[k] = False
            Hk, _ = cv2.findHomography(px[m], world[m], 0)
            if Hk is not None:
                loo.append(float(np.linalg.norm(apply_h(Hk, px[k:k + 1])[0] - world[k])))
    hull = cv2.convexHull(px.astype(np.float32))
    spread = float(cv2.contourArea(hull)) / float(image_size[0] * image_size[1])
    return {
        "n": int(len(px)),
        "rmse_m": round(float(np.sqrt((err_m ** 2).mean())), 3),
        "max_m": round(float(err_m.max()), 3),
        "rmse_px": round(float(np.sqrt((err_px ** 2).mean())), 2),
        "loo_rmse_m": round(float(np.sqrt(np.mean(np.square(loo)))), 3) if loo else None,
        "image_spread": round(spread, 3),
        "per_landmark_m": [round(float(e), 3) for e in err_m],
    }


def grade(report: dict) -> tuple[str, list[str]]:
    reasons = []
    level = 0  # 0 good, 1 fair, 2 weak
    n = report["n"]
    if n < RECOMMENDED_LANDMARKS:
        reasons.append(f"only {n} landmarks (recommend {RECOMMENDED_LANDMARKS}-8)")
        level = max(level, 1 if n >= 5 else 2)
    if report["image_spread"] < 0.08:
        reasons.append("landmarks are clustered in a small part of the image")
        level = max(level, 2)
    elif report["image_spread"] < 0.15:
        reasons.append("landmarks cover a limited part of the image")
        level = max(level, 1)
    err = report["loo_rmse_m"] if report["loo_rmse_m"] is not None else report["rmse_m"]
    if err > FAIR_RMSE_M:
        reasons.append(f"floor error {err:.2f} m is above {FAIR_RMSE_M} m")
        level = max(level, 2)
    elif err > GOOD_RMSE_M:
        reasons.append(f"floor error {err:.2f} m is above {GOOD_RMSE_M} m")
        level = max(level, 1)
    return ["good", "fair", "weak"][level], reasons


# --------------------------------------------------------------------------------------------------
# Pinhole floor camera (self-calibration from people)
# --------------------------------------------------------------------------------------------------

EYE_HEIGHT_M = 1.57      # average adult eye height (stature ~1.69 m); per-person variation is noise
EYE_HEIGHT_SD_M = 0.09
# Focal-length prior for phone main-camera video, scaled to image width: f ~ 0.78 x width (HFOV ~65 deg).
# Eye heights alone cannot separate "far + zoomed" from "near + wide" when people are small, so this
# regularises the fit. It is an assumption, reported in the calibration output.
F_PRIOR_PER_WIDTH = 0.78
F_PRIOR_SD_PER_WIDTH = 0.16
F_PRIOR_WEIGHT_PX = 10.0


@dataclass
class FloorCamera:
    """Pinhole camera above a floor plane z=0. Camera at (0, 0, height), looking along +y, tilted down."""
    f: float
    pitch: float   # radians, positive = looking down
    roll: float    # radians
    height: float  # metres
    cx: float
    cy: float
    extra: dict = field(default_factory=dict)

    def K(self) -> np.ndarray:
        return np.array([[self.f, 0, self.cx], [0, self.f, self.cy], [0, 0, 1.0]])

    def R(self) -> np.ndarray:
        t = self.pitch
        x_c = np.array([1.0, 0, 0])
        y_c = np.array([0, -math.sin(t), -math.cos(t)])
        z_c = np.array([0, math.cos(t), -math.sin(t)])
        R0 = np.stack([x_c, y_c, z_c])
        c, s = math.cos(self.roll), math.sin(self.roll)
        Rr = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1.0]])
        return Rr @ R0

    def C(self) -> np.ndarray:
        return np.array([0, 0, self.height])

    def project(self, X: np.ndarray) -> np.ndarray:
        X = np.atleast_2d(X)
        p = (self.K() @ self.R() @ (X - self.C()).T).T
        return p[:, :2] / p[:, 2:3]

    def vertical_vp(self) -> np.ndarray:
        """Image position of the vanishing point of world-vertical lines (plumb lines)."""
        d = self.K() @ self.R() @ np.array([0, 0, -1.0])
        return d[:2] / d[2]

    def floor_to_image_h(self) -> np.ndarray:
        R = self.R()
        t = -R @ self.C()
        return self.K() @ np.column_stack([R[:, 0], R[:, 1], t])

    def image_to_floor_h(self) -> np.ndarray:
        H = np.linalg.inv(self.floor_to_image_h())
        return H / H[2, 2]

    def to_dict(self) -> dict:
        return {
            "type": "pinhole_floor",
            "fx": round(self.f, 1), "fy": round(self.f, 1), "cx": self.cx, "cy": self.cy,
            "pitch_deg": round(math.degrees(self.pitch), 2),
            "roll_deg": round(math.degrees(self.roll), 2),
            "height_m": round(self.height, 2),
            "distortion": None,
            **self.extra,
        }


VP_TOLERANCE = 0.05     # 5 % of the VP's distance from the image centre ~ 1 sigma
VP_WEIGHT_PX = 10.0


def vp_residual(cam: "FloorCamera", vp: np.ndarray | None, n_eff: int) -> np.ndarray:
    if vp is None:
        return np.zeros(0)
    pred = cam.vertical_vp()
    rel = max(abs(vp[1] - cam.cy), 1.0)
    w = VP_WEIGHT_PX / VP_TOLERANCE * math.sqrt(max(1, n_eff) / 20)
    return np.array([(pred[1] - vp[1]) / rel * w, (pred[0] - vp[0]) / rel * w])


def plumb_vanishing_point(plate: np.ndarray, seed: int = 0) -> dict | None:
    """Vertical vanishing point from near-vertical line segments (door frames, wall edges, hanging chains)."""
    g = cv2.cvtColor(plate, cv2.COLOR_BGR2GRAY)
    lines = cv2.createLineSegmentDetector().detect(g)[0]
    if lines is None:
        return None
    segs = []
    for x1, y1, x2, y2 in lines.reshape(-1, 4):
        dx, dy = x2 - x1, y2 - y1
        ln = math.hypot(dx, dy)
        ang = abs(math.degrees(math.atan2(dx, dy))) % 180
        if ln >= 50 and min(ang, 180 - ang) < 25:
            segs.append((x1, y1, x2, y2, ln))
    if len(segs) < 6:
        return None
    L = np.array(segs)
    P1 = np.column_stack([L[:, 0], L[:, 1], np.ones(len(L))])
    P2 = np.column_stack([L[:, 2], L[:, 3], np.ones(len(L))])
    Hl = np.cross(P1, P2)
    Hl /= np.linalg.norm(Hl[:, :2], axis=1, keepdims=True)
    mid, seg = (P1[:, :2] + P2[:, :2]) / 2, P2[:, :2] - P1[:, :2]
    rng = np.random.default_rng(seed)
    best = (0.0, None)
    for _ in range(4000):
        i, j = rng.choice(len(L), 2, replace=False)
        v = np.cross(Hl[i], Hl[j])
        if abs(v[2]) < 1e-9:
            continue
        v = v / v[2]
        d = v[:2] - mid
        c = np.abs((d * seg).sum(1)) / (np.linalg.norm(d, axis=1) * np.linalg.norm(seg, axis=1) + 1e-9)
        inl = np.degrees(np.arccos(np.clip(c, 0, 1))) < 1.0
        sc = float(L[inl, 4].sum())
        if sc > best[0]:
            best = (sc, inl)
    sc, inl = best
    _, _, Vt = np.linalg.svd(Hl[inl])
    v = Vt[-1] / Vt[-1][2]
    return {"vp": [round(float(v[0]), 1), round(float(v[1]), 1)], "segments": int(inl.sum()),
            "total_length_px": round(sc)}


def standing_samples(observations: list[dict], max_per_track_per_s: float = 2.0) -> np.ndarray:
    """(foot_u, foot_v, eye_u, eye_v) for clearly standing people with visible ankles and eyes."""
    out = []
    last: dict[int, float] = {}
    for o in observations:
        kp = o.get("keypoints")
        if not kp or o["floor_method"] != "ankles" or "touches_frame_edge" in o["quality_flags"]:
            continue
        k = np.asarray(kp)
        if min(k[1, 2], k[2, 2], k[11, 2], k[12, 2], k[13, 2], k[14, 2], k[15, 2], k[16, 2]) < 0.5:
            continue
        hip = (k[11, :2] + k[12, :2]) / 2
        knee = (k[13, :2] + k[14, :2]) / 2
        ank = (k[15, :2] + k[16, :2]) / 2
        eye = (k[1, :2] + k[2, :2]) / 2
        thigh, shin = knee - hip, ank - knee
        # straight, roughly vertical legs: thigh and shin aligned and leg length ~ body proportion
        cosang = float(thigh @ shin / (np.linalg.norm(thigh) * np.linalg.norm(shin) + 1e-9))
        leg = ank[1] - hip[1]
        body = ank[1] - eye[1]
        if cosang < 0.92 or body < 45 or not (0.40 < leg / body < 0.64):
            continue
        tid = o["local_track_id"]
        if o["t_local"] - last.get(tid, -1e9) < 1.0 / max_per_track_per_s:
            continue
        last[tid] = o["t_local"]
        out.append([*o["floor_point_px"], *eye])
    return np.asarray(out, np.float64)


def self_calibrate(samples: np.ndarray, image_size: tuple[int, int], vp: np.ndarray | None = None) -> tuple[FloorCamera, dict]:
    """Fit f, pitch, roll, height so that eyes sit EYE_HEIGHT_M above the back-projected feet."""
    W, Hh = image_size
    cx, cy = W / 2, Hh / 2

    def residuals(p):
        f, pitch, roll, h = p
        cam = FloorCamera(f, pitch, roll, h, cx, cy)
        Hif = cam.image_to_floor_h()
        g = apply_h(Hif, samples[:, :2])
        head = np.column_stack([g, np.full(len(g), EYE_HEIGHT_M)])
        pred = cam.project(head)
        prior = (f - F_PRIOR_PER_WIDTH * W) / (F_PRIOR_SD_PER_WIDTH * W) * F_PRIOR_WEIGHT_PX
        return np.concatenate([(pred - samples[:, 2:4]).ravel(), [prior * math.sqrt(max(1, len(samples)) / 20)],
                               vp_residual(cam, vp, len(samples))])

    best = None
    for f0 in (800.0, 1000.0, 1300.0):
        for pitch0 in (0.35, 0.6, 0.85):
            for h0 in (4.0, 7.0):
                try:
                    r = least_squares(residuals, [f0, pitch0, 0.0, h0], loss="soft_l1", f_scale=4.0,
                                      bounds=([400, 0.05, -0.3, 1.5], [3000, 1.4, 0.3, 30]))
                except ValueError:
                    continue
                if best is None or r.cost < best.cost:
                    best = r
    f, pitch, roll, h = best.x
    cam = FloorCamera(float(f), float(pitch), float(roll), float(h), cx, cy)
    res = np.linalg.norm(best.fun[: 2 * len(samples)].reshape(-1, 2), axis=1)
    # Height uncertainty is dominated by the eye-height prior: report it rather than hide it.
    report = {
        "samples": int(len(samples)),
        "median_eye_residual_px": round(float(np.median(res)), 2),
        "p90_eye_residual_px": round(float(np.percentile(res, 90)), 2),
        "scale_prior": f"average adult eye height {EYE_HEIGHT_M} m (sd {EYE_HEIGHT_SD_M} m)",
        "focal_prior": f"f = {F_PRIOR_PER_WIDTH} x image width (sd {F_PRIOR_SD_PER_WIDTH}), phone main camera",
        "plumb_vanishing_point": None if vp is None else [round(float(v), 1) for v in vp],
        "predicted_vanishing_point": [round(float(v), 1) for v in cam.vertical_vp()],
        "scale_uncertainty_pct": round(100 * EYE_HEIGHT_SD_M / EYE_HEIGHT_M / math.sqrt(max(1, len(samples) / 10)), 1),
    }
    return cam, report


CROSS_PX_PER_M = 20.0  # weight of cross-camera floor disagreement vs eye residuals (0.3 m ~ 6 px)


def joint_refine(cam_a: FloorCamera, cam_b: FloorCamera, samples_a: np.ndarray, samples_b: np.ndarray,
                 px_a: np.ndarray, px_b: np.ndarray, theta: float, t: np.ndarray,
                 vp_a: np.ndarray | None = None, vp_b: np.ndarray | None = None) -> tuple[FloorCamera, FloorCamera, float, np.ndarray, dict]:
    """Jointly refine both cameras and the rigid floor transform B->A.

    Constraints: standing people's eyes at EYE_HEIGHT_M above their feet (each camera) and co-observed
    people's floor points agreeing across cameras (px_a[i] and px_b[i] are the same person at one time).
    A well-observed camera thereby anchors a camera with few standing samples.
    """
    def unpack(p):
        a = FloorCamera(p[0], p[1], p[2], p[3], cam_a.cx, cam_a.cy)
        b = FloorCamera(p[4], p[5], p[6], p[7], cam_b.cx, cam_b.cy)
        return a, b, p[8], p[9:11]

    def eye_res(cam, s):
        if len(s) == 0:
            return np.zeros(0)
        g = apply_h(cam.image_to_floor_h(), s[:, :2])
        pred = cam.project(np.column_stack([g, np.full(len(g), EYE_HEIGHT_M)]))
        return (pred - s[:, 2:4]).ravel()

    def residuals(p):
        a, b, th, tt = unpack(p)
        ga = apply_h(a.image_to_floor_h(), px_a)
        gb = apply_h(b.image_to_floor_h(), px_b)
        c, s = math.cos(th), math.sin(th)
        gb = gb @ np.array([[c, -s], [s, c]]).T + tt
        prior = [(cam.f - F_PRIOR_PER_WIDTH * 2 * cam.cx) / (F_PRIOR_SD_PER_WIDTH * 2 * cam.cx) * F_PRIOR_WEIGHT_PX
                 * math.sqrt(max(1, n_eff) / 20) for cam, n_eff in ((a, len(samples_a)), (b, len(samples_b)))]
        return np.concatenate([eye_res(a, samples_a), eye_res(b, samples_b), ((ga - gb) * CROSS_PX_PER_M).ravel(), prior,
                               vp_residual(a, vp_a, len(samples_a)), vp_residual(b, vp_b, len(samples_b))])

    p0 = [cam_a.f, cam_a.pitch, cam_a.roll, cam_a.height, cam_b.f, cam_b.pitch, cam_b.roll, cam_b.height, theta, *t]
    lo = [400, 0.05, -0.3, 1.5, 400, 0.05, -0.3, 1.5, -10, -200, -200]
    hi = [3000, 1.4, 0.3, 30, 3000, 1.4, 0.3, 30, 10, 200, 200]
    r = least_squares(residuals, p0, loss="soft_l1", f_scale=4.0, bounds=(lo, hi))
    a, b, th, tt = unpack(r.x)
    na, nb = 2 * len(samples_a), 2 * len(samples_b)
    ea = np.linalg.norm(r.fun[:na].reshape(-1, 2), axis=1) if na else np.zeros(1)
    eb = np.linalg.norm(r.fun[na:na + nb].reshape(-1, 2), axis=1) if nb else np.zeros(1)
    a.f, b.f = float(a.f), float(b.f)
    a.height, b.height = float(a.height), float(b.height)
    ga = apply_h(a.image_to_floor_h(), px_a)
    gb = apply_h(b.image_to_floor_h(), px_b)
    c, s = math.cos(th), math.sin(th)
    d = np.linalg.norm(ga - (gb @ np.array([[c, -s], [s, c]]).T + tt), axis=1)
    rep = {"pairs": int(len(px_a)), "pair_median_m": round(float(np.median(d)), 3),
           "pair_p90_m": round(float(np.percentile(d, 90)), 3),
           "eye_median_px": [round(float(np.median(ea)), 2), round(float(np.median(eb)), 2)]}
    return a, b, float(th), np.asarray(tt), rep


# --------------------------------------------------------------------------------------------------
# Persistence
# --------------------------------------------------------------------------------------------------

def load(path: str | Path) -> dict:
    doc = json.loads(Path(path).read_text())
    if doc.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(f"unsupported calibration schema {doc.get('schema_version')}")
    return doc


def save(doc: dict, path: str | Path) -> None:
    Path(path).write_text(json.dumps(doc, indent=2))


def camera_h(doc: dict, camera_id: str) -> np.ndarray:
    for c in doc["cameras"]:
        if c["camera_id"] == camera_id:
            return np.asarray(c["homography_image_to_world"], np.float64)
    raise KeyError(camera_id)


def calibrate_from_landmarks(doc: dict, camera_id: str) -> dict:
    """Refit one camera of a calibration document from its landmark clicks (operator workflow)."""
    lm_world = {l["id"]: l["world"] for l in doc["floor_map"]["landmarks"]}
    cam = next(c for c in doc["cameras"] if c["camera_id"] == camera_id)
    pairs = [(c["pixel"], lm_world[c["landmark_id"]]) for c in cam["landmarks"] if c["landmark_id"] in lm_world]
    px = np.array([p for p, _ in pairs], np.float64)
    wd = np.array([w for _, w in pairs], np.float64)
    H, inl = fit_homography(px, wd)
    rep = reprojection_report(H, px, wd, tuple(cam["image_size"]))
    rep["outliers"] = [cam["landmarks"][i]["landmark_id"] for i in np.where(~inl)[0]]
    q, reasons = grade(rep)
    cam["homography_image_to_world"] = H.round(10).tolist()
    cam["reprojection_error"] = rep
    cam["quality"] = q
    cam["quality_reasons"] = reasons
    cam["source"] = "operator_landmarks"
    return cam
