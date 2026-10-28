/**
 * Spottr Runtime Configuration
 */

/** One camera of a multi-camera clip: its video and its pose overlay (path inside the clip's data folder). */
export interface ClipView {
  label: string;
  video: string;
  overlay: string;
}

export interface PipelineClip {
  id: string;
  title: string;
  localData?: boolean;
  video?: string;
  data?: string;
  /** Several cameras of one room: one session.json (same person ids everywhere), an overlay per camera */
  views?: ClipView[];
  /** What the footage is, when it isn't a plain recording from a real gym (shown in the member app) */
  note?: string;
}

// Clips and pipeline output are served from public/
export const BASE_URL = "";

const ANGLES_VIEWS: ClipView[] = [
  { label: "Camera 1", video: "/videosCorrect/angles-cam1.mp4", overlay: "cam1/overlay.json" },
  { label: "Camera 2", video: "/videosCorrect/angles-cam2.mp4", overlay: "cam2/overlay.json" },
];

export const PIPELINE_CLIPS: PipelineClip[] = [
  { id: "squat", title: "Squat", video: "/videosCorrect/squat.mp4", data: "/demo-data/squat" },
  { id: "dip",   title: "Dips",  video: "/videosCorrect/dip.mp4",   data: "/demo-data/dip" },
  // Two-camera test scene (scripts/two_angles_member.py); the gyms' world map shows the same clips
  {
    id: "angles", title: "Two angles", video: ANGLES_VIEWS[0].video, data: "/demo-data/angles", views: ANGLES_VIEWS,
    note: "Today is a generated 7-second test clip, played forward and back four times.",
  },
];

export const FALLBACK_SAMPLE_CLIP: PipelineClip = {
  id: "sample",
  title: "Squat (sample)",
  localData: true,
};

export const CONFIG = {
  DATA_SOURCE: 'pipeline' as 'mock' | 'pipeline',
  BASE_URL,
  PIPELINE_CLIPS,
  FALLBACK_SAMPLE_CLIP,

  // Display preferences
  DISPLAY: {
    SHOW_SKELETON: true,
    SHOW_BOUNDING_BOX: true,
    SHOW_ANGLE_ARC: true,
    SHOW_CCTV_HUD: true,
    SOUND_EFFECTS: true,
  },
};
