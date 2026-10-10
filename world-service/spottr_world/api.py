"""HTTP API of the shared-world service (the frontend's only source of identities and positions).

  SPOTTR_VIDEO_DIR="../video material" .venv/bin/uvicorn spottr_world.api:app --port 8787

Endpoints (docs/SCHEMA.md):
  GET  /health
  GET  /world-map/config
  GET  /playback/timeline
  GET  /world-state?timestamp=           one shared world-state frame (nearest tick)
  GET  /world-state/range?from=&to=      frames for playback
  GET  /camera-observations?cameraId=&timestamp=[&keypoints=1]
  GET  /camera-observations/range?cameraId=&from=&to=
  GET  /identities/{global_person_id}    audit trail of one identity
  GET  /metrics
  GET  /calibration                      current calibration document
  POST /calibration                      fit + grade an operator landmark calibration (dry run by default)
  POST /demo/process                     re-run association (or the full pipeline) in the background
  GET  /demo/process/{job_id}
  GET  /media/plates/{camera}.jpg, /media/video/{camera}.mp4
"""
from __future__ import annotations

import json
import os
import threading
import time
import traceback
import uuid
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from . import calibration as cal
from .views import Run

SERVICE_ROOT = Path(__file__).resolve().parent.parent
RUN_DIR = Path(os.environ.get("SPOTTR_RUN_DIR", SERVICE_ROOT / "out" / "great_hall"))
CALIBRATION = Path(os.environ.get("SPOTTR_CALIBRATION", SERVICE_ROOT / "data" / "calibration" / "great_hall.json"))

app = FastAPI(title="Spottr shared-world service", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("SPOTTR_CORS", "http://localhost:3000").split(","),
                   allow_methods=["GET", "POST"], allow_headers=["*"])

_run: Run | None = None
_lock = threading.Lock()
_jobs: dict[str, dict] = {}


def run() -> Run:
    global _run
    with _lock:
        if _run is None:
            if not (RUN_DIR / "metrics.json").exists():
                raise HTTPException(503, "no processed run yet: POST /demo/process or run the pipeline CLI")
            _run = Run(RUN_DIR)
        return _run


@app.get("/health")
def health():
    return {"ok": True, "run": RUN_DIR.name, "processed": (RUN_DIR / "metrics.json").exists()}


@app.get("/world-map/config")
def world_map_config():
    return run().world_map_config(media_base="/media/")


@app.get("/playback/timeline")
def playback_timeline():
    return run().timeline(media_base="/media/")


@app.get("/world-state")
def world_state(timestamp: float = Query(..., ge=0)):
    return run().world_state(timestamp)


@app.get("/world-state/range")
def world_state_range(from_: float = Query(..., alias="from", ge=0), to: float = Query(...), step: int = Query(1, ge=1, le=25)):
    if to < from_ or to - from_ > 600:
        raise HTTPException(400, "range must be 0..600 s")
    return run().world_state_range(from_, to, step)


@app.get("/camera-observations")
def camera_observations(cameraId: str, timestamp: float = Query(..., ge=0), keypoints: bool = False):
    try:
        return run().camera_observations(cameraId, timestamp, keypoints)
    except KeyError:
        raise HTTPException(404, f"unknown camera {cameraId}")


@app.get("/camera-observations/range")
def camera_observations_range(cameraId: str, from_: float = Query(..., alias="from", ge=0), to: float = Query(...)):
    if to < from_ or to - from_ > 600:
        raise HTTPException(400, "range must be 0..600 s")
    try:
        return run().camera_observations_range(cameraId, from_, to)
    except KeyError:
        raise HTTPException(404, f"unknown camera {cameraId}")


@app.get("/identities/{gid}")
def identity(gid: str):
    return run().identity(gid)


@app.get("/metrics")
def metrics():
    return run().metrics_payload()


@app.get("/calibration")
def get_calibration():
    return json.loads(CALIBRATION.read_text())


class LandmarkClick(BaseModel):
    landmark_id: str
    pixel: tuple[float, float]


class FloorLandmark(BaseModel):
    id: str
    name: str = ""
    world: tuple[float, float]


class CalibrationRequest(BaseModel):
    camera_id: str
    image_size: tuple[int, int] = (1280, 720)
    landmarks: list[LandmarkClick] = Field(..., min_length=4)
    floor_landmarks: list[FloorLandmark] = Field(..., min_length=4)
    dry_run: bool = True


@app.post("/calibration")
def post_calibration(req: CalibrationRequest):
    """Operator workflow: >= 4 (ideally 6-8) floor landmarks clicked in one camera and placed on the floor plan.

    Fits the image->floor homography, reports reprojection error (incl. leave-one-out) and a grade with
    reasons. With dry_run=false the result is saved as a new calibration version next to the current
    one; it never silently replaces the calibration a processed run was made with.
    """
    world = {l.id: l.world for l in req.floor_landmarks}
    pairs = [(c.pixel, world[c.landmark_id]) for c in req.landmarks if c.landmark_id in world]
    if len(pairs) < cal.MIN_LANDMARKS:
        raise HTTPException(422, f"need at least {cal.MIN_LANDMARKS} landmarks that exist on the floor plan")
    px = np.array([p for p, _ in pairs], float)
    wd = np.array([w for _, w in pairs], float)
    try:
        H, inl = cal.fit_homography(px, wd)
    except Exception as e:  # degenerate (collinear) clicks
        raise HTTPException(422, f"could not fit a floor mapping: {e}")
    rep = cal.reprojection_report(H, px, wd, req.image_size)
    grade, reasons = cal.grade(rep)
    if not cal.h_valid_mask(H, px).all():
        grade, reasons = "weak", reasons + ["some landmarks project behind the camera: check the clicks"]
    out = {"camera_id": req.camera_id, "homography_image_to_world": H.round(10).tolist(),
           "reprojection_error": rep, "quality": grade, "quality_reasons": reasons,
           "outliers": [req.landmarks[i].landmark_id for i in np.where(~inl)[0]], "saved_as": None}
    if not req.dry_run:
        doc = json.loads(CALIBRATION.read_text())
        doc["calibration_id"] = f"{doc['calibration_id']}+{req.camera_id}@{int(time.time())}"
        for c in doc["cameras"]:
            if c["camera_id"] == req.camera_id:
                c.update(homography_image_to_world=out["homography_image_to_world"], reprojection_error=rep,
                         quality=grade, quality_reasons=reasons, source="operator_landmarks",
                         landmarks=[l.model_dump() for l in req.landmarks])
        path = CALIBRATION.with_name(f"{CALIBRATION.stem}.v{int(time.time())}.json")
        path.write_text(json.dumps(doc, indent=2))
        out["saved_as"] = path.name
    return out


class ProcessRequest(BaseModel):
    stages: str = Field("associate", pattern="^(associate|full)$")
    offset_s: float | None = None


def _process(job_id: str, req: ProcessRequest) -> None:
    from .pipeline import find_videos, default_video_dir
    from .pipeline import run as run_pipeline

    job = _jobs[job_id]
    try:
        cams = find_videos(os.environ.get("SPOTTR_VIDEO_DIR", default_video_dir()))
        if req.stages == "full":
            from .track import track_camera
            for c in cams:
                job["stage"] = f"tracking {c['camera_id']}"
                track_camera(c["camera_id"], c["video"], RUN_DIR)
        job["stage"] = "associating"
        calib = cal.load(CALIBRATION)
        if req.offset_s is not None:
            calib["sync"]["offsets_s"][cams[1]["camera_id"]] = req.offset_s
            calib["sync"]["method"] = "manual override"
        job["metrics"] = run_pipeline(RUN_DIR, cams, calib, log=lambda s: job["log"].append(s))
        global _run
        with _lock:
            _run = None
        job["status"] = "done"
    except Exception as e:  # report, do not crash the server
        job["status"] = "failed"
        job["error"] = f"{e}\n{traceback.format_exc()}"
    job["finished_at"] = time.time()


@app.post("/demo/process")
def demo_process(req: ProcessRequest):
    if any(j["status"] == "running" for j in _jobs.values()):
        raise HTTPException(409, "a job is already running")
    job_id = uuid.uuid4().hex[:12]
    _jobs[job_id] = {"job_id": job_id, "status": "running", "stage": "queued", "log": [], "started_at": time.time()}
    threading.Thread(target=_process, args=(job_id, req), daemon=True).start()
    return {"job_id": job_id, "status": "running"}


@app.get("/demo/process/{job_id}")
def demo_process_status(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(404, "unknown job")
    return _jobs[job_id]


@app.get("/media/plates/{camera_id}.jpg")
def plate(camera_id: str):
    p = RUN_DIR / "plates" / f"{Path(camera_id).name}.jpg"
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p)


@app.get("/media/video/{camera_id}.mp4")
def video(camera_id: str):
    from .pipeline import find_videos, default_video_dir
    cams = {c["camera_id"]: c for c in find_videos(os.environ.get("SPOTTR_VIDEO_DIR", default_video_dir()))}
    if camera_id not in cams:
        raise HTTPException(404)
    return FileResponse(cams[camera_id]["video"], media_type="video/mp4")
