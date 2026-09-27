/**
 * Rep Counting Service
 * Computes repetitions from keypoint pose landmark trajectories over time using
 * biomechanical joint-angle thresholds with hysteresis debounce.
 */

import { Keypoint2D, PoseSkeleton } from '../types/schema';
import { MOCK_REP_TIMESTAMPS } from '../mocks/scenarios';

export interface Point2D {
  x: number;
  y: number;
}

export type MovementPhase =
  | 'concentric'
  | 'eccentric'
  | 'inflection'
  | 'lockout'
  | 'idle';

export interface RepCounterState {
  exerciseId: string;
  repCount: number;
  repTimestamps: number[];
  currentAngle: number;
  currentPhase: MovementPhase;
  thresholds: {
    minAngle: number; // peak contraction threshold (e.g. 60° for curl)
    maxAngle: number; // full extension threshold (e.g. 150° for curl)
  };
}

export interface RepCounterProvider {
  name: string;
  countRepsAtTime(
    scenarioId: string,
    personId: string,
    t: number
  ): { repCount: number; repTimestamps: number[]; phase: MovementPhase };
  updateWithPose(
    pose: PoseSkeleton,
    timestamp: number,
    exerciseId: string
  ): RepCounterState;
}

/**
 * Calculates the interior angle in degrees between three 2D keypoints:
 * pointA (e.g. Shoulder) -> pointB (Vertex, e.g. Elbow) -> pointC (e.g. Wrist)
 */
export function calculateJointAngle(
  pointA: Point2D,
  pointB: Point2D,
  pointC: Point2D
): number {
  const radians =
    Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
    Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return Math.round(angle * 10) / 10;
}

/**
 * MockRepCounterProvider
 * Reads synchronized rep timestamps from scenario timeline datasets.
 */
export class MockRepCounterProvider implements RepCounterProvider {
  public name = 'Mock Timeline Rep Counter';

  public countRepsAtTime(
    scenarioId: string,
    personId: string,
    t: number
  ): { repCount: number; repTimestamps: number[]; phase: MovementPhase } {
    const allReps = MOCK_REP_TIMESTAMPS[scenarioId]?.[personId] || [];
    const completedReps = allReps.filter((ts) => ts <= t);
    
    // Determine movement phase relative to closest rep
    let phase: MovementPhase = 'idle';
    if (allReps.length > 0) {
      const nextRep = allReps.find((ts) => ts > t);
      if (nextRep) {
        const timeToRep = nextRep - t;
        if (timeToRep < 0.4) {
          phase = 'concentric';
        } else if (timeToRep < 1.4) {
          phase = 'inflection';
        } else {
          phase = 'eccentric';
        }
      } else {
        phase = 'lockout';
      }
    }

    return {
      repCount: completedReps.length,
      repTimestamps: completedReps,
      phase,
    };
  }

  public updateWithPose(
    pose: PoseSkeleton,
    timestamp: number,
    exerciseId: string
  ): RepCounterState {
    return {
      exerciseId,
      repCount: 0,
      repTimestamps: [],
      currentAngle: 120,
      currentPhase: 'idle',
      thresholds: { minAngle: 60, maxAngle: 155 },
    };
  }
}

/**
 * ==============================================================================
 * AngleBasedRepCounter (REAL-TIME BIOMECHANICAL ALGORITHM)
 * ==============================================================================
 * TODO: Teammate Ownership: Rep Counting Engineer
 *
 * This class implements real-time rep counting with hysteresis:
 * 1. Tracks joint angle (e.g. Elbow for Bicep Curl, Knee for Squat)
 * 2. Uses a two-threshold hysteresis state machine to eliminate noise/jitter:
 *    - STATE "EXTENDED": wait until angle drops below THRESHOLD_MIN (e.g. 60° for curl)
 *    - Transition to STATE "FLEXED" (peak contraction registered)
 *    - Wait until angle returns above THRESHOLD_MAX (e.g. 150° for curl)
 *    - Transition back to "EXTENDED" -> INCREMENT REP COUNT!
 * ==============================================================================
 */
export class AngleBasedRepCounter implements RepCounterProvider {
  public name = 'Biomechanical Joint-Angle Hysteresis Counter';

  // Internal state machine for rep tracking
  private repCount: number = 0;
  private repTimestamps: number[] = [];
  private state: 'EXTENDED' | 'FLEXING' | 'FLEXED' | 'EXTENDING' = 'EXTENDED';
  private lastAngle: number = 180;
  private lastTimestamp: number = 0;

  // Exercise biomechanical profile configurations
  private exerciseConfigs: Record<
    string,
    {
      name: string;
      joint: string;
      minAngle: number; // inflection peak threshold (flexed)
      maxAngle: number; // lockout threshold (extended)
      getJoints: (skeleton: PoseSkeleton) => [Keypoint2D, Keypoint2D, Keypoint2D] | null;
    }
  > = {
    'bicep-curl': {
      name: 'Dumbbell Bicep Curl',
      joint: 'Elbow (Shoulder-Elbow-Wrist)',
      minAngle: 65,  // Deep curl inflection
      maxAngle: 145, // Full extension
      // Working example for bicep curl: uses Right Shoulder -> Right Elbow -> Right Wrist
      getJoints: (s) => {
        const pA = s.right_shoulder || s.left_shoulder;
        const pB = s.right_elbow || s.left_elbow;
        const pC = s.right_wrist || s.left_wrist;
        if (pA && pB && pC) return [pA, pB, pC];
        return null;
      },
    },
    squat: {
      name: 'Barbell Back Squat',
      joint: 'Knee (Hip-Knee-Ankle)',
      minAngle: 85,  // Parallel / below parallel
      maxAngle: 155, // Standing lockout
      getJoints: (s) => {
        const pA = s.right_hip || s.left_hip;
        const pB = s.right_knee || s.left_knee;
        const pC = s.right_ankle || s.left_ankle;
        if (pA && pB && pC) return [pA, pB, pC];
        return null;
      },
    },
    'bench-press': {
      name: 'Barbell Bench Press',
      joint: 'Elbow (Shoulder-Elbow-Wrist)',
      minAngle: 85,  // Bar touches chest
      maxAngle: 155, // Arm extension lockout
      getJoints: (s) => {
        const pA = s.right_shoulder || s.left_shoulder;
        const pB = s.right_elbow || s.left_elbow;
        const pC = s.right_wrist || s.left_wrist;
        if (pA && pB && pC) return [pA, pB, pC];
        return null;
      },
    },
  };

  public reset(): void {
    this.repCount = 0;
    this.repTimestamps = [];
    this.state = 'EXTENDED';
    this.lastAngle = 180;
    this.lastTimestamp = 0;
  }

  public countRepsAtTime(
    scenarioId: string,
    personId: string,
    t: number
  ): { repCount: number; repTimestamps: number[]; phase: MovementPhase } {
    // Falls back to mock provider for recorded scenario scrubbers
    const mock = new MockRepCounterProvider();
    return mock.countRepsAtTime(scenarioId, personId, t);
  }

  /**
   * Main online frame-by-frame rep calculation hook.
   * Feeds raw pose landmarks and returns updated rep count and movement phase.
   */
  public updateWithPose(
    pose: PoseSkeleton,
    timestamp: number,
    exerciseId: string
  ): RepCounterState {
    const config = this.exerciseConfigs[exerciseId] || this.exerciseConfigs['bicep-curl'];
    const joints = config.getJoints(pose);

    if (!joints) {
      return {
        exerciseId,
        repCount: this.repCount,
        repTimestamps: this.repTimestamps,
        currentAngle: this.lastAngle,
        currentPhase: 'idle',
        thresholds: { minAngle: config.minAngle, maxAngle: config.maxAngle },
      };
    }

    const [pA, pB, pC] = joints;
    const angle = calculateJointAngle(pA, pB, pC);
    this.lastAngle = angle;
    this.lastTimestamp = timestamp;

    let phase: MovementPhase = 'idle';

    // -------------------------------------------------------------
    // HYSTERESIS STATE MACHINE
    // -------------------------------------------------------------
    if (this.state === 'EXTENDED') {
      if (angle < config.minAngle) {
        // Crossed into peak flexion/inflection
        this.state = 'FLEXED';
        phase = 'inflection';
      } else if (angle < config.maxAngle - 15) {
        phase = 'concentric';
      } else {
        phase = 'lockout';
      }
    } else if (this.state === 'FLEXED') {
      if (angle > config.maxAngle) {
        // Returned to full extension -> REP COMPLETE!
        this.state = 'EXTENDED';
        this.repCount += 1;
        this.repTimestamps.push(timestamp);
        phase = 'lockout';
      } else if (angle > config.minAngle + 15) {
        phase = 'eccentric';
      } else {
        phase = 'inflection';
      }
    }

    return {
      exerciseId,
      repCount: this.repCount,
      repTimestamps: this.repTimestamps,
      currentAngle: angle,
      currentPhase: phase,
      thresholds: { minAngle: config.minAngle, maxAngle: config.maxAngle },
    };
  }
}

export const mockRepCounter = new MockRepCounterProvider();
export const angleBasedRepCounter = new AngleBasedRepCounter();
