"""Cross-camera association evidence and link decisions.

Evidence is a log-likelihood ratio (LLR): log P(data | same person) - log P(data | different people).
Positive = supports a match. Per-tick terms are scaled by TICK_S so one second of agreement counts as
roughly one independent observation (consecutive frames are highly correlated).

Hard gates (applied before anything is scored):
  * floor distance > GATE_M at a tick                           -> strong negative evidence for that tick
  * midpoint outside the cameras' shared coverage (+ margin)    -> tick does not count as support
  * appearance only with >= MIN_APP_SAMPLES quality crops/side  -> never from a single frame
  * temporal links: required speed > MAX_WALK_SPEED              -> rejected
Decisions are made by a global assignment (Hungarian) over cumulative evidence at each decision step,
not greedily frame by frame, and a confirmed link needs both a strong score and a margin over the
runner-up. Anything in between stays ambiguous.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import cv2
import numpy as np
from scipy.optimize import linear_sum_assignment

from .appearance import similarity_llr
from .tracklets import TICK_S, Tracklet

# Geometry
GATE_M = 2.5
SIGMA_MIN_M = 0.25
COMPETITOR_RADIUS_M = 1.5     # people sit 0.6-1 m apart: a neighbour that close is common, not evidence
COVERAGE_MARGIN_M = 1.0
# Motion
MOVING_MPS = 0.35
STILL_MPS = 0.15
MOTION_SIGMA_M = 0.35
MOVING_TAU_S = 1.0
STILL_TAU_S = 8.0
# Appearance (see appearance.py for the similarity -> evidence mapping)
MIN_APP_SAMPLES = 3
# Decisions
LINK_SCORE = 4.0            # cumulative LLR to confirm a cross-camera link
LINK_GEO_MIN = 3.0          # ... of which geometry + motion must contribute at least this much
LINK_MARGIN = 2.0           # ... and beat the runner-up by this much
PENDING_SCORE = 1.5         # above this, an unconfirmed pair is "ambiguous", not "different people"
REVOKE_SCORE = 0.5
MIN_OVERLAP_S = 0.8
# Temporal (re-acquisition / handoff without overlap)
MAX_WALK_SPEED = 2.0
TEMPORAL_EVAL_DELAY_S = 2.0
MAX_GAP_S = 90.0
ROOM_AREA_M2 = 300.0


def appearance_llr(a: Tracklet, b: Tracklet) -> tuple[float, float | None]:
    """Evidence from clothing colour, only when both tracklets have >= MIN_APP_SAMPLES crops."""
    if a.appearance is None or b.appearance is None or min(a.n_appearance, b.n_appearance) < MIN_APP_SAMPLES:
        return 0.0, None
    sim = float(a.appearance @ b.appearance)
    return similarity_llr(sim), sim


class Coverage:
    def __init__(self, polygons: dict[str, list[list[float]]]):
        self.poly = {k: np.asarray(v, np.float32) for k, v in polygons.items()}

    def inside(self, camera_id: str, p: np.ndarray, margin: float = COVERAGE_MARGIN_M) -> bool:
        poly = self.poly.get(camera_id)
        if poly is None:
            return True
        return cv2.pointPolygonTest(poly, (float(p[0]), float(p[1])), True) >= -margin


@dataclass
class PairEvidence:
    a: Tracklet
    b: Tracklet
    ticks: np.ndarray              # overlap ticks where both observed
    geo: np.ndarray                # per-tick geometry LLR (already scaled by TICK_S)
    motion: np.ndarray             # per-tick motion LLR (scaled)
    dist: np.ndarray               # per-tick floor distance (m)
    app_llr: float
    app_sim: float | None
    cum_geo: np.ndarray = field(init=False)
    cum_motion: np.ndarray = field(init=False)

    def __post_init__(self):
        self.cum_geo = np.cumsum(self.geo)
        self.cum_motion = np.cumsum(self.motion)

    def upto(self, tick: int) -> dict | None:
        k = int(np.searchsorted(self.ticks, tick, side="right"))
        if k == 0:
            return None
        overlap_s = k * TICK_S
        geo = float(self.cum_geo[k - 1])
        mot = float(self.cum_motion[k - 1])
        app = self.app_llr if overlap_s >= MIN_OVERLAP_S else 0.0
        return {
            "score": geo + mot + app, "geo": geo, "motion": mot, "app": app, "app_sim": self.app_sim,
            "overlap_s": round(overlap_s, 1), "mean_dist_m": round(float(np.mean(self.dist[:k])), 2),
            "recent_dist_m": round(float(np.mean(self.dist[max(0, k - 5):k])), 2),
        }


def pair_evidence(a: Tracklet, b: Tracklet, coverage: Coverage) -> PairEvidence | None:
    common, ia, ib = np.intersect1d(a.ticks, b.ticks, return_indices=True)
    if len(common) == 0:
        return None
    pa, pb = a.pos[ia], b.pos[ib]
    d = np.linalg.norm(pa - pb, axis=1)
    if d.min() > GATE_M:
        return None  # never close enough to be the same person: not even a candidate
    s = np.maximum(np.hypot(a.sigma[ia], b.sigma[ib]), SIGMA_MIN_M)
    log_same = -d ** 2 / (2 * s ** 2) - np.log(2 * math.pi * s ** 2)
    log_diff = -math.log(math.pi * COMPETITOR_RADIUS_M ** 2)
    geo = np.clip(log_same - log_diff, -4.0, 2.5)
    geo[d > GATE_M] = -5.0
    mid = (pa + pb) / 2
    in_overlap = np.array([coverage.inside(a.camera_id, m) and coverage.inside(b.camera_id, m) for m in mid])
    geo[~in_overlap] = np.minimum(geo[~in_overlap], -1.0)
    # A person cut off by the frame edge has no measured floor point: agreement there proves nothing.
    blind = a.edge[ia] | b.edge[ib]
    geo[blind] = np.minimum(geo[blind], 0.0)
    va, vb = a.vel[ia], b.vel[ib]
    sa, sb = np.linalg.norm(va, axis=1), np.linalg.norm(vb, axis=1)
    dv = np.linalg.norm(va - vb, axis=1)
    motion = np.zeros(len(common))
    # Velocities from weak floor points (hidden feet) are mostly keypoint jitter: only trust motion
    # where both floor estimates are tight.
    reliable = (a.sigma[ia] < MOTION_SIGMA_M) & (b.sigma[ib] < MOTION_SIGMA_M)
    both = (sa > MOVING_MPS) & (sb > MOVING_MPS)
    motion[both & (dv < 0.4)] = 0.6
    motion[both & (dv > 1.0) & reliable] = -0.8
    one_still = ((sa > 0.6) & (sb < STILL_MPS)) | ((sb > 0.6) & (sa < STILL_MPS))
    motion[one_still & reliable] = -0.8
    app_llr, app_sim = appearance_llr(a, b)
    # Decorrelation: two people standing still produce the same (possibly biased) measurement every
    # tick, which is not new evidence. Stationary agreement counts as one sample per STILL_TAU_S,
    # moving agreement as one per MOVING_TAU_S.
    still = ~(a.moving()[ia] | b.moving()[ib])
    w = np.where(still, TICK_S / STILL_TAU_S, TICK_S / MOVING_TAU_S)
    return PairEvidence(a, b, common, geo * w, motion * TICK_S, d, app_llr, app_sim)


def build_pair_evidence(tracklets: list[Tracklet], coverage: Coverage) -> dict[tuple[str, str], PairEvidence]:
    by_cam: dict[str, list[Tracklet]] = {}
    for t in tracklets:
        by_cam.setdefault(t.camera_id, []).append(t)
    cams = sorted(by_cam)
    out = {}
    for i, ca in enumerate(cams):
        for cb in cams[i + 1:]:
            for a in by_cam[ca]:
                for b in by_cam[cb]:
                    if a.t_end < b.t_start or b.t_end < a.t_start:
                        continue
                    ev = pair_evidence(a, b, coverage)
                    if ev is not None:
                        out[(a.key, b.key)] = ev
    return out


@dataclass
class Link:
    kind: str                  # "cross_camera" | "temporal"
    a: str
    b: str
    score: float
    confidence: float
    decided_tick: int
    evidence: dict


def link_confidence(score: float, margin: float) -> float:
    return round(float(1 / (1 + math.exp(-(min(score, margin + LINK_SCORE) - LINK_SCORE + 1.5) / 1.2))), 3)


def decide_cross_camera(pairs: dict[tuple[str, str], PairEvidence], active: set[str], tick: int) -> tuple[dict, dict]:
    """Global assignment per camera pair over cumulative evidence up to `tick`.

    Returns (confirmed {(a,b): (score, margin, info)}, pending {(a,b): info}) for pairs involving active
    tracklets.
    """
    by_campair: dict[tuple[str, str], list[tuple[tuple[str, str], dict]]] = {}
    for key, ev in pairs.items():
        if key[0] not in active and key[1] not in active:
            continue
        if ev.ticks[0] > tick:
            continue
        info = ev.upto(tick)
        if info is None:
            continue
        cp = (ev.a.camera_id, ev.b.camera_id)
        by_campair.setdefault(cp, []).append((key, info))
    confirmed, pending = {}, {}
    for cp, items in by_campair.items():
        rows = sorted({k[0] for k, _ in items})
        cols = sorted({k[1] for k, _ in items})
        ri = {r: i for i, r in enumerate(rows)}
        ci = {c: i for i, c in enumerate(cols)}
        M = np.full((len(rows), len(cols)), -1e3)
        infos = {}
        for k, info in items:
            if info["overlap_s"] >= MIN_OVERLAP_S:
                M[ri[k[0]], ci[k[1]]] = info["score"]
            infos[k] = info
        r_idx, c_idx = linear_sum_assignment(-M)
        assigned = set()
        for r, c in zip(r_idx, c_idx):
            sc = M[r, c]
            if sc <= PENDING_SCORE:
                continue
            row_alt = np.delete(M[r], c)
            col_alt = np.delete(M[:, c], r)
            runner = max([0.0, *row_alt[row_alt > -1e2], *col_alt[col_alt > -1e2]])
            margin = sc - runner
            k = (rows[r], cols[c])
            info = dict(infos[k], margin=round(float(margin), 2))
            assigned.add(k)
            if sc >= LINK_SCORE and info["geo"] + info["motion"] >= LINK_GEO_MIN and margin >= LINK_MARGIN:
                confirmed[k] = (sc, margin, info)
            else:
                pending[k] = info
        # Unassigned but plausible pairs are competing explanations. They only count as ambiguity when they
        # come within LINK_MARGIN of the winning pair in their row/column (a clearly beaten neighbour is
        # not real doubt); with no winner at all, any plausible pair is ambiguous.
        best_row = {k[0]: infos[k]["score"] for k in assigned}
        best_col = {k[1]: infos[k]["score"] for k in assigned}
        for k, info in infos.items():
            if k in assigned or info["score"] <= PENDING_SCORE or info["overlap_s"] < MIN_OVERLAP_S:
                continue
            rival = max(best_row.get(k[0], -1e9), best_col.get(k[1], -1e9))
            if info["score"] >= rival - LINK_MARGIN:
                pending[k] = dict(info, margin=None)
    return confirmed, pending


LIVE_REF_SIGMA_M = 0.6      # other camera's live position: cross-camera disagreement for seated people


def temporal_candidates(new: Tracklet, refs: list[tuple], tick: int) -> list[dict]:
    """Score identities that could continue as `new`.

    refs: (gid, appearance reference tracklet, reference position, reference tick, mode) with mode
    "lost" (no camera sees the identity; reference = where it was last seen) or "seen_by_other_camera".
    """
    out = []
    for gid, app_ref, ref_pos, ref_tick, mode in refs:
        gap_s = (new.t_start - ref_tick) * TICK_S
        if gap_s < -0.2 or gap_s > MAX_GAP_S:
            continue
        gap_s = max(gap_s, TICK_S)
        dist = float(np.linalg.norm(new.pos[0] - ref_pos))
        req_speed = max(0.0, dist - 0.8) / gap_s if mode == "lost" else 0.0
        if req_speed > MAX_WALK_SPEED or (mode != "lost" and dist > GATE_M):
            continue  # hard gate: teleportation / too far from where the other camera sees them
        sigma = LIVE_REF_SIGMA_M if mode != "lost" else min(0.5 + 0.7 * gap_s, 6.0)
        geo = -dist ** 2 / (2 * sigma ** 2) - math.log(2 * math.pi * sigma ** 2) + math.log(ROOM_AREA_M2)
        geo = float(np.clip(geo, -4, 4))
        app, sim = appearance_llr(app_ref, new)
        if sim is not None and app < -0.5:
            continue  # clothing clearly disagrees: never continue an identity on position alone
        if mode != "lost" and len(new.ticks) and float(np.mean(new.edge)) > 0.5:
            continue  # no floor point to compare with the other camera
        score = geo + app
        # stricter for longer gaps: appearance must actively support anything beyond a short occlusion
        need = 3.0 + 0.05 * gap_s
        app_ok = mode != "lost" or gap_s <= 5.0 or (sim is not None and app >= 0.5)
        out.append({"gid": gid, "prev": app_ref.key, "mode": mode, "gap_s": round(gap_s, 1), "dist_m": round(dist, 2),
                    "required_speed_mps": round(req_speed, 2), "geo": round(geo, 2), "app": round(app, 2),
                    "app_sim": None if sim is None else round(sim, 3), "score": round(score, 2), "need": round(need, 2),
                    "app_ok": app_ok})
    out.sort(key=lambda c: -c["score"])
    return out
