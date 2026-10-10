/**
 * Shared-world API schema (spottr.world/1), produced by world-service/ (see world-service/docs/SCHEMA.md).
 * The frontend only renders these payloads. It never decides who is who.
 */

export type Vec2 = [number, number];

export type DisplayState = 'Confirmed' | 'Tracking' | 'Needs confirmation';
export type LifecycleState = 'active' | 'temporarily_occluded' | 'exited' | 'ambiguous';

export interface FloorLandmark {
  id: string;
  name: string;
  camera_id: string;
  world: Vec2;
  world_source: string;
}

export interface CameraConfig {
  camera_id: string;
  label: string;
  position: Vec2;
  heading_deg: number;
  fov_deg: number;
  coverage_polygon: Vec2[];
  image_size: [number, number];
  plate_url: string;
  landmarks_px: { landmark_id: string; pixel: Vec2 }[];
  homography_image_to_world: number[][];
  calibration_quality: 'good' | 'fair' | 'weak' | null;
  camera_model: { fx: number; pitch_deg: number; roll_deg: number; height_m: number };
}

export interface WorldMapConfig {
  api_version: string;
  site: { name: string; label: string; anonymised: boolean };
  units: 'm';
  floor_map: {
    width_m: number;
    height_m: number;
    outline: Vec2[] | null;
    outline_measured?: Vec2[] | null;
    walls: Record<string, Vec2[]>;
    landmarks: FloorLandmark[];
    scale_note?: string;
  };
  cameras: CameraConfig[];
  calibration: {
    calibration_id: string;
    method: string;
    quality: {
      grade?: 'good' | 'fair' | 'weak';
      reasons?: string[];
      cross_camera_floor_agreement_m?: { median: number; p90: number; pairs: number };
      wall_rectangularity_deviation_deg?: number;
    };
  };
  sync: { reference_camera: string; offsets_s: Record<string, number>; method: string; confidence: string };
  tick_s: number;
  decision_lag_s: number;
  display_states: DisplayState[];
}

export interface Segment {
  id: string;
  title: string;
  summary: string;
  from_s: number;
  to_s: number;
  world_url: string;
  camera_urls: Record<string, string>;
  clip_urls: Record<string, string>;
  clip_start_s: number;
}

export interface TimelineEvent {
  t: number;
  type: string;
  label?: string;
  gid?: number;
  link?: string[];
  tracklet?: string;
  confidence?: number;
  reason?: string;
}

export interface Timeline {
  api_version: string;
  t_start: number;
  t_end: number;
  tick_s: number;
  cameras: { camera_id: string; label: string; offset_s: number; video_url: string | null; video_start_s: number | null }[];
  segments: Segment[];
  events: TimelineEvent[];
}

export interface Evidence {
  supported_by: ('geometry' | 'timing' | 'motion' | 'appearance')[];
  cameras_now: number;
  link?: {
    type: 'cross_camera' | 'reacquired';
    tracklets: string[];
    confidence: number;
    floor_distance_m?: number;
    overlap_s?: number;
    appearance_similarity?: number;
    gap_s?: number;
    distance_m?: number;
  };
  ambiguous_with?: number[];
}

export interface WorldPerson {
  global_person_id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed_mps: number;
  heading_deg: number | null;
  camera_ids: string[];
  local_track_ids: string[];
  identity_confidence: number;
  state: LifecycleState;
  display_state: DisplayState | null;
  evidence: Evidence;
  last_observed_t: number;
}

export interface WorldFrame {
  t: number;
  people: WorldPerson[];
}

export interface WorldRange {
  api_version: string;
  tick_s: number;
  frames: WorldFrame[];
}

export interface CameraObservation {
  local_track_id: number;
  tracklet: string | null;
  bbox: [number, number, number, number];
  det_conf: number;
  floor_point_px: Vec2;
  floor_method: string;
  world: Vec2 | null;
  global_person_id: string | null;
  label: string | null;
  display_state: DisplayState | null;
  quality_flags: string[];
}

export interface CameraRow {
  t: number;
  t_local: number;
  observations: CameraObservation[];
}

export interface CameraRange {
  api_version: string;
  camera_id: string;
  rows: CameraRow[];
}

export interface EvaluationResult {
  segment_s: [number, number];
  IDF1: number;
  IDP: number;
  IDR: number;
  id_switches: number;
  gt_people: number;
  cross_camera: { co_observed_person_ticks: number; unified_person_ticks: number; recall: number };
  missed_associations: { person_ticks: number; distinct_events: number };
  false_merges: { person_ticks: number; distinct_events: number };
  ambiguous_share: number;
  cross_camera_position_disagreement_m: {
    all: { n: number; median: number; p90: number } | null;
    feet_visible_in_both: { n: number; median: number; p90: number } | null;
  };
}

export interface MetricsPayload {
  api_version: string;
  processing: {
    duration_s: number;
    decision_lag_s: number;
    association_realtime_factor: number;
    global_identities: number;
    processing: Record<string, { model: string; processing_fps: number; inference_ms_per_frame: number }>;
  };
  evaluation: Record<string, { strict: EvaluationResult; with_probable: EvaluationResult }>;
  calibration_quality: WorldMapConfig['calibration']['quality'];
  sync: { offsets_s: Record<string, number>; confidence: string; method: string };
}

/** Request body of POST /calibration (operator landmark workflow). */
export interface CalibrationRequest {
  camera_id: string;
  image_size: [number, number];
  landmarks: { landmark_id: string; pixel: Vec2 }[];
  floor_landmarks: { id: string; name: string; world: Vec2 }[];
  dry_run: boolean;
}

export interface CalibrationResult {
  camera_id: string;
  homography_image_to_world: number[][];
  reprojection_error: { n: number; rmse_m: number; max_m: number; rmse_px: number; loo_rmse_m: number | null; image_spread: number };
  quality: 'good' | 'fair' | 'weak';
  quality_reasons: string[];
  outliers: string[];
  saved_as: string | null;
}
