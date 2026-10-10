"""Align camera floor frames to each other and estimate the time offset, using people seen by both.

Each self-calibrated camera gives metric floor positions in its own camera-centric frame. Two such
frames differ by a 2D rigid transform (rotation + translation) plus a small scale error inherited from
the eye-height prior. We find it with RANSAC over candidate (cam A person, cam B person) pairs observed
in the same 1-second bin, then refine it as a similarity transform on inliers. The time offset is the
one that maximises agreement given that transform (iterated twice).

This is a bootstrap for sites without a surveyed floor plan. With operator landmarks on a real floor
plan, each camera maps directly to the plan and this stage only *verifies* agreement.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from .observation import DESCRIPTOR_DIM

BIN_S = 1.0
INLIER_M = 0.8
MOVING_MPS = 0.4
PAIR_CAP_BINS = 8      # a stationary pair can only add this much support, however long it sits
MOVING_BONUS = 3.0


@dataclass
class BinnedSamples:
    """Per-track 1-second averages: positions (bins, M, 2) padded with NaN, plus appearance."""
    t0: float
    pos: np.ndarray        # (B, M, 2)
    px: np.ndarray         # (B, M, 2) median image floor point (for joint calibration refinement)
    app: np.ndarray        # (B, M, D)
    weight: np.ndarray     # (B, M) 1 for ankles, lower for weaker floor points, 0 for padding
    track: np.ndarray      # (B, M) local track id or -1
    moving: np.ndarray     # (B, M) bool, track moves > MOVING_MPS around this bin


FLOOR_WEIGHT = {"ankles": 1.0, "one_ankle": 0.8, "knees": 0.6, "seated_hips": 0.5, "hip_extrapolated": 0.3, "box_bottom": 0.2}


def bin_samples(obs: list[dict], positions: np.ndarray, t_offset: float, t0: float, n_bins: int, max_m: int = 20,
                bin_s: float = BIN_S) -> BinnedSamples:
    """positions: (N, 2) floor positions matching obs; t_offset is added to t_local (shared timeline)."""
    acc: dict[tuple[int, int], list] = {}
    for o, p in zip(obs, positions):
        if not np.all(np.isfinite(p)) or "touches_frame_edge" in o["quality_flags"]:
            continue  # edge-truncated people have no usable floor point: never use them to calibrate
        b = int((o["t_local"] + t_offset - t0) // bin_s)
        if 0 <= b < n_bins:
            acc.setdefault((b, o["local_track_id"]), []).append((p, o))
    pos = np.full((n_bins, max_m, 2), np.nan)
    pxa = np.full((n_bins, max_m, 2), np.nan)
    app = np.zeros((n_bins, max_m, DESCRIPTOR_DIM), np.float32)
    w = np.zeros((n_bins, max_m))
    tr = np.full((n_bins, max_m), -1)
    fill = np.zeros(n_bins, int)
    for (b, tid), items in acc.items():
        k = fill[b]
        if k >= max_m:
            continue
        ps = np.array([p for p, _ in items])
        pos[b, k] = np.median(ps, axis=0)
        pxa[b, k] = np.median([o["floor_point_px"] for _, o in items], axis=0)
        descs = [o["appearance"] for _, o in items if o["appearance"] is not None]
        if descs:
            d = np.mean(descs, axis=0)
            app[b, k] = d / (np.linalg.norm(d) + 1e-9)
        w[b, k] = np.mean([FLOOR_WEIGHT[o["floor_method"]] for _, o in items])
        tr[b, k] = tid
        fill[b] += 1
    moving = np.zeros((n_bins, max_m), bool)
    where: dict[int, list[tuple[int, int]]] = {}
    for b in range(n_bins):
        for k in range(fill[b]):
            where.setdefault(int(tr[b, k]), []).append((b, k))
    for items in where.values():
        for j, (b, k) in enumerate(items):
            lo, hi = items[max(0, j - 2)], items[min(len(items) - 1, j + 2)]
            dt = (hi[0] - lo[0]) * bin_s
            if dt > 0 and np.linalg.norm(pos[hi] - pos[lo]) / dt > MOVING_MPS:
                moving[b, k] = True
    return BinnedSamples(t0, pos, pxa, app, w, tr, moving)


def rigid_from_pairs(a: np.ndarray, b: np.ndarray, allow_scale: bool = False) -> tuple[float, float, np.ndarray]:
    """Least-squares (scale, theta, t) with a ~= s R(theta) b + t (Umeyama in 2D)."""
    ma, mb = a.mean(0), b.mean(0)
    A, B = a - ma, b - mb
    cov = B.T @ A
    theta = math.atan2(cov[0, 1] - cov[1, 0], cov[0, 0] + cov[1, 1])
    R = np.array([[math.cos(theta), -math.sin(theta)], [math.sin(theta), math.cos(theta)]])
    s = 1.0
    if allow_scale:
        s = float(np.sum(A * (B @ R.T)) / max(np.sum(B * B), 1e-9))
    t = ma - s * (R @ mb)
    return s, theta, t


def transform(s: float, theta: float, t: np.ndarray, pts: np.ndarray) -> np.ndarray:
    R = np.array([[math.cos(theta), -math.sin(theta)], [math.sin(theta), math.cos(theta)]])
    return s * pts @ R.T + t


def score(A: BinnedSamples, B: BinnedSamples, s, theta, t, inlier_m=INLIER_M):
    """Mutual-nearest matches within inlier_m per bin. Returns (n_inliers, mean residual, pairs)."""
    pb = transform(s, theta, t, B.pos.reshape(-1, 2)).reshape(B.pos.shape)
    d = np.linalg.norm(A.pos[:, :, None, :] - pb[:, None, :, :], axis=3)  # (bins, Ma, Mb)
    d = np.where(np.isnan(d), np.inf, d)
    ia = np.argmin(d, axis=2)              # best b for each a
    ib = np.argmin(d, axis=1)              # best a for each b
    bins, Ma = np.indices(ia.shape)
    dmin = d[bins, Ma, ia]
    mutual = ib[bins, ia] == Ma
    ok = mutual & (dmin < inlier_m)
    n_ok = int(ok.sum())
    res = float(dmin[ok].mean()) if n_ok else float("inf")
    pairs = (bins[ok], Ma[ok], ia[ok])
    # Support: distinct track pairs (capped), plus a bonus for bins where both people are moving.
    # Counting bins alone lets two people who sit still for minutes outvote everything else.
    ta, tb = A.track[pairs[0], pairs[1]], B.track[pairs[0], pairs[2]]
    mv = A.moving[pairs[0], pairs[1]] & B.moving[pairs[0], pairs[2]]
    support = 0.0
    if n_ok:
        keys = ta.astype(np.int64) * 100000 + tb.astype(np.int64)
        uniq, counts = np.unique(keys, return_counts=True)
        support = float(np.minimum(counts, PAIR_CAP_BINS).sum() + MOVING_BONUS * mv.sum())
    return support, res, pairs


def ransac_align(A: BinnedSamples, B: BinnedSamples, iters: int = 20000, seed: int = 0) -> dict:
    rng = np.random.default_rng(seed)
    # Candidate pairs: same bin, both present, weighted by floor quality x appearance similarity
    cand = []
    for b in range(A.pos.shape[0]):
        ka = np.where(A.track[b] >= 0)[0]
        kb = np.where(B.track[b] >= 0)[0]
        for i in ka:
            for j in kb:
                sim = float(A.app[b, i] @ B.app[b, j]) if A.app[b, i].any() and B.app[b, j].any() else 0.3
                mv = 1.0 + 3.0 * float(A.moving[b, i] and B.moving[b, j])
                cand.append((b, i, j, A.weight[b, i] * B.weight[b, j] * (0.2 + max(sim, 0.0)) * mv))
    cand = np.array(cand)
    p = cand[:, 3] / cand[:, 3].sum()
    best = (0, float("inf"), None)
    for _ in range(iters):
        k1, k2 = rng.choice(len(cand), 2, replace=False, p=p)
        b1, i1, j1 = cand[k1, :3].astype(int)
        b2, i2, j2 = cand[k2, :3].astype(int)
        a_pts = np.array([A.pos[b1, i1], A.pos[b2, i2]])
        b_pts = np.array([B.pos[b1, j1], B.pos[b2, j2]])
        da, db = np.linalg.norm(a_pts[0] - a_pts[1]), np.linalg.norm(b_pts[0] - b_pts[1])
        if da < 2.0 or abs(da - db) > 0.15 * da:  # rigid: inter-point distance must be preserved
            continue
        s, th, t = rigid_from_pairs(a_pts, b_pts)
        n, res, _ = score(A, B, s, th, t)
        if n > best[0] or (n == best[0] and res < best[1]):
            best = (n, res, (s, th, t))
    s, th, t = best[2]
    # Refine as a similarity on inliers (absorbs the per-camera scale error of self-calibration)
    for _ in range(3):
        n, res, (bins, ia, ib) = score(A, B, s, th, t)
        s, th, t = rigid_from_pairs(A.pos[bins, ia], B.pos[bins, ib], allow_scale=True)
    n, res, pairs = score(A, B, s, th, t)
    return {"scale": s, "theta": th, "t": t, "inliers": len(pairs[0]), "support": n, "mean_residual_m": res,
            "pairs": pairs}


def offset_scan(A_fn, B_fn, s, th, t, offsets: np.ndarray) -> list[tuple[float, int, float]]:
    """Agreement for each candidate offset (B's clock shifted by `off`)."""
    out = []
    A = A_fn()
    for off in offsets:
        B = B_fn(off)
        n, res, _ = score(A, B, s, th, t, inlier_m=0.6)
        out.append((float(off), n, res))
    return out
