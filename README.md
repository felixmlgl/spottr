# Spottr ⚡️
> **Your gym's cameras count for you.**
> Turn existing gym security cameras into an automatic workout tracker.
> Edge-processed computer vision (Raspberry Pi 5) for zero-wearable member workout tracking.

---

## 🏗️ Folder Structure & Teammate Ownership

This codebase is modularly decoupled via strict schema contracts (`src/types/schema.ts`). Teammates can develop in parallel without merge conflicts:

| Teammate / Module | Owned Files & Directories | Responsibilities |
| :--- | :--- | :--- |
| **Tracking Engineer** | `src/services/tracking.ts` | • Implement `MediaPipeTrackingProvider` using `@mediapipe/tasks-vision` PoseLandmarker in browser.<br>• Person re-identification & bounding box interpolation.<br>• Flip `USE_MOCK_DATA = false` when ready. |
| **Rep Counting Engineer** | `src/services/repCounter.ts` | • Implement biomechanical joint-angle calculations (e.g. elbow angle for curls, knee angle for squats).<br>• Two-threshold hysteresis state machine (flexed vs extended) to debounce rep counts.<br>• Calibrate inflection angles for bench press and squats. |
| **Dashboard / UI Engineer** | `src/components/`, `src/App.tsx`, `src/services/summary.ts` | • Scenario picker & person selection cards.<br>• Projector-ready big HUD rep counter badge.<br>• Post-session summary, cadence chart, and Gemini AI Coach recap (`/api/recap`). |
| **Demo Assets & Edge Lead** | `public/demo-assets/`, `src/mocks/scenarios.ts` | • Record & drop demo mp4 video clips into `/public/demo-assets/` (`scenario-1.mp4`, etc.).<br>• Create annotated mock timeline JSONs with synchronized rep inflection points.<br>• Raspberry Pi 5 RTSP edge pipeline documentation. |

---

## 📁 Directory Architecture

```
/
├── public/
│   └── demo-assets/          # Demo MP4 video clips (scenario-1.mp4, scenario-2.mp4, etc.)
├── src/
│   ├── config.ts             # Master flag: USE_MOCK_DATA = true / false
│   ├── types/
│   │   └── schema.ts         # Shared contract: PersonTrack, ExerciseSession, WorkoutSummary
│   ├── mocks/
│   │   └── scenarios.ts      # Pre-recorded scenarios, 17-keypoint skeletons & rep timelines
│   ├── services/
│   │   ├── videoSource.ts    # Procedural CCTV gym canvas renderer & video loader
│   │   ├── tracking.ts       # TrackingProvider (Mock + MediaPipe PoseLandmarker stub)
│   │   ├── repCounter.ts     # Biomechanical angle math & hysteresis rep counter
│   │   └── summary.ts        # Exercise session aggregator & Gemini workout recap
│   ├── components/
│   │   ├── ScenarioPicker.tsx   # Switch gym camera zones & upload custom video
│   │   ├── PersonPicker.tsx     # Select detected member (#P-8421, etc.)
│   │   ├── VideoOverlay.tsx     # CCTV HUD, bounding boxes, pose skeleton, video player
│   │   ├── RepCounterBadge.tsx  # Giant projector-ready numbers & phase indicators
│   │   ├── WorkoutSummary.tsx   # End-of-session report, timeline spikes, comparison
│   │   └── HowItWorks.tsx       # System architecture: Camera -> RPi 5 -> Spottr
│   ├── App.tsx               # Main layout & state orchestrator
│   └── main.tsx              # React entrypoint
└── vite.config.ts            # Server-side Gemini 3.8 Flash API plugin (/api/recap)
```

---

## 🚀 Quickstart & Mock vs Real Mode

1. **Run Dev Server**:
   ```bash
   npm run dev
   ```
2. **Switching from Mock to Real**:
   In `src/config.ts`:
   ```ts
   export const CONFIG = {
     USE_MOCK_DATA: false, // Switches from mock JSON replay to live PoseLandmarker
     ...
   };
   ```
3. **Projector Mode**:
   Click the **Expand / Projector** icon in the header for ultra-large numbers optimized for gym presentations and demo screens.
