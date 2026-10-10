# Schemas and API (`spottr.world/1`)

Units: metres on the floor map, seconds on the **shared timeline** (camera 1's clock; every other camera
is mapped with `shared = local + offset`). Floor-map frame: x along the room's long walls, y across, SVG
convention (y down). Headings are degrees in that frame (0 = +x, 90 = +y).

## 1. Raw observation (immutable): `out/<run>/raw/<camera_id>.jsonl.gz`

One JSON object per detection per processed frame. Written once by `track.py`, never modified.

| Field | Type | Meaning |
| --- | --- | --- |
| `camera_id` | str | `cam1`, `cam2`, … |
| `frame`, `t_local` | int, float | frame index and presentation timestamp in the camera's own clock |
| `local_track_id` | int | camera-local tracker ID; **not** an identity, not stable across cameras |
| `bbox` | [x1,y1,x2,y2] | pixels |
| `det_conf` | float | detector confidence |
| `keypoints` | 17×[x,y,conf] or null | COCO-17 pose |
| `floor_point_px`, `floor_method`, `floor_sigma_px` | | image floor-contact point at capture time (see below) |
| `appearance`, `appearance_quality` | 72 floats, 0..1 | per-detection HSV part histogram (v1) |
| `crop` | str or null | saved crop (every 2 s per track), basis of tracklet appearance |
| `quality_flags` | [str] | `touches_frame_edge`, `small`, `low_confidence`, `feet_not_visible` |

Derived per observation (recomputed at load, not stored): floor point from keypoints with posture
awareness (`ankles` > `one_ankle` > `knees` > `seated_hips` > `hip_extrapolated` > `box_bottom`), its
uncertainty, projected world position, velocity, tracklet membership and appearance. Detections cut
off by the frame edge with hidden feet get 3× uncertainty and never count as positive geometric evidence.

## 2. Calibration document: `data/calibration/<site>.json` (`spottr.calibration/1`)

```jsonc
{
  "schema_version": "spottr.calibration/1",
  "calibration_id": "great_hall_bootstrap",
  "site": "Great Hall", "units": "m", "frame": "...",
  "floor_map": {
    "width_m": 23.59, "height_m": 12.14,
    "outline": [[x,y], ...],               // rectangle fitted to the measured walls (display)
    "outline_measured": [[x,y], ...],      // raw intersection of the measured wall lines
    "walls": {"cam1:far_end": [[x,y],[x,y]], ...},
    "landmarks": [{"id", "name", "camera_id", "world": [x,y], "world_source"}]
  },
  "cameras": [{
    "camera_id": "cam1", "label": "Perspective 1", "video": "...", "image_size": [1280, 720],
    "time_offset_s": 0.0,
    "homography_image_to_world": [[...],[...],[...]],   // 3x3, image px -> floor metres
    "camera_model": {"type": "pinhole_floor", "fx", "fy", "cx", "cy", "pitch_deg", "roll_deg",
                     "height_m", "distortion": null, "source", "initial_fit": {...}},  // room for intrinsics/extrinsics
    "position_world": [x,y], "heading_deg": 20.0, "horizontal_fov_deg": 85.1,
    "coverage_polygon_px": [...], "coverage_polygon_world": [...],   // where people were actually observed
    "landmarks": [{"landmark_id", "pixel": [u,v]}], "wall_base_px": {...},
    "quality": "good|fair|weak", "quality_reasons": [...]
  }],
  "sync": {"reference_camera": "cam1", "offsets_s": {"cam1": 0.0, "cam2": -0.105}, "method", "confidence",
           "audio_prior": {...}, "trajectory_scan_best": {...}, "scan": [[offset, matches, residual], ...]},
  "cross_camera_alignment": {"method", "joint_refinement": {"pairs", "pair_median_m", "pair_p90_m", ...}},
  "quality": {"grade", "reasons", "cross_camera_floor_agreement_m", "eye_height_residual_px",
              "wall_rectangularity_deviation_deg", "plumb_vanishing_points"}
}
```

Operator clicks that feed it live next to it: `data/calibration/<site>_clicks.json`.

## 3. World state: `out/<run>/world_state.jsonl.gz`, `GET /world-state`

One frame per 0.2 s tick. **The only source of truth for zone/session/workout logic.**

```jsonc
{"t": 455.0, "people": [{
  "global_person_id": "g042",           // distinct from every local track ID
  "label": "Person 42",                 // anonymous, valid inside one run only
  "x": 11.9, "y": 4.4, "vx": 0.6, "vy": -0.1, "speed_mps": 0.61, "heading_deg": -9.5,
  "camera_ids": ["cam1", "cam2"],       // cameras observing this person at this tick
  "local_track_ids": ["cam1:191", "cam2:150"],
  "identity_confidence": 0.93,
  "state": "active | temporarily_occluded | exited | ambiguous",
  "display_state": "Confirmed | Tracking | Needs confirmation | null",
  "evidence": {"supported_by": ["geometry","timing","motion","appearance"], "cameras_now": 2,
               "link": {"type": "cross_camera|reacquired", "tracklets", "confidence", "floor_distance_m",
                        "overlap_s", "appearance_similarity", "gap_s", "distance_m"},
               "ambiguous_with": [57]},
  "last_observed_t": 455.0
}]}
```

Display states: `Confirmed` = confidence ≥ 0.75 and nothing ambiguous; `Tracking` = followed but young or
weakly linked; `Needs confirmation` = a competing explanation within the decision margin (never merged).

## 4. Camera observations: `GET /camera-observations?cameraId=&timestamp=`

```jsonc
{"camera_id": "cam2", "t": 455.0, "t_local": 455.105, "observations": [{
  "local_track_id": 150, "tracklet": "cam2:150", "bbox": [..], "det_conf": 0.81,
  "floor_point_px": [u,v], "floor_method": "ankles", "world": [x,y] | null,
  "global_person_id": "g042" | null,     // null: not part of any identity (too short / unresolved)
  "label": "Person 42", "display_state": "Confirmed", "quality_flags": [], "keypoints?": [...]}]}
```

## 5. Events (audit): `out/<run>/events.json`, in `GET /playback/timeline`

`identity_created`, `cross_camera_link` (with evidence), `reacquired`, `ambiguous_reacquisition`
(with candidates), `identities_merged` (an earlier identity absorbed by a later decision),
`identity_split`, `link_revoked`, `link_blocked` (constraint stopped a merge, with reason). Each has
`t` (decision time on the shared timeline).

## 6. HTTP API (`api.py`)

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/world-map/config` | floor map, cameras (pose, FOV, coverage, homography, landmarks), calibration quality, sync |
| GET | `/playback/timeline` | time range, camera offsets + video URLs, demo segments, identity events |
| GET | `/world-state?timestamp=` | §3, nearest tick |
| GET | `/world-state/range?from=&to=&step=` | `{"tick_s", "frames": [§3...]}` |
| GET | `/camera-observations?cameraId=&timestamp=&keypoints=` | §4 |
| GET | `/camera-observations/range?cameraId=&from=&to=` | `{"rows": [§4...]}` |
| GET | `/identities/{global_person_id}` | events of one identity |
| GET | `/metrics` | processing stats, evaluation results, calibration quality, sync |
| GET | `/calibration` | §2 |
| POST | `/calibration` | fit + grade operator landmarks (below) |
| POST | `/demo/process` | `{"stages": "associate"|"full", "offset_s"?}` → job ID; `GET /demo/process/{id}` |
| GET | `/media/plates/{cam}.jpg`, `/media/video/{cam}.mp4` | backdrop plates, source videos |

`POST /calibration` request (also the state shape of the pilot-setup UI):

```jsonc
{"camera_id": "cam1", "image_size": [1280, 720],
 "landmarks": [{"landmark_id": "L1", "pixel": [350, 284]}, ...],          // >= 4, ideally 6-8
 "floor_landmarks": [{"id": "L1", "name": "Door threshold", "world": [x, y]}, ...],
 "dry_run": true}
```

Response: `homography_image_to_world`, `reprojection_error` (`rmse_m`, `max_m`, `rmse_px`,
`loo_rmse_m` leave-one-out, `image_spread`, `per_landmark_m`), `quality` + `quality_reasons`, `outliers`,
`saved_as` (a new versioned file when `dry_run` is false; the active calibration is never silently replaced).

## 7. Static export (`export.py` → `public/world-demo/`)

Same payloads as files: `config.json`, `timeline.json` (segments with clip URLs; clip time 0 = segment
start on the shared timeline), `segments/<id>/world.json`, `segments/<id>/<cam>.json`,
`segments/<id>/<cam>.mp4`, `metrics.json`, `plates/<cam>.jpg`.

## 8. Ground truth: `data/ground_truth/*.json` (`spottr.ground_truth/1`)

`segment`, `method`, `persons: [{gt_id, description, certainty: certain|probable, tracks: [{camera_id,
local_track_id}]}]`, `scenarios`. Tracks refer to raw local track IDs, so ground truth survives any
change to the derived layers.
