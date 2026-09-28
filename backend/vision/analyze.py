"""Stage 2: raw tracks -> people -> sets -> reps.

Rep counting is exercise-agnostic: inside a set the skeleton is projected onto its dominant direction
of motion (PCA, first component) and the peaks of that 1-D signal are counted. It works the same for
squats, presses, curls, rows... so a slow or wrong exercise label never breaks the rep count.

Pure numpy/scipy: runs on the Pi next to the pose model.
"""
import warnings
from dataclasses import dataclass

import numpy as np
from scipy.ndimage import median_filter, uniform_filter1d
from scipy.signal import find_peaks, peak_widths, savgol_filter

KP_NAMES = ["nose", "left_eye", "right_eye", "left_ear", "right_ear", "left_shoulder", "right_shoulder",
            "left_elbow", "right_elbow", "left_wrist", "right_wrist", "left_hip", "right_hip",
            "left_knee", "right_knee", "left_ankle", "right_ankle"]
# Eyes/ears are a few pixels apart on a ceiling camera and mostly add jitter.
BODY_KPS = [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]


@dataclass
class Params:
    fs: float = 20.0                # analysis sample rate (Hz); reps are 1-4 s so this is plenty
    kp_conf: float = 0.4            # keypoints below this confidence are treated as missing
    max_kp_gap_s: float = 0.6       # interpolate missing keypoints across gaps up to this
    max_track_gap_s: float = 1.0    # ...and missing detections across gaps up to this
    min_track_s: float = 2.0        # drop tracks shorter than this (false positives, passers-by)
    stitch_max_gap_s: float = 3.0   # re-join a track that died and re-spawned within this time...
    stitch_max_dist: float = 0.8    # ...and within this many body heights (+0.4 per second of gap)
    stationary_speed: float = 0.25  # body heights / s; walking is ~0.7
    stationary_min_s: float = 4.0
    kp_min_visible: float = 0.6     # use a keypoint for a segment only if visible this fraction of the time
    detrend_s: float = 5.0          # remove slow posture drift (rolling median)
    smooth_s: float = 0.35          # Savitzky-Golay smoothing window
    energy_win_s: float = 2.5       # window for "is there coherent motion right now"
    energy_thresh: float = 0.04     # sqrt(top eigenvalue) in body heights
    active_merge_gap_s: float = 2.0
    active_min_s: float = 3.0
    pad_s: float = 1.0              # context around an active run (rest position before/after)
    min_period_s: float = 0.7       # fastest plausible rep
    max_period_s: float = 7.0       # slowest plausible rep; bigger gaps split sets
    prominence_frac: float = 0.35   # peak prominence as a fraction of the signal's robust range
    min_amplitude: float = 0.06     # body heights; ignores fidgeting
    min_reps: int = 3
    max_period_cv: float = 0.5      # reps within a set should have roughly regular tempo
    min_periodicity: float = 0.4    # autocorrelation at the rep period; gestures/fidgeting score < 0.35
    min_joint_range: float = 0.10   # some joint must travel >= this many body heights (kills whole-body jiggle)
    max_base_motion: float = 0.12   # box bottom (feet) must stay put; moving = walking or a flaky occluded track
    synced_base_corr: float = 0.8   # ...unless it moves in lockstep with the reps (dips, pull-ups: whole body travels)
    max_synced_base_motion: float = 0.6


@dataclass
class Track:
    ids: list
    t: np.ndarray       # (N,) seconds
    fi: np.ndarray      # (N,) frame index
    box: np.ndarray     # (N, 4) x1 y1 x2 y2
    kp: np.ndarray      # (N, 17, 3) x y conf

    @property
    def height(self):
        return self.box[:, 3] - self.box[:, 1]

    @property
    def anchor(self):
        """Bottom-centre of the box: where the feet are, stays put during most exercises."""
        return np.stack([(self.box[:, 0] + self.box[:, 2]) / 2, self.box[:, 3]], axis=1)

    def extend(self, other):
        self.ids += other.ids
        self.t = np.concatenate([self.t, other.t])
        self.fi = np.concatenate([self.fi, other.fi])
        self.box = np.concatenate([self.box, other.box])
        self.kp = np.concatenate([self.kp, other.kp])


def load_tracks(data):
    rows = {}
    for f in data["frames"]:
        for p in f["people"]:
            rows.setdefault(p["id"], []).append((f["t"], f["i"], p["box"], p["kp"]))
    tracks = {}
    for tid, r in rows.items():
        tracks[tid] = Track(ids=[tid], t=np.array([x[0] for x in r]), fi=np.array([x[1] for x in r]),
                            box=np.array([x[2] for x in r], float), kp=np.array([x[3] for x in r], float))
    return tracks


def stitch(tracks, p):
    """Re-join tracks that the tracker split (occlusion, someone walking in front).

    Greedy in start-time order: a new track continues the ended track whose last position/size best
    matches its first position/size.
    """
    out = []
    for tr in sorted(tracks.values(), key=lambda tr: tr.t[0]):
        best, best_cost = None, np.inf
        h0 = np.median(tr.height[:10])
        a0 = tr.anchor[:5].mean(0)
        for m in out:
            gap = tr.t[0] - m.t[-1]
            if not (0 < gap <= p.stitch_max_gap_s):
                continue
            h1 = np.median(m.height[-10:])
            if not (0.67 < h0 / h1 < 1.5):
                continue
            d = np.linalg.norm(m.anchor[-5:].mean(0) - a0) / ((h0 + h1) / 2)
            if d > p.stitch_max_dist + 0.4 * gap:
                continue
            cost = d + 0.3 * gap
            if cost < best_cost:
                best, best_cost = m, cost
        if best is not None:
            best.extend(tr)
        else:
            out.append(Track(list(tr.ids), tr.t.copy(), tr.fi.copy(), tr.box.copy(), tr.kp.copy()))
    return [m for m in out if m.t[-1] - m.t[0] >= p.min_track_s and len(m.t) >= 15]


# ---------------------------------------------------------------------------------------------
# helpers

def _interp_masked(tg, t, y, valid, max_gap):
    """Linear interpolation of y(t) onto tg using only valid samples; NaN across gaps > max_gap."""
    out = np.full(len(tg), np.nan)
    tv, yv = t[valid], y[valid]
    if len(tv) < 2:
        return out
    j = np.searchsorted(tv, tg, side="right")
    ok = (j >= 1) & (j <= len(tv) - 1)
    jj = np.clip(j, 1, len(tv) - 1)
    ok &= (tv[jj] - tv[jj - 1]) <= max_gap
    out[ok] = np.interp(tg[ok], tv, yv)
    return out


def _fill_nan(x):
    """Fill NaNs along axis 0 by linear interpolation (edges extended). Works on 1-D or 2-D."""
    x = np.array(x, float)
    flat = x.reshape(len(x), -1)
    idx = np.arange(len(x))
    for c in range(flat.shape[1]):
        v = ~np.isnan(flat[:, c])
        if v.sum() == 0:
            flat[:, c] = 0.0
        elif (~v).any():
            flat[:, c] = np.interp(idx, idx[v], flat[v, c])
    return flat.reshape(x.shape)


def _runs(mask):
    """[(start, end_exclusive)] of True runs."""
    m = np.concatenate([[False], np.asarray(mask, bool), [False]])
    d = np.diff(m.astype(int))
    return list(zip(np.where(d == 1)[0], np.where(d == -1)[0]))


def _close_gaps(mask, max_gap):
    """Fill False gaps shorter than max_gap samples between True runs."""
    mask = np.asarray(mask, bool).copy()
    r = _runs(mask)
    for (a0, a1), (b0, _) in zip(r, r[1:]):
        if b0 - a1 <= max_gap:
            mask[a1:b0] = True
    return mask


def _odd(n):
    n = max(3, int(round(n)))
    return n if n % 2 else n + 1


# ---------------------------------------------------------------------------------------------
# per-track analysis

def resample(tr, p):
    tg = np.arange(tr.t[0], tr.t[-1] + 1e-9, 1.0 / p.fs)
    allv = np.ones(len(tr.t), bool)
    box = np.stack([_interp_masked(tg, tr.t, tr.box[:, c], allv, p.max_track_gap_s) for c in range(4)], 1)
    kp = np.full((len(tg), 17, 2), np.nan)
    for k in range(17):
        v = tr.kp[:, k, 2] >= p.kp_conf
        for c in range(2):
            kp[:, k, c] = _interp_masked(tg, tr.t, tr.kp[:, k, c], v, p.max_kp_gap_s)
    present = ~np.isnan(box[:, 0])
    return tg, box, kp, present


def stationary_mask(box, present, p):
    fs = p.fs
    H = _fill_nan(box[:, 3] - box[:, 1])
    anchor = _fill_nan(np.stack([(box[:, 0] + box[:, 2]) / 2, box[:, 3]], 1))
    anchor = uniform_filter1d(anchor, size=int(fs), axis=0, mode="nearest")
    vel = np.gradient(anchor, axis=0) * fs
    speed = uniform_filter1d(np.linalg.norm(vel, axis=1) / np.maximum(H, 1), size=int(fs), mode="nearest")
    still = (speed < p.stationary_speed) & present
    still = _close_gaps(still, int(0.5 * fs))
    return still, speed


def coherent_energy(X, win):
    """sqrt of the top covariance eigenvalue in a sliding window: large when many joints move together
    (a rep), small for independent keypoint jitter."""
    T = len(X)
    e = np.zeros(T)
    h = win // 2
    for i in range(T):
        w = X[max(0, i - h): i + h + 1]
        if len(w) < 4:
            continue
        c = np.cov(w, rowvar=False)
        e[i] = np.sqrt(max(np.linalg.eigvalsh(c)[-1], 0))
    return e


def count_reps(s, p):
    """Count reps in an oriented 1-D signal (rest ~ low values, rep extreme = peak).

    Returns peak indices, rep start/end indices, prominence used, robust range.
    """
    fs = p.fs
    lo, hi = np.percentile(s, [5, 95])
    rng = hi - lo
    if rng < p.min_amplitude:
        return None
    prom = max(p.prominence_frac * rng, 0.5 * p.min_amplitude)
    peaks, props = find_peaks(s, prominence=prom, distance=int(p.min_period_s * fs))
    if len(peaks) == 0:
        return None
    rests, starts, ends = [], [], []
    for k, pk in enumerate(peaks):
        level = s[pk] - 0.5 * props["prominences"][k]
        left = props["left_bases"][k]
        right = props["right_bases"][k]
        before = np.where(s[left:pk] < level)[0]
        after = np.where(s[pk:right + 1] < level)[0]
        lo = peaks[k - 1] if k > 0 else left
        rests.append(lo + int(np.argmin(s[lo:pk + 1])))          # rest position before this rep
        starts.append(left + before[-1] if len(before) else left)  # halfway into the rep
        ends.append(pk + after[0] if len(after) else right)        # halfway back = rep counted
    return dict(peaks=peaks, rests=np.array(rests), starts=np.array(starts), ends=np.array(ends),
                prom=prom, rng=rng)


def orientation(s, s_raw, p):
    """+1 / -1 so that rep extremes are peaks and the rest position is the low side.

    Primary cue is dwell: lifters pause at rest (standing tall, arms extended) while the far end of a rep
    is brief, so the side with the narrower peaks is the rep side. For continuous reps with no pause the
    two sides look alike; then fall back to "the lifter is at rest at the start/end of the window",
    judged on the un-detrended signal (the rolling-median detrend pulls rest to the middle).
    """
    lo, hi = np.percentile(s, [5, 95])
    prom = max(p.prominence_frac * (hi - lo), 0.5 * p.min_amplitude)
    widths = []
    for sign in (1, -1):
        pk, _ = find_peaks(sign * s, prominence=prom, distance=int(p.min_period_s * p.fs))
        widths.append(np.median(peak_widths(sign * s, pk, rel_height=0.5)[0]) if len(pk) >= 2 else np.nan)
    if np.all(np.isfinite(widths)):
        ratio = widths[1] / widths[0]  # > 1: dips are broader than peaks -> peaks are the rep extremes
        if ratio > 1.15:
            return 1
        if ratio < 1 / 1.15:
            return -1
    e = max(3, int(0.75 * p.fs))
    rest = np.median(np.concatenate([s_raw[:e], s_raw[-e:]]))
    lo, hi = np.percentile(s_raw, [5, 95])
    return 1 if abs(rest - lo) <= abs(rest - hi) else -1


def periodicity(seg, period):
    """Normalised autocorrelation of seg at lags around `period` samples (1 = perfectly repeating)."""
    seg = seg - seg.mean()
    ac = np.correlate(seg, seg, "full")[len(seg) - 1:]
    if ac[0] <= 0:
        return 0.0
    lags = np.arange(int(0.7 * period), int(1.3 * period) + 1)
    lags = lags[(lags > 0) & (lags < len(ac))]
    return float((ac[lags] / ac[0]).max()) if len(lags) else 0.0


def _p_range(v):
    v = v[np.isfinite(v)]
    return float(np.percentile(v, 95) - np.percentile(v, 5)) if len(v) > 5 else 0.0


def heuristic_exercise(raw, peaks):
    """Very rough label from joint ranges, used only when no vision-language model is available.

    raw: (T, 17, 2) keypoints normalised by body height (y down).
    """
    def yr(ks):
        v = np.nanmean(raw[:, ks, 1], axis=1)
        return float(np.nanpercentile(v, 95) - np.nanpercentile(v, 5)) if np.isfinite(v).any() else 0.0

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)  # all-NaN joints (e.g. legs hidden) are expected
        hip, sho, wri = yr([11, 12]), yr([5, 6]), yr([9, 10])
        if hip > 0.1 and sho > 0.7 * hip:
            return "squat", 0.45
        if wri > 0.1 and wri > 2 * hip:
            wy = np.nanmean(raw[peaks][:, [9, 10], 1], axis=1)
            sy = np.nanmean(raw[peaks][:, [5, 6], 1], axis=1)
            above = np.nanmean(wy < sy) if np.isfinite(wy).any() else 0
            if above > 0.5:
                return "shoulder_press", 0.35
            return "bicep_curl", 0.3
        return "other", 0.2


def analyze_track(tr, p):
    fs = p.fs
    tg, box, kp, present = resample(tr, p)
    still, speed = stationary_mask(box, present, p)
    sets = []
    for a, b in _runs(still):
        if (b - a) / fs < p.stationary_min_s:
            continue
        H0 = np.nanmedian(box[a:b, 3] - box[a:b, 1])
        A0 = np.nanmedian(np.stack([(box[a:b, 0] + box[a:b, 2]) / 2, box[a:b, 3]], 1), axis=0)
        vis = (~np.isnan(kp[a:b, :, 0])).mean(0)
        used = [k for k in BODY_KPS if vis[k] >= p.kp_min_visible]
        if len(used) < 4:
            continue
        raw = (kp[a:b] - A0) / H0                              # (T, 17, 2), NaN where missing
        Xs = _fill_nan(raw[:, used].reshape(b - a, -1))         # (T, 2K)
        if len(Xs) > _odd(p.smooth_s * fs):
            Xs = savgol_filter(Xs, _odd(p.smooth_s * fs), 2, axis=0)
        X = Xs - median_filter(Xs, size=(_odd(p.detrend_s * fs), 1), mode="nearest")
        energy = coherent_energy(X, int(p.energy_win_s * fs))
        active = _close_gaps(energy > p.energy_thresh, int(p.active_merge_gap_s * fs))
        for c, d in _runs(active):
            if (d - c) / fs < p.active_min_s:
                continue
            w0, w1 = max(0, c - int(p.pad_s * fs)), min(len(X), d + int(p.pad_s * fs))
            Xw = X[w0:w1] - X[w0:w1].mean(0)
            _, _, Vt = np.linalg.svd(Xw, full_matrices=False)
            s = Xw @ Vt[0] * orientation(Xw @ Vt[0], (Xs[w0:w1] - Xs[w0:w1].mean(0)) @ Vt[0], p)
            res = count_reps(s, p)
            if res is None:
                continue
            # Split into sets wherever the gap between reps is implausibly long.
            pk = res["peaks"]
            breaks = np.where(np.diff(pk) / fs > p.max_period_s)[0] + 1
            for grp in np.split(np.arange(len(pk)), breaks):
                if len(grp) < p.min_reps:
                    continue
                gp = pk[grp]
                iv = np.diff(gp) / fs
                cv = float(iv.std() / iv.mean()) if len(iv) > 1 else 0.0
                if cv > p.max_period_cv:
                    continue
                st, en = res["starts"][grp], res["ends"][grp]
                period = float(np.median(np.diff(gp)))
                per_score = periodicity(s[st[0]:en[-1] + 1], period)
                if per_score < p.min_periodicity:
                    continue
                r0, r1 = w0 + st[0], w0 + en[-1] + 1  # set window, index into raw / segment
                joint_range = max(max(_p_range(raw[r0:r1, k, 0]), _p_range(raw[r0:r1, k, 1])) for k in used)
                base = box[a + r0:a + r1, 3]
                base_motion = _p_range(base) / H0
                if base_motion > p.max_base_motion:
                    ok = np.isfinite(base)
                    sync = abs(np.corrcoef(base[ok], s[st[0]:en[-1] + 1][ok])[0, 1]) if ok.sum() > 5 else 0.0
                    if sync < p.synced_base_corr or base_motion > p.max_synced_base_motion:
                        continue
                if joint_range < p.min_joint_range:
                    continue
                off = a + w0  # index into tg
                loading = np.linalg.norm(Vt[0].reshape(-1, 2), axis=1)
                top = [KP_NAMES[used[i]] for i in np.argsort(-loading)[:4]]
                ex, conf = heuristic_exercise(raw[w0:w1], gp)
                sets.append({
                    "start_s": round(float(tg[off + st[0]]), 2),
                    "end_s": round(float(tg[off + en[-1]]), 2),
                    "reps": int(len(gp)),
                    "rep_times_s": [round(float(tg[off + i]), 2) for i in en],   # rep completed (counter +1)
                    "rep_peak_s": [round(float(tg[off + i]), 2) for i in gp],    # furthest point of each rep
                    "rep_rest_s": [round(float(tg[off + i]), 2) for i in res["rests"][grp]],  # rest pos. before
                    "rep_mid_s": [round(float(tg[off + i]), 2) for i in st],     # halfway into each rep
                    "period_s": round(float(np.median(iv)) if len(iv) else 0.0, 2),
                    "amplitude": round(float(res["rng"]), 3),
                    "regularity": round(1 - cv, 2),
                    "periodicity": round(per_score, 2),
                    "joint_range": round(joint_range, 3),
                    "moving_joints": top,
                    "exercise": ex,
                    "confidence": conf,
                    "exercise_source": "heuristic",
                })
    return {"tg": tg, "box": box, "kp": kp, "present": present, "still": still, "speed": speed, "sets": sets}


def analyze(data, p=None):
    p = p or Params()
    tracks = stitch(load_tracks(data), p)
    people = []
    for n, tr in enumerate(sorted(tracks, key=lambda tr: tr.t[0]), start=1):
        res = analyze_track(tr, p)
        people.append({
            "id": n,
            "track_ids": tr.ids,
            "first_seen_s": round(float(tr.t[0]), 2),
            "last_seen_s": round(float(tr.t[-1]), 2),
            "sets": res["sets"],
            "_track": tr,
            "_res": res,
        })
    return people
