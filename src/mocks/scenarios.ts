import {
  ExerciseSession,
  PersonInfo,
  PersonTrack,
  PoseSkeleton,
  ScenarioMetadata,
} from '../types/schema';

export interface MockScenarioData {
  metadata: ScenarioMetadata;
  tracks: PersonTrack[];
  sessions: ExerciseSession[];
  // Keypoint generator or sample frames for smooth rendering
  generateSkeletonAtTime: (
    personId: string,
    t: number
  ) => {
    skeleton: PoseSkeleton;
    exerciseName: string;
    exerciseId: string;
    jointAngle: { joint: string; angle: number; min: number; max: number };
    phase: 'concentric' | 'eccentric' | 'inflection' | 'lockout' | 'idle';
    repsCompleted: number;
  };
}

export const SCENARIOS: ScenarioMetadata[] = [
  {
    id: 'scenario-1',
    title: 'Squat Rack & Barbell Bay',
    camera_tag: 'CAM 01 - RACK A',
    location: 'Zone 1: Powerlifting Station',
    video_url: '/demo-assets/scenario-1.mp4',
    duration_s: 28,
    description:
      'Overhead angle capturing full-body compound movements. Person 1 is performing Barbell Back Squats.',
    persons: [
      {
        person_id: 'person-1',
        display_label: 'Person 1',
        anonymous_tag: '#P-8421',
        zone: 'Squat Rack 1',
        current_exercise: 'Barbell Back Squat',
        accent_color: '#10B981', // emerald
      },
      {
        person_id: 'person-2',
        display_label: 'Person 2',
        anonymous_tag: '#P-1934',
        zone: 'Platform 2 (Background)',
        current_exercise: 'Barbell Romanian Deadlift',
        accent_color: '#3B82F6', // blue
      },
    ],
  },
  {
    id: 'scenario-2',
    title: 'Dumbbell Free Weights Station',
    camera_tag: 'CAM 02 - DUMBBELLS',
    location: 'Zone 2: Hypertrophy Floor',
    video_url: '/demo-assets/scenario-2.mp4',
    duration_s: 32,
    description:
      'Front-facing angle tracking upper-body isolation. Person 1 is performing Standing Dumbbell Bicep Curls with strict elbow hinge.',
    persons: [
      {
        person_id: 'person-1',
        display_label: 'Person 1',
        anonymous_tag: '#P-3309',
        zone: 'Dumbbell Rack 4',
        current_exercise: 'Dumbbell Bicep Curl',
        accent_color: '#06B6D4', // cyan
      },
      {
        person_id: 'person-2',
        display_label: 'Person 2',
        anonymous_tag: '#P-7742',
        zone: 'Mirror Bay 2',
        current_exercise: 'Lateral Shoulder Raise',
        accent_color: '#F59E0B', // amber
      },
    ],
  },
  {
    id: 'scenario-3',
    title: 'Bench Press & Push Station',
    camera_tag: 'CAM 03 - BENCH',
    location: 'Zone 3: Upper Body Strength',
    video_url: '/demo-assets/scenario-3.mp4',
    duration_s: 26,
    description:
      'Angled side profile of horizontal pressing station. Tracking barbell path and elbow flexion.',
    persons: [
      {
        person_id: 'person-1',
        display_label: 'Person 1',
        anonymous_tag: '#P-5518',
        zone: 'Flat Bench 1',
        current_exercise: 'Barbell Bench Press',
        accent_color: '#8B5CF6', // purple
      },
      {
        person_id: 'person-2',
        display_label: 'Person 2',
        anonymous_tag: '#P-9012',
        zone: 'Spotter Platform',
        current_exercise: 'Resting / Spotting',
        accent_color: '#64748B', // slate
      },
    ],
  },
];

// Helper: Rep timestamps
export const MOCK_REP_TIMESTAMPS: Record<string, Record<string, number[]>> = {
  'scenario-1': {
    'person-1': [3.5, 6.4, 9.6, 12.8, 16.0, 19.3, 22.5, 25.8], // 8 squats
    'person-2': [5.0, 10.2, 15.6, 20.8, 25.5],               // 5 RDLs
  },
  'scenario-2': {
    'person-1': [3.2, 6.1, 9.0, 12.0, 15.1, 18.2, 21.1, 24.0, 27.2, 30.1], // 10 bicep curls
    'person-2': [4.5, 8.2, 12.1, 16.0, 19.8, 23.9, 27.5], // 7 lateral raises
  },
  'scenario-3': {
    'person-1': [3.8, 6.7, 9.8, 12.9, 16.1, 19.2, 22.4, 25.1], // 8 bench presses
    'person-2': [], // Spotter, 0 reps
  },
};

export const MOCK_SESSIONS: Record<string, ExerciseSession[]> = {
  'scenario-1': [
    {
      person_id: 'person-1',
      exercise_id: 'squat',
      exercise_name: 'Barbell Back Squat',
      start_time: 1.5,
      end_time: 27.0,
      rep_count: 8,
      rep_timestamps: [3.5, 6.4, 9.6, 12.8, 16.0, 19.3, 22.5, 25.8],
    },
    {
      person_id: 'person-2',
      exercise_id: 'rdl',
      exercise_name: 'Barbell Romanian Deadlift',
      start_time: 2.0,
      end_time: 27.0,
      rep_count: 5,
      rep_timestamps: [5.0, 10.2, 15.6, 20.8, 25.5],
    },
  ],
  'scenario-2': [
    {
      person_id: 'person-1',
      exercise_id: 'bicep-curl',
      exercise_name: 'Dumbbell Bicep Curl',
      start_time: 1.0,
      end_time: 31.0,
      rep_count: 10,
      rep_timestamps: [3.2, 6.1, 9.0, 12.0, 15.1, 18.2, 21.1, 24.0, 27.2, 30.1],
    },
    {
      person_id: 'person-2',
      exercise_id: 'lateral-raise',
      exercise_name: 'Lateral Shoulder Raise',
      start_time: 2.5,
      end_time: 29.5,
      rep_count: 7,
      rep_timestamps: [4.5, 8.2, 12.1, 16.0, 19.8, 23.9, 27.5],
    },
  ],
  'scenario-3': [
    {
      person_id: 'person-1',
      exercise_id: 'bench-press',
      exercise_name: 'Barbell Bench Press',
      start_time: 1.5,
      end_time: 25.8,
      rep_count: 8,
      rep_timestamps: [3.8, 6.7, 9.8, 12.9, 16.1, 19.2, 22.4, 25.1],
    },
    {
      person_id: 'person-2',
      exercise_id: 'spotter',
      exercise_name: 'Spotter / Active Rest',
      start_time: 0,
      end_time: 26.0,
      rep_count: 0,
      rep_timestamps: [],
    },
  ],
};

export interface MockFrameResult {
  skeleton: PoseSkeleton;
  bbox: { x: number; y: number; w: number; h: number };
  exerciseName: string;
  exerciseId: string;
  jointAngle: { joint: string; angle: number; min: number; max: number };
  phase: 'concentric' | 'eccentric' | 'inflection' | 'lockout' | 'idle';
  repsCompleted: number;
}

// Generates smooth realistic keypoints at time t for personId in scenario
export function generateMockFrameAtTime(
  scenarioId: string,
  personId: string,
  t: number
): MockFrameResult {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];
  const repTimestamps = MOCK_REP_TIMESTAMPS[scenario.id]?.[personId] || [];
  const repsCompleted = repTimestamps.filter((rt) => rt <= t).length;

  if (scenario.id === 'scenario-1') {
    // SQUAT SCENARIO
    if (personId === 'person-1') {
      // Main lifter in center
      // Squat cycle: period is ~3.2s
      const repPeriod = 3.2;
      const cycleTime = (t - 1.0) > 0 ? (t - 1.0) % repPeriod : 0;
      const progress = cycleTime / repPeriod; // 0..1
      
      // Depth calculation: sine wave from standing (progress = 0) down to parallel (progress = 0.5) and back
      // 0 -> 1 -> 0
      const squatDepth = t > 1.2 && t < 26.5 ? (1 - Math.cos(progress * Math.PI * 2)) / 2 : 0;
      
      // Knee angle goes from 165° (standing) down to 72° (deep parallel)
      const kneeAngle = Math.round(165 - squatDepth * 93);
      
      let phase: 'concentric' | 'eccentric' | 'inflection' | 'lockout' | 'idle' = 'idle';
      if (t < 1.2 || t > 26.5) phase = 'lockout';
      else if (squatDepth > 0.88) phase = 'inflection';
      else if (progress < 0.5) phase = 'eccentric'; // lowering down
      else phase = 'concentric'; // standing up

      const baseCenter = { x: 0.38, y: 0.28 };
      const hipDrop = squatDepth * 0.12;
      const kneeFlare = squatDepth * 0.04;

      const skeleton: PoseSkeleton = {
        nose: { x: baseCenter.x, y: 0.23 + hipDrop * 0.7, score: 0.96 },
        left_shoulder: { x: baseCenter.x - 0.07, y: 0.28 + hipDrop * 0.8, score: 0.98 },
        right_shoulder: { x: baseCenter.x + 0.07, y: 0.28 + hipDrop * 0.8, score: 0.98 },
        left_elbow: { x: baseCenter.x - 0.10, y: 0.34 + hipDrop * 0.8, score: 0.95 },
        right_elbow: { x: baseCenter.x + 0.10, y: 0.34 + hipDrop * 0.8, score: 0.95 },
        left_wrist: { x: baseCenter.x - 0.08, y: 0.26 + hipDrop * 0.8, score: 0.94 },
        right_wrist: { x: baseCenter.x + 0.08, y: 0.26 + hipDrop * 0.8, score: 0.94 },
        left_hip: { x: baseCenter.x - 0.05, y: 0.46 + hipDrop, score: 0.97 },
        right_hip: { x: baseCenter.x + 0.05, y: 0.46 + hipDrop, score: 0.97 },
        left_knee: { x: baseCenter.x - 0.06 - kneeFlare, y: 0.63 + hipDrop * 0.4, score: 0.98 },
        right_knee: { x: baseCenter.x + 0.06 + kneeFlare, y: 0.63 + hipDrop * 0.4, score: 0.98 },
        left_ankle: { x: baseCenter.x - 0.06, y: 0.82, score: 0.99 },
        right_ankle: { x: baseCenter.x + 0.06, y: 0.82, score: 0.99 },
      };

      const bbox = {
        x: baseCenter.x - 0.15,
        y: 0.18 + hipDrop * 0.7,
        w: 0.30,
        h: 0.68 - hipDrop * 0.7,
      };

      return {
        skeleton,
        bbox,
        exerciseName: 'Barbell Back Squat',
        exerciseId: 'squat',
        jointAngle: { joint: 'Knee Angle', angle: kneeAngle, min: 70, max: 165 },
        phase,
        repsCompleted,
      };
    } else {
      // Person 2 in background doing RDL
      const cycle = ((t + 1.0) % 5.2) / 5.2;
      const hinge = (1 - Math.cos(cycle * Math.PI * 2)) / 2;
      const hipAngle = Math.round(170 - hinge * 75);

      const baseCenter = { x: 0.76, y: 0.34 };
      const skeleton: PoseSkeleton = {
        nose: { x: baseCenter.x - hinge * 0.05, y: 0.28 + hinge * 0.10, score: 0.88 },
        left_shoulder: { x: baseCenter.x - 0.04 - hinge * 0.04, y: 0.33 + hinge * 0.11, score: 0.89 },
        right_shoulder: { x: baseCenter.x + 0.04 - hinge * 0.04, y: 0.33 + hinge * 0.11, score: 0.89 },
        left_elbow: { x: baseCenter.x - 0.05, y: 0.43 + hinge * 0.08, score: 0.85 },
        right_elbow: { x: baseCenter.x + 0.05, y: 0.43 + hinge * 0.08, score: 0.85 },
        left_wrist: { x: baseCenter.x - 0.04, y: 0.53 + hinge * 0.12, score: 0.83 },
        right_wrist: { x: baseCenter.x + 0.04, y: 0.53 + hinge * 0.12, score: 0.83 },
        left_hip: { x: baseCenter.x - 0.03 + hinge * 0.03, y: 0.48, score: 0.91 },
        right_hip: { x: baseCenter.x + 0.03 + hinge * 0.03, y: 0.48, score: 0.91 },
        left_knee: { x: baseCenter.x - 0.03, y: 0.64, score: 0.90 },
        right_knee: { x: baseCenter.x + 0.03, y: 0.64, score: 0.90 },
        left_ankle: { x: baseCenter.x - 0.03, y: 0.80, score: 0.92 },
        right_ankle: { x: baseCenter.x + 0.03, y: 0.80, score: 0.92 },
      };

      return {
        skeleton,
        bbox: { x: 0.66, y: 0.24, w: 0.22, h: 0.60 },
        exerciseName: 'Barbell Romanian Deadlift',
        exerciseId: 'rdl',
        jointAngle: { joint: 'Hip Hinge Angle', angle: hipAngle, min: 95, max: 170 },
        phase: hinge > 0.85 ? 'inflection' : hinge > 0.1 ? 'eccentric' : 'lockout',
        repsCompleted,
      };
    }
  } else if (scenario.id === 'scenario-2') {
    // BICEP CURL SCENARIO
    if (personId === 'person-1') {
      const repPeriod = 3.0;
      const cycleTime = (t - 0.8) > 0 ? (t - 0.8) % repPeriod : 0;
      const progress = cycleTime / repPeriod;
      const curlProgress = t > 1.0 && t < 31.0 ? (1 - Math.cos(progress * Math.PI * 2)) / 2 : 0;
      
      // Elbow angle: from 155° down to 55° (flexion)
      const elbowAngle = Math.round(155 - curlProgress * 100);

      let phase: 'concentric' | 'eccentric' | 'inflection' | 'lockout' | 'idle' = 'idle';
      if (t < 1.0 || t > 31.0) phase = 'lockout';
      else if (curlProgress > 0.9) phase = 'inflection';
      else if (progress < 0.5) phase = 'concentric'; // curling up
      else phase = 'eccentric'; // lowering down

      const baseCenter = { x: 0.42, y: 0.30 };
      const wristLift = curlProgress * 0.17;

      const skeleton: PoseSkeleton = {
        nose: { x: baseCenter.x, y: 0.20, score: 0.97 },
        left_shoulder: { x: baseCenter.x - 0.08, y: 0.27, score: 0.99 },
        right_shoulder: { x: baseCenter.x + 0.08, y: 0.27, score: 0.99 },
        left_elbow: { x: baseCenter.x - 0.09, y: 0.41, score: 0.98 },
        right_elbow: { x: baseCenter.x + 0.09, y: 0.41, score: 0.98 },
        left_wrist: { x: baseCenter.x - 0.09, y: 0.54 - wristLift, score: 0.96 },
        right_wrist: { x: baseCenter.x + 0.09, y: 0.54 - wristLift, score: 0.96 },
        left_hip: { x: baseCenter.x - 0.05, y: 0.51, score: 0.96 },
        right_hip: { x: baseCenter.x + 0.05, y: 0.51, score: 0.96 },
        left_knee: { x: baseCenter.x - 0.05, y: 0.68, score: 0.95 },
        right_knee: { x: baseCenter.x + 0.05, y: 0.68, score: 0.95 },
        left_ankle: { x: baseCenter.x - 0.05, y: 0.85, score: 0.95 },
        right_ankle: { x: baseCenter.x + 0.05, y: 0.85, score: 0.95 },
      };

      return {
        skeleton,
        bbox: { x: baseCenter.x - 0.16, y: 0.15, w: 0.32, h: 0.74 },
        exerciseName: 'Dumbbell Bicep Curl',
        exerciseId: 'bicep-curl',
        jointAngle: { joint: 'Elbow Flexion Angle', angle: elbowAngle, min: 55, max: 155 },
        phase,
        repsCompleted,
      };
    } else {
      // Lateral Raise
      const cycle = ((t + 0.5) % 3.8) / 3.8;
      const raise = (1 - Math.cos(cycle * Math.PI * 2)) / 2;
      const shoulderAngle = Math.round(20 + raise * 70);

      const baseCenter = { x: 0.80, y: 0.32 };
      const skeleton: PoseSkeleton = {
        nose: { x: baseCenter.x, y: 0.22, score: 0.90 },
        left_shoulder: { x: baseCenter.x - 0.07, y: 0.28, score: 0.92 },
        right_shoulder: { x: baseCenter.x + 0.07, y: 0.28, score: 0.92 },
        left_elbow: { x: baseCenter.x - 0.08 - raise * 0.08, y: 0.42 - raise * 0.12, score: 0.90 },
        right_elbow: { x: baseCenter.x + 0.08 + raise * 0.08, y: 0.42 - raise * 0.12, score: 0.90 },
        left_wrist: { x: baseCenter.x - 0.09 - raise * 0.10, y: 0.55 - raise * 0.24, score: 0.88 },
        right_wrist: { x: baseCenter.x + 0.09 + raise * 0.10, y: 0.55 - raise * 0.24, score: 0.88 },
        left_hip: { x: baseCenter.x - 0.04, y: 0.52, score: 0.91 },
        right_hip: { x: baseCenter.x + 0.04, y: 0.52, score: 0.91 },
        left_knee: { x: baseCenter.x - 0.04, y: 0.69, score: 0.89 },
        right_knee: { x: baseCenter.x + 0.04, y: 0.69, score: 0.89 },
        left_ankle: { x: baseCenter.x - 0.04, y: 0.86, score: 0.91 },
        right_ankle: { x: baseCenter.x + 0.04, y: 0.86, score: 0.91 },
      };

      return {
        skeleton,
        bbox: { x: 0.65, y: 0.17, w: 0.30, h: 0.72 },
        exerciseName: 'Lateral Shoulder Raise',
        exerciseId: 'lateral-raise',
        jointAngle: { joint: 'Shoulder Abduction Angle', angle: shoulderAngle, min: 20, max: 90 },
        phase: raise > 0.85 ? 'inflection' : raise > 0.1 ? 'concentric' : 'lockout',
        repsCompleted,
      };
    }
  } else {
    // SCENARIO 3: BENCH PRESS
    if (personId === 'person-1') {
      const repPeriod = 3.1;
      const cycleTime = (t - 1.2) > 0 ? (t - 1.2) % repPeriod : 0;
      const progress = cycleTime / repPeriod;
      const pressProgress = t > 1.5 && t < 25.5 ? (1 - Math.cos(progress * Math.PI * 2)) / 2 : 0;
      
      // Elbow angle: 80° at chest up to 165° at lockout
      // In bench press: lower bar (eccentric) -> elbow 80° -> press up (concentric) -> elbow 165°
      const elbowAngle = Math.round(165 - pressProgress * 85);

      let phase: 'concentric' | 'eccentric' | 'inflection' | 'lockout' | 'idle' = 'idle';
      if (t < 1.5 || t > 25.5) phase = 'lockout';
      else if (pressProgress > 0.88) phase = 'inflection';
      else if (progress < 0.5) phase = 'eccentric'; // lowering bar
      else phase = 'concentric'; // pressing bar

      const barDrop = pressProgress * 0.12;
      const baseCenter = { x: 0.44, y: 0.55 };

      const skeleton: PoseSkeleton = {
        nose: { x: baseCenter.x - 0.16, y: baseCenter.y - 0.04, score: 0.92 },
        left_shoulder: { x: baseCenter.x - 0.10, y: baseCenter.y, score: 0.98 },
        right_shoulder: { x: baseCenter.x - 0.10, y: baseCenter.y + 0.06, score: 0.96 },
        left_elbow: { x: baseCenter.x - 0.07, y: baseCenter.y + 0.08 + barDrop * 0.6, score: 0.97 },
        right_elbow: { x: baseCenter.x - 0.07, y: baseCenter.y + 0.14 + barDrop * 0.6, score: 0.95 },
        left_wrist: { x: baseCenter.x - 0.08, y: baseCenter.y - 0.14 + barDrop, score: 0.98 },
        right_wrist: { x: baseCenter.x - 0.08, y: baseCenter.y - 0.08 + barDrop, score: 0.98 },
        left_hip: { x: baseCenter.x + 0.08, y: baseCenter.y + 0.02, score: 0.96 },
        right_hip: { x: baseCenter.x + 0.08, y: baseCenter.y + 0.08, score: 0.96 },
        left_knee: { x: baseCenter.x + 0.20, y: baseCenter.y + 0.07, score: 0.94 },
        right_knee: { x: baseCenter.x + 0.20, y: baseCenter.y + 0.14, score: 0.94 },
        left_ankle: { x: baseCenter.x + 0.25, y: baseCenter.y + 0.24, score: 0.95 },
        right_ankle: { x: baseCenter.x + 0.25, y: baseCenter.y + 0.28, score: 0.95 },
      };

      return {
        skeleton,
        bbox: { x: baseCenter.x - 0.24, y: baseCenter.y - 0.22, w: 0.54, h: 0.52 },
        exerciseName: 'Barbell Bench Press',
        exerciseId: 'bench-press',
        jointAngle: { joint: 'Elbow Press Angle', angle: elbowAngle, min: 80, max: 165 },
        phase,
        repsCompleted,
      };
    } else {
      // Spotter standing behind bench
      const baseCenter = { x: 0.24, y: 0.35 };
      const skeleton: PoseSkeleton = {
        nose: { x: baseCenter.x, y: 0.24, score: 0.91 },
        left_shoulder: { x: baseCenter.x - 0.06, y: 0.29, score: 0.94 },
        right_shoulder: { x: baseCenter.x + 0.06, y: 0.29, score: 0.94 },
        left_elbow: { x: baseCenter.x - 0.08, y: 0.40, score: 0.92 },
        right_elbow: { x: baseCenter.x + 0.08, y: 0.40, score: 0.92 },
        left_wrist: { x: baseCenter.x - 0.05, y: 0.48, score: 0.90 },
        right_wrist: { x: baseCenter.x + 0.05, y: 0.48, score: 0.90 },
        left_hip: { x: baseCenter.x - 0.04, y: 0.52, score: 0.94 },
        right_hip: { x: baseCenter.x + 0.04, y: 0.52, score: 0.94 },
        left_knee: { x: baseCenter.x - 0.04, y: 0.69, score: 0.93 },
        right_knee: { x: baseCenter.x + 0.04, y: 0.69, score: 0.93 },
        left_ankle: { x: baseCenter.x - 0.04, y: 0.85, score: 0.94 },
        right_ankle: { x: baseCenter.x + 0.04, y: 0.85, score: 0.94 },
      };

      return {
        skeleton,
        bbox: { x: 0.16, y: 0.18, w: 0.18, h: 0.70 },
        exerciseName: 'Spotter / Active Rest',
        exerciseId: 'spotter',
        jointAngle: { joint: 'Torso Angle', angle: 175, min: 160, max: 180 },
        phase: 'idle' as const,
        repsCompleted: 0,
      };
    }
  }
}
