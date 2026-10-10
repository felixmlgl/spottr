# Spottr world service: two cameras, one shared floor map

Prototype service that turns several fixed cameras into observations of **one** room. Every person seen
by either camera, or both, resolves to one `global_person_id` on a shared bird's-eye floor map. The
service is the only place where identity and position decisions are made; the `/gyms/world-map` page only
renders its output.

It lives outside `backend/` (owned by another team) and talks to the rest of Spottr through a documented
API ([docs/SCHEMA.md](docs/SCHEMA.md)), so it can later be folded into the production backend.

* [docs/REPORT.md](docs/REPORT.md): video inspection, metrics, calibration quality, assumptions, failure modes
* [docs/SCHEMA.md](docs/SCHEMA.md): raw observations, calibration, world state, API
* [docs/CALIBRATION_GUIDE.md](docs/CALIBRATION_GUIDE.md): calibration steps for a gym operator

## Architecture

```
 Perspective 1 video ─┐                                  ┌─ Perspective 2 video
                      ▼                                  ▼
             ingest.FileSource                   ingest.FileSource        (LiveStreamSource: RTSP/WebRTC, later)
                      │                                  │
             track.py: YOLO26-pose + BoT-SORT per camera, floor-contact point, crops
                      │                                  │
                      └──► raw/<cam>.jsonl.gz  ◄─────────┘   IMMUTABLE raw observations (replayable)
                                     │
       ┌─────────────────────────────┼───────────────────────────────────────────┐
       │ bootstrap.py (once per site)│                                           │
       │  plumb-line vanishing point + eye-height self-calibration per camera    │
       │  audio prior + moving-people agreement  ──► time offset                 │
       │  RANSAC + joint refinement on co-observed people ──► one floor frame    │
       │  operator wall/landmark clicks ──► room outline, quality grade          │
       └─────────────────────────────┼─────────── data/calibration/<site>.json ──┘
                                     ▼
       tracklets.py   derived floor points ─► image→floor homography ─► metres on the shared map,
                      per-camera tracklets on a 5 Hz shared timeline, tracklet appearance from crops
                                     ▼
       association.py cross-camera evidence (log-likelihood ratios) with hard gates:
                      floor distance · shared coverage · speed · multi-crop appearance · motion
                                     ▼
       identity.py    Hungarian assignment per step on cumulative evidence, confidence + margin,
                      re-acquisition (occlusion / exit / one camera lost them), union-find identities
                      with cannot-link constraints, 3 s decision lag, audit events
                                     ▼
       world_state.jsonl.gz  ── the single source of truth for zones, sessions, workouts
                                     ▼
       views.py ──► api.py (FastAPI)  and  export.py (static files for Vercel) ──► /gyms/world-map
```

Everything after `track.py` is numpy/scipy only and runs at ~70-130x realtime on a laptop, so tuning
association never needs the GPU. Raw observations are never rewritten: floor points, projections and
identities are derived layers and can be recomputed when calibration or logic improves.

## Run the Great Hall demo

```bash
cd world-service
uv venv --python 3.12 .venv && uv pip install -p .venv/bin/python -r requirements.txt
mkdir -p models && curl -L -o models/yolo26s-pose.pt \
  https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo26s-pose.pt
export SPOTTR_VIDEO_DIR="/path/to/video material"     # files matching "Perspective 1 Great Hall*", "perspective2 Great Hall*"

.venv/bin/python -m spottr_world.pipeline --track --device mps   # 1. detection + tracking (~25 min on an M4 for both)
.venv/bin/python -m spottr_world.pipeline                        # 2. calibration in data/ + association (~15 s)
.venv/bin/python -m spottr_world.pipeline --bootstrap            #    re-derive calibration + sync from the footage
.venv/bin/python -m spottr_world.pipeline --offset -0.2          #    manual time-offset override
.venv/bin/python -m spottr_world.evaluate out/great_hall data/ground_truth/great_hall_420_480.json
.venv/bin/python -m spottr_world.export                          # 3. ../public/world-demo/ for the frontend
.venv/bin/python tests/test_world.py                             # synthetic scenario tests
```

Live API instead of the static export:

```bash
.venv/bin/uvicorn spottr_world.api:app --port 8787               # then: VITE_WORLD_API_URL=http://localhost:8787 npm run dev
```

Developer views: `python -m spottr_world.debug_render birdseye|frame ...` (map and annotated frames),
`python -m spottr_world.gt_tool sheet|tracks ...` (ground-truth review sheets).

## Modules

| Module | Responsibility |
| --- | --- |
| `ingest.py` | video probing, `FrameSource` interface (`FileSource`; `LiveStreamSource` stub for RTSP/WebRTC) |
| `track.py`, `observation.py` | per-camera detection, pose, local tracks, floor-contact point, quality flags, crops |
| `audio_sync.py`, `bootstrap.py` | time offset (audio prior + trajectory agreement), self-calibration, cross-camera alignment, room outline |
| `calibration.py` | camera model, homography fitting from operator landmarks, reprojection error, grading, persistence |
| `tracklets.py`, `appearance.py` | projection to world, cleaned tracklets, multi-crop clothing descriptors |
| `association.py` | gated cross-camera evidence, per-step global assignment, re-acquisition candidates |
| `identity.py` | global identity lifecycle, world state, evidence summaries, audit log |
| `evaluate.py`, `gt_tool.py` | metrics against reviewed ground truth, review tooling |
| `views.py`, `api.py`, `export.py` | API payloads, HTTP service, static export |

## Not done yet

* Live RTSP/WebRTC ingestion (interface in place, implementation not built).
* More than two cameras: association and identities are N-camera; the bootstrap aligns cameras pairwise
  and has only been run for two.
* Linking the world state to workout/rep sessions from `backend/`.
* Full 3D (triangulated keypoints, barbell height): the per-camera pinhole models are estimated and stored,
  but only the floor plane is used.
