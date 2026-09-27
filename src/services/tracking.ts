/**
 * Tracking Service
 * Defines TrackingProvider interface, MockTrackingProvider (reads JSON mock timelines),
 * and a MediaPipeTrackingProvider stub for future browser edge inference.
 */

import { CONFIG } from '../config';
import {
  generateMockFrameAtTime,
  MOCK_REP_TIMESTAMPS,
  SCENARIOS,
} from '../mocks/scenarios';
import {
  DetectionSnapshot,
  PersonInfo,
  PersonTrack,
} from '../types/schema';

export interface TrackingProvider {
  name: string;
  isMock: boolean;
  getAvailablePersons(scenarioId: string): PersonInfo[];
  getDetectionsAtTime(scenarioId: string, timestamp: number): DetectionSnapshot[];
  getPersonTrack(scenarioId: string, personId: string): PersonTrack | undefined;
  processFrame?(
    source: HTMLVideoElement | HTMLCanvasElement,
    timestamp: number
  ): Promise<DetectionSnapshot[]>;
}

/**
 * MockTrackingProvider
 * Uses pre-computed scenario timeline datasets to return realistic bounding boxes,
 * 2D pose skeletons, joint angles, and movement phases at any given timestamp.
 */
export class MockTrackingProvider implements TrackingProvider {
  public name = 'Mock Edge-TPU Tracker';
  public isMock = true;

  public getAvailablePersons(scenarioId: string): PersonInfo[] {
    const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];
    return scenario.persons;
  }

  public getDetectionsAtTime(
    scenarioId: string,
    timestamp: number
  ): DetectionSnapshot[] {
    const persons = this.getAvailablePersons(scenarioId);
    return persons.map((person) => {
      const frame = generateMockFrameAtTime(scenarioId, person.person_id, timestamp);
      return {
        person_id: person.person_id,
        bbox: frame.bbox,
        confidence: 0.94 + Math.sin(timestamp * 2) * 0.03,
        exercise_name: frame.exerciseName,
        exercise_id: frame.exerciseId,
        current_reps: frame.repsCompleted,
        current_phase: frame.phase,
        primary_angle: {
          joint: frame.jointAngle.joint,
          angle: frame.jointAngle.angle,
          min: frame.jointAngle.min,
          max: frame.jointAngle.max,
        },
        skeleton: frame.skeleton,
      };
    });
  }

  public getPersonTrack(
    scenarioId: string,
    personId: string
  ): PersonTrack | undefined {
    const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];
    const person = scenario.persons.find((p) => p.person_id === personId);
    if (!person) return undefined;

    // Build timeline sampled at 10Hz
    const bbox_timeline: PersonTrack['bbox_timeline'] = [];
    const step = 0.1;
    for (let t = 0; t <= scenario.duration_s; t += step) {
      const frame = generateMockFrameAtTime(scenarioId, personId, t);
      bbox_timeline.push({
        t: Math.round(t * 100) / 100,
        x: frame.bbox.x,
        y: frame.bbox.y,
        w: frame.bbox.w,
        h: frame.bbox.h,
      });
    }

    return {
      person_id: personId,
      bbox_timeline,
    };
  }
}

/**
 * MediaPipeTrackingProvider (STUB)
 * Teammates can fill in this implementation using @mediapipe/tasks-vision PoseLandmarker
 * to run live pose estimation directly on video frames in the browser.
 */
export class MediaPipeTrackingProvider implements TrackingProvider {
  public name = 'MediaPipe PoseLandmarker (Edge Vision)';
  public isMock = false;
  private isInitialized = false;

  // TODO: Teammate Ownership: Tracking Engineer
  // When ready to switch USE_MOCK_DATA to false:
  // 1. install @mediapipe/tasks-vision
  // 2. Initialize PoseLandmarker with WASM fileset
  // 3. Implement detectForVideo(videoElement, timestamp) and map the 33 3D landmarks
  //    to Spottr's Keypoint2D PoseSkeleton schema.
  public async init(): Promise<void> {
    console.info(
      '[MediaPipeTrackingProvider] Initializing MediaPipe Tasks Vision stub...'
    );
    // STUB: Replace with:
    // const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
    // this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    //   baseOptions: { modelAssetPath: 'pose_landmarker_lite.task' },
    //   runningMode: "VIDEO",
    //   numPoses: 3
    // });
    this.isInitialized = true;
  }

  public getAvailablePersons(scenarioId: string): PersonInfo[] {
    // MediaPipe tracks people dynamically; for now fallback to scenario registry
    const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];
    return scenario.persons;
  }

  public getDetectionsAtTime(
    scenarioId: string,
    timestamp: number
  ): DetectionSnapshot[] {
    // If running in stub mode without initialized video frame, fallback to mock provider
    const mock = new MockTrackingProvider();
    return mock.getDetectionsAtTime(scenarioId, timestamp);
  }

  public getPersonTrack(
    scenarioId: string,
    personId: string
  ): PersonTrack | undefined {
    const mock = new MockTrackingProvider();
    return mock.getPersonTrack(scenarioId, personId);
  }

  public async processFrame(
    source: HTMLVideoElement | HTMLCanvasElement,
    timestamp: number
  ): Promise<DetectionSnapshot[]> {
    if (!this.isInitialized) {
      await this.init();
    }
    // STUB: When model weights are loaded:
    // const result = this.poseLandmarker.detectForVideo(source, performance.now());
    // return transformMediaPipeLandmarksToSnapshots(result);
    const mock = new MockTrackingProvider();
    return mock.getDetectionsAtTime('scenario-1', timestamp);
  }
}

/**
 * Factory to retrieve the active tracking provider based on configuration.
 */
export function getTrackingProvider(): TrackingProvider {
  if (CONFIG.DATA_SOURCE === 'mock') {
    return new MockTrackingProvider();
  }
  return new MediaPipeTrackingProvider();
}
