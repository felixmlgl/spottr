"""Stage `track`: per-camera person detection, pose and local tracklets -> immutable raw observations.

One JSON line per detection (gzip): out/<run>/raw/<camera_id>.jsonl.gz
Local track IDs are only meaningful inside one camera and one run; they are never shown as identities.
World coordinates are *not* written here: projection depends on calibration, which can change, so it
is a derived layer (see project.py). Raw observations stay replayable when calibration is corrected.
"""
from __future__ import annotations

import gzip
import json
import sys
import time
from pathlib import Path

import cv2
import numpy as np

from .ingest import FileSource, probe
from .observation import appearance, floor_contact, quality_flags

SERVICE_ROOT = Path(__file__).resolve().parent.parent
TRACKER_CFG = Path(__file__).resolve().parent / "tracker_botsort.yaml"
DEFAULT_MODEL = SERVICE_ROOT / "models" / "yolo26s-pose.pt"
CROP_EVERY_S = 2.0


def track_camera(camera_id: str, video: str, out_dir: Path, *, stride: int = 2, imgsz: int = 1280, conf: float = 0.25,
                 model_path: Path = DEFAULT_MODEL, device: str | None = None, start_s: float = 0.0,
                 end_s: float | None = None) -> dict:
    from ultralytics import YOLO  # heavy import only for this stage

    info = probe(video)
    model = YOLO(str(model_path))
    raw_dir = out_dir / "raw"
    crop_dir = out_dir / "crops" / camera_id
    raw_dir.mkdir(parents=True, exist_ok=True)
    crop_dir.mkdir(parents=True, exist_ok=True)
    last_crop: dict[int, float] = {}
    n_frames = n_obs = 0
    t0 = time.time()
    infer_s = 0.0
    with gzip.open(raw_dir / f"{camera_id}.jsonl.gz", "wt") as f:
        for i, t, frame in FileSource(camera_id, video, stride, start_s, end_s).frames():
            ti = time.time()
            r = model.track(frame, persist=True, tracker=str(TRACKER_CFG), imgsz=imgsz, conf=conf,
                            device=device, verbose=False)[0]
            infer_s += time.time() - ti
            n_frames += 1
            if r.boxes is None or r.boxes.id is None:
                continue
            ids = r.boxes.id.int().tolist()
            boxes = r.boxes.xyxy.tolist()
            scores = r.boxes.conf.tolist()
            kps = None
            if r.keypoints is not None:
                kps = np.concatenate([r.keypoints.xy.cpu().numpy(), r.keypoints.conf.cpu().numpy()[..., None]], axis=2)
            for j, (tid, box, score) in enumerate(zip(ids, boxes, scores)):
                kp = kps[j] if kps is not None else None
                fp, method, sigma = floor_contact(box, kp)
                desc, aq = appearance(frame, box, kp)
                crop_path = None
                if desc is not None and t - last_crop.get(tid, -1e9) >= CROP_EVERY_S:
                    x1, y1, x2, y2 = [int(round(v)) for v in box]
                    crop = frame[max(0, y1):y2, max(0, x1):x2]
                    if crop.size:
                        crop_path = f"crops/{camera_id}/{tid}_{i}.jpg"
                        cv2.imwrite(str(out_dir / crop_path), crop, [cv2.IMWRITE_JPEG_QUALITY, 85])
                        last_crop[tid] = t
                rec = {
                    "camera_id": camera_id,
                    "frame": i,
                    "t_local": round(t, 4),
                    "local_track_id": int(tid),
                    "bbox": [round(v, 1) for v in box],
                    "det_conf": round(float(score), 3),
                    "keypoints": None if kp is None else [[round(float(x), 1), round(float(y), 1), round(float(c), 2)] for x, y, c in kp],
                    "floor_point_px": [round(v, 1) for v in fp],
                    "floor_method": method,
                    "floor_sigma_px": round(float(sigma), 1),
                    "appearance": None if desc is None else [round(float(v), 4) for v in desc],
                    "appearance_quality": aq,
                    "crop": crop_path,
                    "quality_flags": quality_flags(box, score, method, info.width, info.height),
                }
                f.write(json.dumps(rec, separators=(",", ":")) + "\n")
                n_obs += 1
            if n_frames % 300 == 0:
                el = time.time() - t0
                print(f"  [{camera_id}] t={t:6.1f}s  {n_frames / el:.1f} fps  {n_obs} obs", file=sys.stderr, flush=True)
    wall = time.time() - t0
    meta = {
        "camera_id": camera_id,
        "video": info.to_dict(),
        "model": model_path.name,
        "imgsz": imgsz,
        "stride": stride,
        "processed_frames": n_frames,
        "observations": n_obs,
        "wall_s": round(wall, 1),
        "processing_fps": round(n_frames / max(wall, 1e-6), 2),
        "inference_ms_per_frame": round(1000 * infer_s / max(n_frames, 1), 1),
    }
    (raw_dir / f"{camera_id}.meta.json").write_text(json.dumps(meta, indent=2))
    return meta


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="Per-camera detection + pose + local tracking")
    ap.add_argument("camera_id")
    ap.add_argument("video")
    ap.add_argument("--out", default=str(SERVICE_ROOT / "out" / "great_hall"))
    ap.add_argument("--stride", type=int, default=2)
    ap.add_argument("--imgsz", type=int, default=1280)
    ap.add_argument("--device", default=None)
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float, default=None)
    a = ap.parse_args()
    m = track_camera(a.camera_id, a.video, Path(a.out), stride=a.stride, imgsz=a.imgsz, device=a.device,
                     start_s=a.start, end_s=a.end)
    print(json.dumps(m, indent=2))
