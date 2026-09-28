/**
 * Spottr Runtime Configuration
 */

export interface PipelineClip {
  id: string;
  title: string;
  localData?: boolean;
  video?: string;
  data?: string;
}

// Clips and pipeline output are served from public/
export const BASE_URL = "";

export const PIPELINE_CLIPS: PipelineClip[] = [
  { id: "squat", title: "Squat", video: "/videosCorrect/squat.mp4", data: "/demo-data/squat" },
  { id: "dip",   title: "Dips",  video: "/videosCorrect/dip.mp4",   data: "/demo-data/dip" },
  { id: "crowd", title: "Crowd", video: "/videosCorrect/crowd.mp4", data: "/demo-data/crowd" },
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
