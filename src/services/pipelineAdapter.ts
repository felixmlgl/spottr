import { BASE_URL, FALLBACK_SAMPLE_CLIP, PipelineClip } from '../config';
import sampleSession from '../mocks/pipeline/sample.session.json';
import {
  DetectionSnapshot,
  ExerciseSession,
  MuscleId,
  PersonInfo,
  PoseLandmarkName,
  PoseSkeleton,
  ScenarioMetadata,
  WorkoutSummary,
} from '../types/schema';
import { MUSCLE_NAMES } from '../data/exerciseMuscles';

export interface PipelineSet {
  exercise: string;
  confidence?: number;
  exercise_source?: string;
  start_s: number;
  end_s: number;
  reps: number;
  rep_times_s: number[];
  rep_peak_s?: number[];
}

export interface PipelinePerson {
  id: number;
  track_ids: number[];
  first_seen_s: number;
  last_seen_s: number;
  thumbnail: string | null;
  total_reps: number;
  exercises: Record<string, number>;
  muscle_load: Record<string, number>;
  sets: PipelineSet[];
}

export interface PipelineSession {
  video: string;
  duration_s: number;
  width: number;
  height: number;
  fps: number;
  people: PipelinePerson[];
}

export interface PipelineOverlayFrame {
  t: number;
  p: number[][]; // [person_id, x1, y1, x2, y2, kx0, ky0, ..., kx16, ky16]
}

export interface PipelineOverlay {
  frames: PipelineOverlayFrame[];
  edges?: [number, number][];
}

export interface LoadedPipelineData {
  session: PipelineSession;
  overlay: PipelineOverlay | null;
  scenario: ScenarioMetadata;
  videoUrl: string;
  sourceType: 'pipeline' | 'local_sample' | 'mock_fallback';
  errorNote?: string;
  hasSets: boolean;
}

/**
 * Prettifies an exercise identifier like "dip" -> "Dips", "squat" -> "Squat", "bicep_curl" -> "Bicep curl"
 */
export function prettifyExerciseName(raw: string): string {
  if (!raw) return 'Exercise';
  const clean = raw.toLowerCase().trim().replace(/[-\s]/g, '_');
  if (clean === 'dip' || clean === 'dips') return 'Dips';
  if (clean === 'squat' || clean === 'squats') return 'Squat';
  if (clean === 'bicep_curl' || clean === 'curl' || clean === 'bicep_curls') return 'Bicep curl';
  return raw
    .split(/[_\s-]+/)
    .map((word, idx) => {
      if (idx === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.toLowerCase();
    })
    .join(' ');
}

/**
 * Maps raw muscle load keys from the vision backend to our typed MuscleIds:
 * - side_delts -> front_delts (0.5) and rear_delts (0.5)
 * - upper_back -> traps and lats
 * - adductors -> quads (0.5)
 * - dip/dips -> triceps 1.0, chest 0.7, front_delts 0.5
 */
export function mapPipelineMuscleLoad(
  rawLoad?: Record<string, number>
): Partial<Record<MuscleId, number>> {
  if (!rawLoad) return {};
  const res: Partial<Record<MuscleId, number>> = {};

  const setOrMax = (mId: MuscleId, val: number) => {
    res[mId] = Math.max(res[mId] ?? 0, Math.min(1.0, val));
  };

  for (const [key, val] of Object.entries(rawLoad)) {
    const k = key.toLowerCase().replace(/[-\s]/g, '_');
    if (k === 'side_delts' || k === 'lateral_delts' || k === 'side_delt') {
      setOrMax('front_delts', val * 0.5);
      setOrMax('rear_delts', val * 0.5);
    } else if (k === 'upper_back') {
      setOrMax('traps', val);
      setOrMax('lats', val);
    } else if (k === 'adductors' || k === 'abductors' || k === 'adductor') {
      setOrMax('quads', val * 0.5);
    } else if (k === 'shoulders' || k === 'deltoids' || k === 'delts') {
      setOrMax('front_delts', val);
      setOrMax('rear_delts', val);
    } else if (k === 'back') {
      setOrMax('lats', val);
      setOrMax('lower_back', val);
      setOrMax('traps', val);
    } else if (k in MUSCLE_NAMES) {
      setOrMax(k as MuscleId, val);
    }
  }

  return res;
}

/**
 * Converts a pipeline person into standard PersonInfo
 */
export function pipelinePersonToPersonInfo(
  person: PipelinePerson,
  dataBaseUrl?: string
): PersonInfo {
  let thumbnail: string | null = null;
  if (person.thumbnail) {
    if (person.thumbnail.startsWith('http') || person.thumbnail.startsWith('data:')) {
      thumbnail = person.thumbnail;
    } else if (dataBaseUrl) {
      thumbnail = `${dataBaseUrl}/${person.thumbnail}`;
    } else {
      thumbnail = person.thumbnail;
    }
  }

  const exKeys = Object.keys(person.exercises || {});
  const currentExercise = exKeys.length > 0
    ? prettifyExerciseName(exKeys[0])
    : (person.sets && person.sets[0] ? prettifyExerciseName(person.sets[0].exercise) : 'Resting');

  const colors = ['#34C759', '#06B6D4', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#6366F1'];
  const accentColor = colors[(person.id - 1) % colors.length] || '#34C759';

  return {
    person_id: String(person.id),
    display_label: `Person ${person.id}`,
    anonymous_tag: `ID #${person.id}`,
    zone: 'Zone 1',
    current_exercise: currentExercise,
    accent_color: accentColor,
    thumbnail,
    total_reps: person.total_reps,
  };
}

/**
 * Converts a pipeline session and selected person into a WorkoutSummary
 * Always uses real rep times from session.json
 */
export function pipelinePersonToWorkoutSummary(
  person: PipelinePerson,
  session: PipelineSession
): WorkoutSummary {
  const sessions: ExerciseSession[] = (person.sets || []).map((s) => ({
    person_id: String(person.id),
    exercise_id: s.exercise.toLowerCase().replace(/[-\s]/g, '_'),
    exercise_name: prettifyExerciseName(s.exercise),
    start_time: s.start_s,
    end_time: s.end_s,
    rep_count: s.reps,
    rep_timestamps: [...(s.rep_times_s || [])],
  }));

  const muscle_load = mapPipelineMuscleLoad(person.muscle_load);

  const duration = Math.max(
    1,
    Math.round(person.last_seen_s - person.first_seen_s) || Math.round(session.duration_s)
  );

  return {
    person_id: String(person.id),
    total_duration_s: duration,
    total_reps: person.total_reps,
    sessions,
    muscle_load,
  };
}

/**
 * COCO-17 landmark order mapping for overlay array
 */
const COCO17_LANDMARKS: PoseLandmarkName[] = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
];

/**
 * Returns detection snapshots at playback time t for all people in the pipeline session.
 * Correctly marks out-of-frame lifters without showing another person's box or reps.
 */
export function getPipelineDetectionsAtTime(
  session: PipelineSession,
  overlay: PipelineOverlay | null,
  t: number
): DetectionSnapshot[] {
  const width = session.width || 1280;
  const height = session.height || 720;

  // Find nearest overlay frame within 1.5s
  let closestFrame: PipelineOverlayFrame | null = null;
  if (overlay && overlay.frames && overlay.frames.length > 0) {
    let minDiff = Infinity;
    for (const f of overlay.frames) {
      const diff = Math.abs(f.t - t);
      if (diff < minDiff) {
        minDiff = diff;
        closestFrame = f;
      }
    }
    if (minDiff > 1.5) {
      closestFrame = null;
    }
  }

  return session.people.map((person) => {
    const personIdStr = String(person.id);

    // Calculate current reps at time t strictly for this person
    let currentReps = 0;
    let activeExerciseName = 'Resting';
    let activeExerciseId = 'resting';

    for (const set of person.sets || []) {
      for (const repTime of set.rep_times_s || []) {
        if (repTime <= t) {
          currentReps++;
        }
      }
      if (t >= set.start_s && t <= set.end_s) {
        activeExerciseName = prettifyExerciseName(set.exercise);
        activeExerciseId = set.exercise.toLowerCase().replace(/[-\s]/g, '_');
      }
    }

    if (activeExerciseName === 'Resting' && (person.sets || []).length > 0) {
      const firstStart = person.sets[0].start_s;
      activeExerciseName = t < firstStart ? 'Ready' : 'Resting';
    }

    let in_frame = false;
    let bbox = { x: 0.3, y: 0.15, w: 0.4, h: 0.7 };
    let skeleton: PoseSkeleton | undefined = undefined;

    if (closestFrame && closestFrame.p) {
      const pRow = closestFrame.p.find((row) => row[0] === person.id);
      if (pRow) {
        in_frame = true;
        const x1 = pRow[1];
        const y1 = pRow[2];
        const x2 = pRow[3];
        const y2 = pRow[4];

        bbox = {
          x: Math.max(0, x1 / width),
          y: Math.max(0, y1 / height),
          w: Math.max(0.001, (x2 - x1) / width),
          h: Math.max(0.001, (y2 - y1) / height),
        };

        const sk: PoseSkeleton = {};
        for (let i = 0; i < 17; i++) {
          const kx = pRow[5 + i * 2];
          const ky = pRow[6 + i * 2];
          if (kx >= 0 && ky >= 0) {
            sk[COCO17_LANDMARKS[i]] = {
              x: kx / width,
              y: ky / height,
              score: 1.0,
              name: COCO17_LANDMARKS[i],
            };
          }
        }
        if (Object.keys(sk).length > 0) {
          skeleton = sk;
        }
      } else {
        in_frame = false;
        if (t < person.first_seen_s || t > person.last_seen_s) {
          activeExerciseName = 'Out of frame';
        } else {
          activeExerciseName = 'Out of frame';
        }
      }
    } else if (!overlay || !overlay.frames || overlay.frames.length === 0) {
      in_frame = true;
    }

    return {
      person_id: personIdStr,
      bbox,
      confidence: 0.95,
      exercise_name: in_frame ? activeExerciseName : 'Out of frame',
      exercise_id: activeExerciseId,
      current_reps: currentReps,
      current_phase: 'concentric',
      primary_angle: {
        joint: 'knee',
        angle: 90,
        min: 65,
        max: 175,
      },
      skeleton,
      in_frame,
    };
  });
}

/**
 * Loads pipeline session and overlay data for a clip
 */
export async function loadPipelineClip(clip: PipelineClip): Promise<LoadedPipelineData> {
  // 1. Local fallback data clip (sample)
  if (clip.localData) {
    const rawSession = sampleSession as unknown as PipelineSession;
    const persons = rawSession.people.map((p) => pipelinePersonToPersonInfo(p));
    const hasSets = rawSession.people.some((p) => (p.sets && p.sets.length > 0) || p.total_reps > 0);

    const scenario: ScenarioMetadata = {
      id: clip.id,
      title: clip.title,
      camera_tag: `CAM 01 - ${clip.title.toUpperCase()}`,
      location: 'Gym Main Zone',
      video_url: '',
      duration_s: rawSession.duration_s || 30,
      persons,
      description: 'Recorded session from edge vision pipeline',
    };

    return {
      session: rawSession,
      overlay: null,
      scenario,
      videoUrl: '',
      sourceType: 'local_sample',
      hasSets,
    };
  }

  // 2. Remote pipeline clip
  const videoUrl = clip.video ? `${BASE_URL}${clip.video}` : '';
  const dataBaseUrl = clip.data ? `${BASE_URL}${clip.data}` : '';

  try {
    let sessionData: PipelineSession | null = null;
    let overlayData: PipelineOverlay | null = null;

    if (dataBaseUrl) {
      // Fetch session.json
      const sessionRes = await fetch(`${dataBaseUrl}/session.json`);
      if (sessionRes.ok) {
        sessionData = await sessionRes.json();
      }

      // Fetch overlay.json (optional)
      try {
        const overlayRes = await fetch(`${dataBaseUrl}/overlay.json`);
        if (overlayRes.ok) {
          overlayData = await overlayRes.json();
        }
      } catch {
        // Overlay failure is non-fatal: continue without skeleton
      }
    }

    if (!sessionData) {
      // Session failed: automatically fall back to hidden sample session
      const rawSession = sampleSession as unknown as PipelineSession;
      const persons = rawSession.people.map((p) => pipelinePersonToPersonInfo(p));
      const hasSets = rawSession.people.some((p) => (p.sets && p.sets.length > 0) || p.total_reps > 0);

      const scenario: ScenarioMetadata = {
        id: clip.id,
        title: clip.title,
        camera_tag: `CAM 01 - ${clip.title.toUpperCase()}`,
        location: 'Gym Area',
        video_url: videoUrl,
        duration_s: rawSession.duration_s || 30,
        persons,
        description: 'Vision session data (fallback)',
      };

      return {
        session: rawSession,
        overlay: null,
        scenario,
        videoUrl,
        sourceType: 'mock_fallback',
        errorNote: 'Remote session.json unavailable; showing fallback pipeline data.',
        hasSets,
      };
    }

    const persons = sessionData.people.map((p) => pipelinePersonToPersonInfo(p, dataBaseUrl));
    const hasSets = sessionData.people.some((p) => (p.sets && p.sets.length > 0) || p.total_reps > 0);

    const scenario: ScenarioMetadata = {
      id: clip.id,
      title: clip.title,
      camera_tag: `CAM 01 - ${clip.title.toUpperCase()}`,
      location: 'Gym Zone',
      video_url: videoUrl,
      duration_s: sessionData.duration_s || 30,
      persons,
      description: 'Vision pipeline session',
    };

    return {
      session: sessionData,
      overlay: overlayData,
      scenario,
      videoUrl,
      sourceType: 'pipeline',
      hasSets,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const rawSession = sampleSession as unknown as PipelineSession;
    const persons = rawSession.people.map((p) => pipelinePersonToPersonInfo(p));
    const hasSets = rawSession.people.some((p) => (p.sets && p.sets.length > 0) || p.total_reps > 0);

    const scenario: ScenarioMetadata = {
      id: clip.id,
      title: clip.title,
      camera_tag: `CAM 01 - ${clip.title.toUpperCase()}`,
      location: 'Gym Area',
      video_url: videoUrl,
      duration_s: rawSession.duration_s || 30,
      persons,
      description: 'Vision session data (fallback)',
    };

    return {
      session: rawSession,
      overlay: null,
      scenario,
      videoUrl,
      sourceType: 'mock_fallback',
      errorNote: `Network error (${errorMsg}); using fallback pipeline data.`,
      hasSets,
    };
  }
}
