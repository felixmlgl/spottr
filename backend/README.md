# Reps: vision pipeline

Gym camera video → who is where → sets → rep counts → exercise labels → per-person session JSON for the dashboard.

```
video ─► YOLO26n-pose + BoT-SORT (track.py)         17 keypoints + track ID per person per frame
      ─► stitch broken tracks, per-person analysis   (analyze.py, numpy/scipy only)
           stationary? → coherent motion? → PCA 1-D signal → peak count → validate
      ─► Gemini Flash on 1 blurred snapshot/set (classify.py) → exercise label
      ─► session.json + overlay.json + annotated.mp4 (run.py, render.py)
```

## Run

```bash
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m vision.run path/to/clip.mp4              # -> out/clip/
.venv/bin/python -m vision.run clip.mp4 --no-gemini --no-render
.venv/bin/python tests/test_reps.py                          # synthetic rep-counter tests
```

Pose tracking is cached in `out/<clip>/tracks.json`. Re-running only redoes the analysis (<1 s), so tuning
`Params` in `vision/analyze.py` is fast. Use `--retrack` after changing the model or `--imgsz`.

Gemini: put `GEMINI_API_KEY=...` in `.env` (or env). Model defaults to `gemini-flash-latest`; override with
`GEMINI_MODEL`. Without a key, the pipeline still runs and uses a rough joint-based heuristic label.

## Output (contract with the dashboard)

`out/<clip>/session.json`
```jsonc
{
  "video": "clip.mp4", "duration_s": 73.0, "width": 640, "height": 352, "fps": 54.6,
  "people": [{
    "id": 3, "track_ids": [4, 21, 117], "first_seen_s": 0.0, "last_seen_s": 73.0,
    "thumbnail": "people/p3.jpg",                // blurred crop for "pick a person"
    "total_reps": 5, "exercises": {"squat": 5},
    "muscle_load": {"quads": 1.0, "glutes": 0.8, ...},   // 0..1, for the heat map (ids in vision/exercises.py)
    "sets": [{
      "exercise": "squat", "confidence": 0.45, "exercise_source": "heuristic" | "<gemini model>",
      "start_s": 25.2, "end_s": 41.1, "reps": 5,
      "rep_times_s": [26.95, 30.7, ...],   // when each rep completes → increment the counter here
      "rep_peak_s":  [26.25, 29.9, ...],   // bottom of squat / top of press
      "rep_rest_s", "rep_mid_s",           // used for the Gemini snapshot
      "period_s": 3.5, "periodicity": 0.74, "snapshot": "snapshots/p3_set1.jpg"
    }]
  }]
}
```

`out/<clip>/overlay.json`: skeletons at 15 fps for drawing on a `<video>` / canvas in "start simulation":
`frames[i] = {"t": seconds, "p": [[person_id, x1, y1, x2, y2, kx0, ky0, … kx16, ky16], …]}` (pixels in the
original video, `-1` = keypoint not visible, COCO-17 order, `edges` lists the bones). A negative `person_id`
(`-track_id`) is a passer-by too short-lived to count as a person; it's only there so the replay can blur them.

`out/<clip>/annotated.mp4`: debug/demo render with skeletons, live rep counters and a session panel.

## How rep counting works (and why it's exercise-agnostic)

1. **Stitch** tracks the tracker split (someone walked in front): a new ID that appears where an old one
   vanished within 3 s, with a similar size, is the same person.
2. **Stationary**: feet (box bottom) move < 0.25 body-heights/s for ≥ 4 s. Walking is ~0.7.
3. **Coherent motion**: keypoints normalised by body height, slow drift removed, then the top eigenvalue
   of a 2.5 s sliding covariance. Many joints moving together means a rep; independent jitter means noise.
4. **PCA → 1-D signal** per active window, oriented so the rep extreme is a peak. Lifters pause at rest
   (standing tall, arms extended), so the side with the narrower peaks is the rep side.
5. **Peaks** (`scipy.signal.find_peaks`, prominence ≥ 35 % of range, ≥ 0.7 s apart) = reps.
6. **Validate** each set: ≥ 3 reps, autocorrelation at the rep period ≥ 0.4 (kills fidgeting and gestures),
   some joint travels ≥ 0.10 body heights (kills whole-body jiggle), feet stay put (kills flaky occluded tracks).

The exercise label never affects the count.

## Results so far

* Example clip (640×352, busy RSF floor, ~9 people visible): **1 set found, squat ×5, matching a manual
  frame-by-frame count, rep bottoms within 0.1 s**. 4 false candidates rejected (a person standing next to a
  bench presser, a man drinking water, 2 heavily occluded tracks).
* Missed: a seated dumbbell presser hidden behind the bench. No pose model size (n/s/m, 960–1280 px)
  detects them at this resolution, so this is a footage limit.
* Synthetic suite: 16/16 (curls, presses, squats, lateral raises, 1–5 s tempo, jitter, 60 px people,
  20 % keypoint dropout, occlusion, unrack/re-rack, touch-and-go reps, walkers, fidgeting, multi-set, crowd).
* Speed: yolo26n-pose @ imgsz 960 + BoT-SORT/ReID = 21.8 fps on an M1 (MPS). Analysis < 1 s per minute of video.

## Filming (learned from the example clip)

* Resolution matters most: people in the back of a 640×352 frame are ~70 px tall. Film at **1080p**, and
  keep the lifter **≥ 1/4 of the frame height**.
* **Nothing in front of the lifter**: no bench, rack upright, or person between camera and body.
  The seated presser in the example was invisible for exactly this reason.
* High, fixed, angled 30–45° down, side-on or 45° to the lifter. Don't handhold.
* Write down true rep counts per set to show accuracy.

## Raspberry Pi

```bash
.venv/bin/yolo export model=models/yolo26n-pose.pt format=ncnn imgsz=640
.venv/bin/python -m vision.run clip.mp4 --model models/yolo26n-pose_ncnn_model --imgsz 640 --device cpu
```
Everything after `track.py` is numpy/scipy only. Measure the real Pi fps before quoting it. 5+ fps is enough for counting.

## Known limitations

* Track identity across long occlusions or multiple cameras isn't solved; a person can split into 2 IDs.
* Blurring only covers people the pose model detected (bystanders head to toe, the lifter's face). Someone
  hidden behind equipment or missed for longer than 0.5 s stays visible.
* Heuristic exercise labels are a fallback only (squat / press / curl / other); Gemini does the real labelling.
