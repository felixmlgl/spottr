# Great Hall two-camera prototype: report

Run: `out/great_hall`, calibration `data/calibration/great_hall.json`, ground truth `data/ground_truth/`.
All numbers below are reproducible with the commands in the [README](../README.md).

## 1. The footage

| | Perspective 1 (`cam1`) | Perspective 2 (`cam2`) |
| --- | --- | --- |
| File | `Perspective 1 Great Hall.mp4` | `perspective2 Great Hall.mp4` |
| Video | H.264 1280×720, 29.99 fps CFR, 15 821 frames | H.264 1280×720, 30.03 fps CFR, 15 964 frames |
| Duration | 527.6 s | 531.6 s |
| Audio | AAC 48 kHz | AAC 48 kHz |
| Timestamps | re-encoded (libx264), no capture time in metadata | same |
| Camera motion | static: < 0.4 px drift over 9 min (2 000+ background feature inliers per frame) | static: < 0.4 px |

The room is a large lounge ("Great Hall"), not a gym. The two phones stand on the balconies at opposite ends,
about 18 m apart, ~4.5–5.2 m above the floor, facing each other (−174°). There is glass glare on the left of
Perspective 1 and a ledge across its bottom-right corner.

### Answers to the five pre-implementation questions

1. **Do the fields of view overlap?** Yes, substantially. The middle of the room (long tables, the
   wingback-chair group, the main walking line) is seen by both. Each camera's near zone, under its own
   balcony, is seen only by the other camera, which makes walk-ins a natural camera-to-camera handoff.
2. **Enough fixed floor landmarks?** Per camera, yes (rug corners, door thresholds, bench feet, the tile
   grid). Shared between both views, barely: the cameras face each other across furniture, so very few
   floor features can be identified unambiguously in both, and there is no floor plan. We therefore
   bootstrapped the shared map from **people seen by both cameras**, and recommend tape markers for pilots.
3. **Is time synchronization needed?** Measured, not assumed: camera 2 runs **−0.105 s** relative to
   camera 1 (~3 frames). The audio cross-correlation is weak (two phones at opposite ends of a reverberant
   room, z = 4.6, windows inconsistent, graded *low*), but its best lag (−0.10 s) agrees with the
   trajectory method (moving people: 2 003 matches at −0.105 s vs 1 164 at the best other offset, graded
   *high*). The offset is small but applied; a manual override exists.
4. **Is a floor-plane homography sufficient for the demo?** Yes. People move on one floor, cameras are
   static, and floor agreement between cameras is 0.26 m median for people whose feet are visible. The
   limiting factor is not the homography but where the floor contact of seated people is (feet hidden
   behind tables).
5. **Is full stereo/3D worth it now?** No. With opposite-facing views 18 m apart and people 60–150 px
   tall, dense reconstruction or keypoint triangulation would add noise, not information, for identity and
   zones. The per-camera pinhole models (focal length, pitch, roll, height) are estimated and stored, so
   triangulating keypoints for barbell height or rep analysis at stations both cameras see closely is a
   natural next step. It is future work.

## 2. Calibration

No floor plan existed, so calibration was bootstrapped from the footage:

| Step | Method | Result |
| --- | --- | --- |
| Camera model | eye heights of standing people (average 1.57 m) + plumb-line vanishing point from door frames / walls / chandelier chains + focal prior | cam1: f 697 px (HFOV 85°), pitch 18.9°, 4.5 m high · cam2: f 1008 px (HFOV 65°), pitch 18.1°, 5.2 m high |
| Vanishing-point check | measured vs final model (distance from image centre) | cam1 (606, 2366) vs (603, 2401): 1.7 % · cam2 (636, 3751) vs (654, 3450): 8.9 %, i.e. the joint fit traded some of camera 2's plumb-line fit for cross-camera agreement |
| Cross-camera alignment | RANSAC over co-observed people (scored by distinct track pairs, motion-weighted), then joint least-squares refinement of both cameras | 424 refinement pairs, 1 045 inlier pairs |
| **Cross-camera floor agreement** | same person, same time, projected by each camera | **median 0.34 m, p90 0.57 m** (all postures) |
| Room outline | operator-clicked wall bases from each camera | 23.6 × 12.1 m; measured walls meet **15.7° off square** (far-field distortion) |
| **Grade** | | **fair** |

Reasons recorded in the calibration file: p90 above 0.5 m; wall skew; scale rests on an eye-height prior
(~5 %); landmark world positions are derived, not surveyed, so they do not independently test accuracy.

Operator workflow (`POST /calibration`): homography from ≥ 4 landmark pairs (RANSAC + least squares),
reprojection error in metres and pixels, leave-one-out error, image spread, outliers, grade *good / fair /
weak* with reasons. Covered by synthetic tests; on the Great Hall it is used for the per-camera landmark
records and wall lines.

## 3. Identity results against reviewed ground truth

Ground truth: every camera-local track in two 60 s segments assigned to a real person by manual review
(frame sheets with local IDs only, then crop timelines per track; first pass errors corrected, see
`revision_log`). **30–90 s was used while developing; 420–480 s was annotated after all parameters were
frozen (held out).** Single reviewer.

| Metric | 30–90 s (tuning) | **420–480 s (held out)** |
| --- | --- | --- |
| People in ground truth | 12 | 10 (+2 probable) |
| IDF1 (IDP / IDR) | 0.952 (0.92 / 0.99) | **0.949** (0.93 / 0.97) |
| ID switches | 6 | 11 |
| Cross-camera recall (co-observed person-ticks shown as one identity) | 0.76 | **0.70** |
| Missed cross-camera associations (person-ticks / events) | 171 / 7 | 65 / 6 |
| **False merges** (two people in one identity) | **0** | **0** |
| Share of person-ticks shown as *Needs confirmation* | 14 % | 21 % |
| Floor disagreement between cameras, feet visible in both (median / p90) | 0.26 / 0.47 m | 0.24 / 0.51 m |
| Floor disagreement, all postures (median / p90) | 0.34 / 0.82 m | 0.26 / 0.72 m |

There are no surveyed positions in this room, so "world-position error" is reported as the disagreement
between the two cameras' projections of the same person. If each camera's errors were independent and
equal, a single camera's error would be about 1/√2 of that.

Development history on the tuning segment (shows what mattered): IDF1 0.705 → 0.879 after re-acquiring
identities still seen by the other camera and posture-aware floor points → 0.951 after stationary
decorrelation, edge-truncation gating and the corrected ground truth. False merges went 2 → 0.

### Required test scenarios

| # | Scenario | Who (GT) | Result |
| --- | --- | --- | --- |
| 1 | One person seen by both cameras at once | A, C, E, F, G · P1–P3, P6–P8 | One marker; 70–76 % of co-observed ticks unified, the rest shown as two *Tracking*/*Needs confirmation* markers, never one wrong merge |
| 2 | Moving from one perspective to the other | F (walks to camera 2's end and leaves under it), C (enters under camera 1, seen by camera 2 first), G | F and C: one identity throughout (share 1.0, 0 switches); G: a first far-away camera-1 track became its own identity before linking (share 0.66, 1 switch) |
| 3 | Temporary occlusion | H (behind A in camera 2), A (local IDs change while seated) | A: share 1.0, 0 switches; H: share 0.76, 1 switch |
| 4 | Similar people crossing / walking together | C, E, F (54–62 s); P1–P3 walk in side by side (449–457 s) | No merges; the trio is *Needs confirmation* while shoulder to shoulder, each ends with share 1.0 |
| 5 | Exit and return | A leaves the wingback group and sits down again ~6 s later | Same identity (share 1.0). A full exit from the room and return later is not in a reviewed segment; covered by the synthetic re-acquisition test only |
| 6 | One camera loses a person, the other continues | F, C, P4 (cut off by camera 2's frame edge) | F, C: one identity; P4: 0.99 share, 2 short side identities from camera 2's truncated detections |
| 7 | Seated neighbours seen by one camera each (K, H, B, D, L) | | 0 false merges (two such merges existed before the edge/stationarity fixes) |

Synthetic tests (`tests/test_world.py`, 10/10): camera model round trip, self-calibration recovery, weak
calibration flagged, one person in two cameras → one identity, handoff, occlusion re-acquisition, seated
neighbours with different clothes not merged, teleport rejected, two identically dressed people crossing
stay distinct, edge-truncated person not linked on geometry.

## 4. Processing speed and latency (Apple M4, MPS)

| Stage | Throughput |
| --- | --- |
| Detection + pose + local tracking (yolo26s-pose @ 1280 px, every 2nd frame = 15 fps sampled) | 5.7 processed fps per camera with **both cameras running concurrently** (164 ms per frame); one camera alone benchmarked at 48 ms per frame |
| Calibration + sync bootstrap | ~20 s per site |
| Projection, tracklets, association, world state | 532 s of video in 4–7 s (70–130× realtime) |

Latency for a live deployment: detection (50–165 ms per frame) + the **3 s decision lag** that lets
identities be revised before they are published. The world state is therefore ~3.2 s behind real time;
a provisional state could be streamed earlier. Tracking is the bottleneck: two live cameras at 10 fps need
about 2× the measured throughput (smaller model or input size; yolo26n at 960 px ran 44 fps alone).

## 5. Assumptions

* People walk on one flat floor; cameras do not move (verified for this footage, checked in the bootstrap).
* Average adult eye height 1.57 m sets the metric scale (~5 % uncertainty); focal prior f ≈ 0.78 × image
  width with a wide spread; no lens distortion (phone video is distortion-corrected).
* Constant time offset between recordings (no clock drift); both are constant frame rate.
* Appearance evidence: per-camera white-balanced clothing colour from ≥ 3 crops per tracklet. Its
  similarity → evidence mapping was read off the **tuning** segment (ROC AUC 0.79 vs 0.68 for a DINOv2
  embedding); it can add to geometry, never create a link alone.
* Decision thresholds (link score 4, margin 2, 3 s lag) were set on the tuning segment; the held-out
  segment shows they transfer, but two minutes of review is a small sample.

## 6. Known failure modes

* **Seated people with hidden feet.** Their floor point is estimated from hips/knees and can be 0.5–1 m off,
  differently per camera. Linking them across cameras is slow and often stays *Needs confirmation*.
* **Groups walking shoulder to shoulder** stay ambiguous until they separate.
* **People cut off by the frame edge** have no floor point and are never linked on geometry; they may
  appear as separate identities.
* **Duplicate boxes** on one person in one camera create a short second identity.
* **Missed detections**: people under ~40 px tall at the far end, people sunk into deep chairs, people
  behind P1's glass glare are absent from the world state.
* **Far field**: the calibration skew (15.7°) means positions near the far walls are least reliable.
* **Identity numbers are not a head count**: 161 global identities were created in 9 minutes, including
  short-lived fragments of the same people.
* **Ground truth** is single-reviewer; the first pass contained four assignment errors that the crop
  review caught, so residual errors are possible.

## 7. Privacy (what the code actually does)

* Identities are anonymous labels (`Person 42`), valid inside one processed recording only. No names,
  membership data or face recognition.
* The exported demo clips and plates pixelate the heads of people the detector found (from pose
  keypoints); **people the detector missed are not pixelated**.
* Raw observations store crops of detected people for appearance matching; they stay in `out/`, which is
  not committed or deployed.
