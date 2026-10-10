"""Per-detection measurements in image space: floor-contact point, appearance descriptor, quality flags.

COCO-17 keypoints: 5/6 shoulders, 11/12 hips, 13/14 knees, 15/16 ankles.
"""
from __future__ import annotations

import cv2
import numpy as np

L_SH, R_SH, L_HIP, R_HIP, L_KNEE, R_KNEE, L_ANK, R_ANK = 5, 6, 11, 12, 13, 14, 15, 16
KP_CONF = 0.5
MIN_APPEARANCE_HEIGHT_PX = 60

# Appearance: hue x saturation histogram per body part. Opposite cameras see front vs back of a person,
# so clothing colour is far more view-invariant than a texture/ReID CNN trained on same-side views.
H_BINS, S_BINS = 12, 3
PART_DIM = H_BINS * S_BINS + 2  # + achromatic dark / light bins
DESCRIPTOR_DIM = 2 * PART_DIM


def floor_contact(box: list[float], kp: np.ndarray | None) -> tuple[list[float], str, float]:
    """Image-space point where the person touches the floor.

    Returns (point, method, sigma_px). sigma_px is a rough 1-sigma vertical uncertainty in pixels used
    to weight the projected world position. Preference: midpoint of both ankles > one ankle > box bottom.
    """
    x1, y1, x2, y2 = box
    h = max(1.0, y2 - y1)
    if kp is not None:
        la, ra = kp[L_ANK], kp[R_ANK]
        if la[2] >= KP_CONF and ra[2] >= KP_CONF:
            return [float((la[0] + ra[0]) / 2), float(max(la[1], ra[1]))], "ankles", 0.03 * h
        if la[2] >= KP_CONF or ra[2] >= KP_CONF:
            a = la if la[2] >= ra[2] else ra
            return [float(a[0]), float(a[1])], "one_ankle", 0.05 * h
        # Feet hidden (table, bench, chair): the bottom of the box is the occluder's edge, not the floor.
        # Extrapolate from the hips with a posture-dependent body-proportion prior.
        lh, rh, ls, rs = kp[L_HIP], kp[R_HIP], kp[L_SH], kp[R_SH]
        if min(lh[2], rh[2], ls[2], rs[2]) >= KP_CONF:
            hip = (lh[:2] + rh[:2]) / 2
            sh = (ls[:2] + rs[:2]) / 2
            torso = max(float(np.linalg.norm(hip - sh)), 1.0)
            lk, rk = kp[L_KNEE], kp[R_KNEE]
            knees = [k for k in (lk, rk) if k[2] >= KP_CONF]
            if knees:
                knee = np.mean([k[:2] for k in knees], axis=0)
                if (knee[1] - hip[1]) < 0.55 * torso:
                    # seated: thighs near horizontal, floor ~ seat height (~0.9 torso) below the hips,
                    # under the middle of the thighs
                    return [float((hip[0] + knee[0]) / 2), float(hip[1] + 0.9 * torso)], "seated_hips", 0.25 * torso
                # standing / walking with the shins hidden: shin ~ thigh length below the knee
                return [float(hip[0]), float(knee[1] + (knee[1] - hip[1]))], "knees", 0.25 * torso
            # posture unknown: between seated (0.9) and standing (1.6), wide uncertainty
            return [float(hip[0]), float(hip[1] + 1.2 * torso)], "hip_extrapolated", 0.45 * torso
    return [float((x1 + x2) / 2), float(y2)], "box_bottom", 0.12 * h


FLOOR_METHODS = ("ankles", "one_ankle", "knees", "seated_hips", "hip_extrapolated", "box_bottom")
RELIABLE_FLOOR = ("ankles", "one_ankle")


def refresh_floor(o: dict, width: int = 1280, height: int = 720) -> dict:
    """Re-derive the floor point of a raw observation from its stored keypoints (derived layer).

    Raw observations stay immutable on disk; floor estimation can improve without re-running detection.
    Detections cut off by the frame edge get a much larger uncertainty: their floor point is unknown.
    """
    kp = np.asarray(o["keypoints"], np.float64) if o.get("keypoints") else None
    fp, method, sigma = floor_contact(o["bbox"], kp)
    x1, y1, x2, y2 = o["bbox"]
    if (y2 >= height - 2 or x1 <= 2 or x2 >= width - 2) and method not in RELIABLE_FLOOR:
        sigma *= 3.0
    o["floor_point_px"] = [round(fp[0], 1), round(fp[1], 1)]
    o["floor_method"] = method
    o["floor_sigma_px"] = round(float(sigma), 1)
    o["quality_flags"] = quality_flags(o["bbox"], o["det_conf"], method, width, height)
    return o


def _part_hist(hsv: np.ndarray, mask: np.ndarray) -> np.ndarray:
    if mask.sum() < 30:
        return np.zeros(PART_DIM, np.float32)
    px = hsv[mask > 0]
    h, s, v = px[:, 0].astype(np.float32), px[:, 1].astype(np.float32), px[:, 2].astype(np.float32)
    chroma = (s > 50) & (v > 40) & (v < 245)
    hist = np.zeros(PART_DIM, np.float32)
    if chroma.any():
        hb = np.minimum((h[chroma] / 180 * H_BINS).astype(int), H_BINS - 1)
        sb = np.minimum(((s[chroma] - 50) / 206 * S_BINS).astype(int), S_BINS - 1)
        np.add.at(hist, hb * S_BINS + sb, 1)
    hist[-2] = ((~chroma) & (v < 110)).sum()   # dark / black clothing
    hist[-1] = ((~chroma) & (v >= 110)).sum()  # grey / white clothing
    return hist / max(hist.sum(), 1)


def appearance(frame: np.ndarray, box: list[float], kp: np.ndarray | None) -> tuple[np.ndarray | None, float]:
    """Upper-body + lower-body colour descriptor and a 0..1 quality score (None if unusable)."""
    H, W = frame.shape[:2]
    x1, y1, x2, y2 = [int(round(v)) for v in box]
    x1, y1, x2, y2 = max(0, x1), max(0, y1), min(W, x2), min(H, y2)
    bh, bw = y2 - y1, x2 - x1
    if bh < MIN_APPEARANCE_HEIGHT_PX or bw < 15:
        return None, 0.0
    crop = frame[y1:y2, x1:x2]
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    # Shrink horizontally to avoid background at the box sides.
    mx = int(bw * 0.2)
    upper = np.zeros((bh, bw), np.uint8)
    lower = np.zeros((bh, bw), np.uint8)
    have_kp = kp is not None and min(kp[L_SH][2], kp[R_SH][2], kp[L_HIP][2], kp[R_HIP][2]) >= KP_CONF
    if have_kp:
        sh_y = int((kp[L_SH][1] + kp[R_SH][1]) / 2) - y1
        hip_y = int((kp[L_HIP][1] + kp[R_HIP][1]) / 2) - y1
        sh_y, hip_y = max(0, sh_y), min(bh, max(hip_y, sh_y + 4))
        upper[sh_y:hip_y, mx:bw - mx] = 1
        knee_ok = max(kp[L_KNEE][2], kp[R_KNEE][2]) >= KP_CONF
        if knee_ok:
            lower[hip_y:bh, mx:bw - mx] = 1
    else:
        upper[int(bh * 0.18):int(bh * 0.5), mx:bw - mx] = 1
        lower[int(bh * 0.55):int(bh * 0.9), mx:bw - mx] = 1
    up, lo = _part_hist(hsv, upper), _part_hist(hsv, lower)
    desc = np.concatenate([up, lo * 0.6])  # legs are more often occluded by furniture: weight lower
    n = np.linalg.norm(desc)
    if n == 0:
        return None, 0.0
    q = min(1.0, bh / 160) * (1.0 if have_kp else 0.6) * (1.0 if lo.any() else 0.7)
    return (desc / n).astype(np.float32), round(float(q), 3)


def quality_flags(box: list[float], score: float, floor_method: str, width: int, height: int) -> list[str]:
    x1, y1, x2, y2 = box
    flags = []
    if x1 <= 2 or y1 <= 2 or x2 >= width - 2 or y2 >= height - 2:
        flags.append("touches_frame_edge")
    if y2 - y1 < 60:
        flags.append("small")
    if score < 0.45:
        flags.append("low_confidence")
    if floor_method not in ("ankles", "one_ankle"):
        flags.append("feet_not_visible")
    return flags
