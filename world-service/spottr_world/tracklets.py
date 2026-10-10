"""Project raw observations into the shared world frame and build cleaned per-camera tracklets.

A tracklet is a run of one camera's local track ID, resampled onto the shared tick grid. Local IDs are
split where the projected position jumps impossibly fast (the local tracker swapped people), and
very short fragments are kept out of association (they remain in the raw layer).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from .appearance import tracklet_descriptor
from .calibration import apply_h, h_valid_mask, world_sigma

TICK_S = 0.2
MAX_JUMP_SPEED = 4.0        # m/s between consecutive samples: faster means a local ID swap
MIN_TRACKLET_S = 1.0
POS_SIGMA_FLOOR_M = 0.15    # calibration + body-centre noise floor


@dataclass
class Tracklet:
    key: str                 # "cam1:12" or "cam1:12.1" after a split
    camera_id: str
    local_track_id: int
    ticks: np.ndarray        # (n,) tick indices on the shared grid
    pos: np.ndarray          # (n, 2) metres, median per tick
    sigma: np.ndarray        # (n,) metres
    vel: np.ndarray          # (n, 2) m/s (smoothed)
    det_conf: np.ndarray     # (n,)
    obs_index: list[list[int]]  # raw observation indices per tick
    edge: np.ndarray            # (n,) bool: cut off by the frame edge with hidden feet -> floor point unknown
    appearance: np.ndarray | None = None   # mean of top-quality descriptors (unit norm)
    n_appearance: int = 0
    crops: list[str] = field(default_factory=list)

    _moving: np.ndarray | None = None

    def moving(self, half_window_s: float = 1.5, min_speed: float = 0.35) -> np.ndarray:
        """Per tick: net displacement over +-half_window_s faster than min_speed. Unlike instantaneous
        velocity this ignores keypoint jitter of seated people."""
        if self._moving is None:
            k = int(round(half_window_s / TICK_S))
            idx = np.arange(len(self.ticks))
            lo = np.searchsorted(self.ticks, self.ticks - k)
            hi = np.minimum(np.searchsorted(self.ticks, self.ticks + k, side="right") - 1, len(self.ticks) - 1)
            dt = np.maximum((self.ticks[hi] - self.ticks[lo]) * TICK_S, TICK_S)
            disp = np.linalg.norm(self.pos[hi] - self.pos[lo], axis=1)
            self._moving = (disp / dt > min_speed) & (dt >= half_window_s)
            del idx
        return self._moving

    @property
    def t_start(self) -> int:
        return int(self.ticks[0])

    @property
    def t_end(self) -> int:
        return int(self.ticks[-1])

    def at(self, tick: int) -> int | None:
        i = int(np.searchsorted(self.ticks, tick))
        return i if i < len(self.ticks) and self.ticks[i] == tick else None


def project_observations(obs: list[dict], H: np.ndarray, t_offset: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Returns world positions (N,2) (NaN if not on the floor), sigma (N,), shared timestamps (N,)."""
    if not obs:
        return np.zeros((0, 2)), np.zeros(0), np.zeros(0)
    px = np.array([o["floor_point_px"] for o in obs], np.float64)
    pos = apply_h(H, px)
    valid = h_valid_mask(H, px)
    pos[~valid] = np.nan
    sig = np.array([
        np.hypot(world_sigma(H, p, o["floor_sigma_px"]), POS_SIGMA_FLOOR_M) if v else np.nan
        for p, o, v in zip(px, obs, valid)
    ])
    t = np.array([o["t_local"] for o in obs]) + t_offset
    return pos, sig, t


def _smooth_velocity(ticks: np.ndarray, pos: np.ndarray, half_window_s: float = 0.6) -> np.ndarray:
    tt = ticks * TICK_S
    vel = np.zeros_like(pos)
    for i in range(len(tt)):
        m = np.abs(tt - tt[i]) <= half_window_s
        if m.sum() >= 3 and np.ptp(tt[m]) > 0.3:
            A = np.column_stack([tt[m] - tt[i], np.ones(m.sum())])
            coef, *_ = np.linalg.lstsq(A, pos[m], rcond=None)
            vel[i] = coef[0]
    return vel


def build_tracklets(camera_id: str, obs: list[dict], pos: np.ndarray, sig: np.ndarray, t: np.ndarray,
                    run_dir: Path | None = None, wb_gains: np.ndarray | None = None) -> tuple[list[Tracklet], dict]:
    """Group by local track id, resample to ticks, split impossible jumps, drop short fragments."""
    by_track: dict[int, list[int]] = {}
    for i, o in enumerate(obs):
        if np.isfinite(pos[i, 0]):
            by_track.setdefault(o["local_track_id"], []).append(i)
    tracklets: list[Tracklet] = []
    stats = {"local_tracks": len(by_track), "splits": 0, "dropped_short": 0}
    for tid, idx in by_track.items():
        idx.sort(key=lambda i: t[i])
        ticks_all = np.round(t[idx] / TICK_S).astype(int)
        # per-tick median
        groups: dict[int, list[int]] = {}
        for k, i in zip(ticks_all, idx):
            groups.setdefault(int(k), []).append(i)
        tk = np.array(sorted(groups))
        P = np.array([np.median(pos[groups[k]], axis=0) for k in tk])
        S = np.array([np.median(sig[groups[k]]) for k in tk])
        C = np.array([np.mean([obs[i]["det_conf"] for i in groups[k]]) for k in tk])
        # Split only at jumps that are impossible even allowing for both points' uncertainty (a seated
        # person's floor estimate can move ~1 m when the visible keypoints change; that is not a swap).
        cuts = [0]
        for j in range(1, len(tk)):
            dt = max((tk[j] - tk[j - 1]) * TICK_S, TICK_S)
            slack = 3.0 * float(np.hypot(S[j], S[j - 1]))
            if np.linalg.norm(P[j] - P[j - 1]) > MAX_JUMP_SPEED * dt + max(1.0, slack):
                cuts.append(j)
        cuts.append(len(tk))
        stats["splits"] += len(cuts) - 2
        for s_i, (a, b) in enumerate(zip(cuts[:-1], cuts[1:])):
            if (tk[b - 1] - tk[a]) * TICK_S < MIN_TRACKLET_S:
                stats["dropped_short"] += 1
                continue
            key = f"{camera_id}:{tid}" if len(cuts) == 2 else f"{camera_id}:{tid}.{s_i}"
            seg_ticks = tk[a:b]
            oi = [groups[int(k)] for k in seg_ticks]
            edge = np.array([all("touches_frame_edge" in obs[i]["quality_flags"] and
                                 obs[i]["floor_method"] not in ("ankles", "one_ankle") for i in g) for g in oi])
            tr = Tracklet(key, camera_id, int(tid), seg_ticks, P[a:b], S[a:b],
                          _smooth_velocity(seg_ticks, P[a:b]), C[a:b], oi, edge)
            _attach_appearance(tr, obs, run_dir, wb_gains)
            tracklets.append(tr)
    tracklets.sort(key=lambda x: x.t_start)
    return tracklets, stats


def _attach_appearance(tr: Tracklet, obs: list[dict], run_dir: Path | None, wb_gains: np.ndarray | None) -> None:
    """Tracklet appearance from the crops saved along it (several crops spread over time, never one frame)."""
    for group in tr.obs_index:
        for i in group:
            if obs[i].get("crop"):
                tr.crops.append(obs[i]["crop"])
    if run_dir is None or wb_gains is None:
        return
    tr.appearance, tr.n_appearance = tracklet_descriptor(run_dir, tr.crops, wb_gains)
