"""Stage 1: pose estimation + multi-person tracking over a video.

Output (tracks.json):
  {"video", "width", "height", "fps", "frames": [{"i", "t", "people": [{"id", "box", "score", "kp"}]}]}
  box = [x1, y1, x2, y2] px, kp = 17 x [x, y, conf] in COCO order.

This is the only stage that needs torch/ultralytics; everything downstream is numpy/scipy.
"""
import json
import sys
import time
from pathlib import Path

import cv2
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL = ROOT / "models" / "yolo26n-pose.pt"
TRACKER_CFG = Path(__file__).resolve().parent / "gym_botsort.yaml"


def track_video(video_path, model_path=DEFAULT_MODEL, imgsz=960, conf=0.25, device=None, progress=True):
    model = YOLO(str(model_path))
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise FileNotFoundError(video_path)
    n_total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    out = {
        "video": Path(video_path).name,
        "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        "fps": cap.get(cv2.CAP_PROP_FPS),
        "model": Path(model_path).name,
        "imgsz": imgsz,
        "frames": [],
    }
    t0 = time.time()
    i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        # Real presentation timestamp: phone footage is often variable frame rate.
        t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
        r = model.track(frame, persist=True, tracker=str(TRACKER_CFG), imgsz=imgsz, conf=conf,
                        device=device, verbose=False)[0]
        people = []
        if r.boxes is not None and r.boxes.id is not None and r.keypoints is not None:
            ids = r.boxes.id.int().tolist()
            boxes = r.boxes.xyxy.tolist()
            scores = r.boxes.conf.tolist()
            kxy = r.keypoints.xy.tolist()
            kc = r.keypoints.conf.tolist()
            for tid, box, score, xy, c in zip(ids, boxes, scores, kxy, kc):
                people.append({
                    "id": tid,
                    "box": [round(v, 1) for v in box],
                    "score": round(score, 3),
                    "kp": [[round(x, 1), round(y, 1), round(cc, 2)] for (x, y), cc in zip(xy, c)],
                })
        out["frames"].append({"i": i, "t": round(t, 4), "people": people})
        i += 1
        if progress and i % 200 == 0:
            el = time.time() - t0
            print(f"  frame {i}/{n_total}  {i / el:.1f} fps", file=sys.stderr, flush=True)
    cap.release()
    out["processing_fps"] = round(i / max(time.time() - t0, 1e-6), 1)
    return out


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--model", default=str(DEFAULT_MODEL))
    ap.add_argument("--imgsz", type=int, default=960)
    ap.add_argument("--device", default=None)
    a = ap.parse_args()
    res = track_video(a.video, a.model, a.imgsz, device=a.device)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(res, separators=(",", ":")))
    print(f"wrote {a.out}: {len(res['frames'])} frames at {res['processing_fps']} fps")
