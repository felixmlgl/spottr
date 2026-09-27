/**
 * Spottr Core Schema Contracts
 * All modules (video, tracking, rep counting, summary, UI) communicate strictly through these interfaces.
 */

export type PersonTrack = {
  person_id: string;
  bbox_timeline: {
    t: number; // timestamp in seconds
    x: number; // normalized coordinate 0..1 (top-left x)
    y: number; // normalized coordinate 0..1 (top-left y)
    w: number; // normalized width 0..1
    h: number; // normalized height 0..1
  }[];
};

export type ExerciseSession = {
  person_id: string;
  exercise_id: string;
  exercise_name: string;
  start_time: number; // timestamp in seconds
  end_time: number;   // timestamp in seconds
  rep_count: number;
  rep_timestamps: number[]; // timestamps in seconds for each completed rep
};

export type WorkoutSummary = {
  person_id: string;
  total_duration_s: number;
  sessions: ExerciseSession[];
  total_reps: number;
  muscle_load?: Partial<Record<MuscleId, number>>;
};

// === Biomechanical Keypoints & Pose Schema ===

export interface Keypoint2D {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  score?: number; // confidence 0..1
  name?: string;
}

export type PoseLandmarkName =
  | 'nose'
  | 'left_eye'
  | 'right_eye'
  | 'left_ear'
  | 'right_ear'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_wrist'
  | 'right_wrist'
  | 'left_hip'
  | 'right_hip'
  | 'left_knee'
  | 'right_knee'
  | 'left_ankle'
  | 'right_ankle';

export type PoseSkeleton = {
  [K in PoseLandmarkName]?: Keypoint2D;
};

export interface DetectionSnapshot {
  person_id: string;
  bbox: { x: number; y: number; w: number; h: number };
  confidence: number;
  exercise_name: string;
  exercise_id: string;
  current_reps: number;
  current_phase: 'concentric' | 'eccentric' | 'inflection' | 'lockout' | 'idle';
  primary_angle: {
    joint: string;
    angle: number; // in degrees
    min: number;
    max: number;
  };
  skeleton?: PoseSkeleton;
  in_frame?: boolean;
}

export interface PersonInfo {
  person_id: string;
  display_label: string; // e.g. "Person 1"
  anonymous_tag: string; // e.g. "MEMBER #P-8421"
  zone: string;          // e.g. "Squat Rack 1"
  current_exercise: string;
  accent_color: string;
  thumbnail?: string | null;
  total_reps?: number;
}

export interface ScenarioMetadata {
  id: string;
  title: string;
  camera_tag: string; // e.g. "CAM 01 - SQUAT RACK"
  location: string;   // e.g. "Powerlifting Area"
  video_url: string;  // path to mp4 or simulated
  duration_s: number;
  persons: PersonInfo[];
  description: string;
}

// === Member Experience Extended Schemas ===

export interface PastWorkoutExercise {
  name: string;
  exercise_id: string;
  sets: number;
  reps_per_set: number[];
  total_reps: number;
}

export interface PastWorkout {
  id: string;
  date: string; // e.g. "2026-09-27"
  display_date: string; // e.g. "Today, 10:45 AM"
  week_group: string; // e.g. "This week", "Last week", "2 weeks ago"
  duration_minutes: number;
  total_reps: number;
  exercises: PastWorkoutExercise[];
  recap: string;
  suggestion: string;
  timeline_points?: { t: number; exercise: string; reps: number }[];
  muscle_load?: Partial<Record<MuscleId, number>>;
}

export interface GymOccupancyData {
  current_percent: number;
  status_label: string; // e.g. "Moderate occupancy"
  hourly_traffic: { hour: string; percent: number; is_now?: boolean }[];
  zones: {
    id: string;
    name: string;
    status: 'available' | 'moderate' | 'full';
    status_text: string;
    free_units: number;
    total_units: number;
  }[];
}

export interface PersonalBest {
  exercise: string;
  value: string;
  date: string;
  note: string;
}

// === Plan, Muscle Map & Recovery Schemas ===

export type MuscleId =
  | 'chest'
  | 'front_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'traps'
  | 'lats'
  | 'lower_back'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves';

export interface MuscleLoad {
  muscle_id: MuscleId;
  name: string;
  intensity: number; // 0 to 1
  is_primary: boolean;
}

export interface RecoveryStatus {
  muscle_id: MuscleId;
  name: string;
  recovery_percent: number; // 0 to 100
  status: 'ready' | 'recovering' | 'fatigued';
  hours_remaining: number;
  last_trained_hours_ago: number;
}

export interface PlannedExercise {
  id: string;
  name: string;
  exercise_id: string;
  target_sets: number;
  target_reps: number;
}

export interface PlannedWorkout {
  id: string;
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  day_label: string; // e.g. "Monday"
  is_rest: boolean;
  title: string; // e.g. "Push", "Pull", "Rest"
  exercises: PlannedExercise[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  days: Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', PlannedWorkout>;
}


