"""Audio prior for the time offset between two recordings (run as a subprocess: imports PyAV, not OpenCV).

Offset convention used everywhere: shared time = local time + offset. The reference camera has offset 0.
For camera B, an event at A-local time tA happens at B-local time tB = tA - offset_B.

Output (stdout, JSON): {"offset_s", "z", "consistent_windows", "windows", "confidence"}
"""
from __future__ import annotations

import json
import sys

import numpy as np

SR = 8000
HOP = 40            # 200 Hz onset envelope
MAX_LAG_S = 20.0


def _load(path: str) -> np.ndarray:
    import av

    c = av.open(path)
    s = c.streams.audio[0]
    r = av.AudioResampler(format="flt", layout="mono", rate=SR)
    out = []
    for f in c.decode(s):
        for g in r.resample(f):
            out.append(g.to_ndarray().ravel())
    return np.concatenate(out)


def _onsets(x: np.ndarray) -> np.ndarray:
    n = len(x) // HOP
    e = np.log((x[: n * HOP].reshape(n, HOP) ** 2).mean(1) + 1e-10)
    d = np.diff(e, prepend=e[0])
    d[d < 0] = 0
    return d - np.convolve(d, np.ones(200) / 200, "same")


def _ncc(a: np.ndarray, b: np.ndarray, max_lag: int) -> tuple[np.ndarray, np.ndarray]:
    lags = np.arange(-max_lag, max_lag + 1)
    out = np.zeros(len(lags))
    for i, L in enumerate(lags):  # a[t] ~ b[t - L]
        if L >= 0:
            x, y = a[L:], b[: len(a) - L]
        else:
            x, y = a[: len(a) + L], b[-L:]
        m = min(len(x), len(y))
        x, y = x[:m], y[:m]
        out[i] = np.dot(x - x.mean(), y - y.mean()) / (x.std() * y.std() * m + 1e-9)
    return lags, out


def estimate(path_a: str, path_b: str) -> dict:
    fa, fb = _onsets(_load(path_a)), _onsets(_load(path_b))
    rate = SR / HOP
    ml = int(MAX_LAG_S * rate)
    lags, c = _ncc(fa, fb, ml)
    k = int(np.argmax(c))
    z = float((c[k] - np.median(c)) / (c.std() + 1e-12))
    lag_s = lags[k] / rate               # a(t) ~ b(t - lag): tB = tA - lag  => offset_B = lag
    # windowed consistency: does each 60 s window agree with the global lag?
    W = int(60 * rate)
    win = []
    for s0 in range(0, len(fa) - W, int(45 * rate)):
        seg = fa[s0: s0 + W]
        best = (-1.0, 0)
        for L in range(-ml, ml + 1, 2):
            j = s0 - L
            if j < 0 or j + W > len(fb):
                continue
            t = fb[j: j + W]
            r = float(np.dot(seg - seg.mean(), t - t.mean()) / (seg.std() * t.std() * W + 1e-9))
            if r > best[0]:
                best = (r, L)
        win.append({"start_s": round(s0 / rate, 1), "lag_s": round(float(best[1] / rate), 3), "r": round(best[0], 4)})
    consistent = sum(abs(w["lag_s"] - lag_s) < 0.25 for w in win)
    conf = "high" if z > 8 and consistent >= len(win) * 0.6 else "medium" if z > 5 and consistent >= 3 else "low"
    return {"offset_s": round(float(lag_s), 3), "z": round(z, 1), "consistent_windows": int(consistent),
            "windows": win, "confidence": conf}


if __name__ == "__main__":
    print(json.dumps(estimate(sys.argv[1], sys.argv[2])))
