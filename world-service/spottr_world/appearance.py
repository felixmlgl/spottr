"""Tracklet-level appearance (derived layer): white-balanced Lab colour histograms from saved crops.

Why this and not a deep ReID model: the two cameras face each other, so one sees a person's front and
the other their back, often at 60-120 px tall. On the reviewed Great Hall segment a generic
self-supervised embedding (DINOv2-S) separated same/different people worse (ROC AUC 0.68) than
per-camera white-balanced clothing colour (0.79). The raw layer keeps its original per-detection HSV
descriptor; this module recomputes a tracklet descriptor from up to MAX_CROPS crops spread over the
tracklet, so appearance is never a single-frame decision.

The similarity -> log-likelihood-ratio mapping below was read off the empirical same/different
distributions on the reviewed segment (data/ground_truth/great_hall_030_090.json). With ~40 same and
~250 different cross-camera pairs this is a coarse estimate, and appearance only ever adds evidence
on top of geometry; it can't create a link by itself.
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

MAX_CROPS = 20
MIN_CROP_HEIGHT = 40
# similarity knots -> LLR knots (piecewise linear, clipped at the ends)
SIM_KNOTS = [0.45, 0.60, 0.70, 0.80, 0.90]
LLR_KNOTS = [-1.6, -1.0, -0.2, 1.0, 1.8]


def white_balance_gains(plate: np.ndarray) -> np.ndarray:
    """Gray-world gains from a camera's background plate (corrects each camera's colour cast)."""
    m = plate.reshape(-1, 3).astype(np.float64).mean(0)
    return m.mean() / np.maximum(m, 1e-6)


def crop_descriptor(img: np.ndarray, gains: np.ndarray) -> np.ndarray | None:
    h, w = img.shape[:2]
    if h < MIN_CROP_HEIGHT or w < 12:
        return None
    im = np.clip(img.astype(np.float64) * gains, 0, 255).astype(np.uint8)
    lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32)
    x0, x1 = int(w * 0.2), int(w * 0.8)
    parts = [lab[int(h * 0.18):int(h * 0.5), x0:x1], lab[int(h * 0.55):int(h * 0.9), x0:x1]]
    out = []
    for p in parts:
        p = p.reshape(-1, 3)
        if len(p) < 20:
            return None
        H, _ = np.histogramdd(p, bins=(4, 6, 6), range=((0, 256), (96, 160), (96, 160)))
        out.append(np.sqrt(H.ravel() / len(p)))  # Hellinger: robust to a few dominant bins
    d = np.concatenate(out)
    n = np.linalg.norm(d)
    return d / n if n > 0 else None


def tracklet_descriptor(run_dir: Path, crops: list[str], gains: np.ndarray) -> tuple[np.ndarray | None, int]:
    if not crops:
        return None, 0
    pick = crops if len(crops) <= MAX_CROPS else [crops[i] for i in np.linspace(0, len(crops) - 1, MAX_CROPS).astype(int)]
    descs = []
    for c in pick:
        img = cv2.imread(str(run_dir / c))
        if img is None:
            continue
        d = crop_descriptor(img, gains)
        if d is not None:
            descs.append(d)
    if not descs:
        return None, 0
    m = np.mean(descs, axis=0)
    return m / np.linalg.norm(m), len(descs)


def similarity_llr(sim: float) -> float:
    return float(np.interp(sim, SIM_KNOTS, LLR_KNOTS))
