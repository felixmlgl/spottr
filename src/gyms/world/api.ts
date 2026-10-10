/**
 * Data source for the world map: the shared-world service (world-service/) when VITE_WORLD_API_URL is set,
 * otherwise the static export of the same API in public/world-demo/ (Vercel has no Python runtime).
 * Both return identical payloads (world-service/spottr_world/views.py builds both).
 */

import type {
  CalibrationRequest,
  CalibrationResult,
  CameraRange,
  MetricsPayload,
  Segment,
  Timeline,
  WorldMapConfig,
  WorldRange,
} from './types';

const LIVE = (import.meta.env.VITE_WORLD_API_URL as string | undefined)?.replace(/\/+$/, '') || null;
const STATIC_BASE = '/world-demo/';

export const isLive = LIVE !== null;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
}

const cache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    const p = load();
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key) as Promise<T>;
}

/** Resolve a media/data path from a payload against the right origin. */
export function mediaUrl(path: string): string {
  if (/^https?:/.test(path)) return path;
  if (LIVE) return `${LIVE}${path.startsWith('/') ? '' : '/media/'}${path}`;
  return `${STATIC_BASE}${path}`;
}

export function getWorldMapConfig(): Promise<WorldMapConfig> {
  return cached('config', () => getJson<WorldMapConfig>(LIVE ? `${LIVE}/world-map/config` : `${STATIC_BASE}config.json`));
}

export function getTimeline(): Promise<Timeline> {
  return cached('timeline', () => getJson<Timeline>(LIVE ? `${LIVE}/playback/timeline` : `${STATIC_BASE}timeline.json`));
}

export function getMetrics(): Promise<MetricsPayload> {
  return cached('metrics', () => getJson<MetricsPayload>(LIVE ? `${LIVE}/metrics` : `${STATIC_BASE}metrics.json`));
}

/** Demo segments: listed by the static export; a live service gets the same windows by default. */
export const DEFAULT_SEGMENTS: Pick<Segment, 'id' | 'title' | 'summary' | 'from_s' | 'to_s'>[] = [
  { id: 'arrivals', title: 'Arrivals', from_s: 440, to_s: 500, summary: 'A group walks in under one camera and crosses the room in view of both.' },
  { id: 'settling', title: 'Settling in', from_s: 30, to_s: 90, summary: 'People walk in, sit down and get up again.' },
];

export function getSegmentWorld(seg: Segment): Promise<WorldRange> {
  return cached(`world:${seg.id}`, () =>
    getJson<WorldRange>(
      LIVE ? `${LIVE}/world-state/range?from=${seg.from_s}&to=${seg.to_s}` : `${STATIC_BASE}${seg.world_url}`,
    ),
  );
}

export function getSegmentCamera(seg: Segment, cameraId: string): Promise<CameraRange> {
  return cached(`cam:${seg.id}:${cameraId}`, () =>
    getJson<CameraRange>(
      LIVE
        ? `${LIVE}/camera-observations/range?cameraId=${encodeURIComponent(cameraId)}&from=${seg.from_s}&to=${seg.to_s}`
        : `${STATIC_BASE}${seg.camera_urls[cameraId]}`,
    ),
  );
}

/** Video for a camera in a segment, and the shared time at which that video starts. */
export function segmentVideo(seg: Segment, timeline: Timeline, cameraId: string): { url: string; startsAt: number } | null {
  if (seg.clip_urls?.[cameraId]) return { url: mediaUrl(seg.clip_urls[cameraId]), startsAt: seg.clip_start_s };
  const cam = timeline.cameras.find((c) => c.camera_id === cameraId);
  if (cam?.video_url && cam.video_start_s !== null) return { url: mediaUrl(cam.video_url), startsAt: cam.video_start_s };
  return null;
}

/** Live segments: the service serves full videos, so a segment is just a time window. */
export function liveSegments(timeline: Timeline): Segment[] {
  return DEFAULT_SEGMENTS.map((s) => ({
    ...s,
    world_url: '',
    camera_urls: {},
    clip_urls: {},
    clip_start_s: s.from_s,
  })).filter((s) => s.from_s >= timeline.t_start && s.to_s <= timeline.t_end + 1);
}

/** Operator calibration: the service fits and grades the homography. Not available in the static demo. */
export async function postCalibration(body: CalibrationRequest): Promise<CalibrationResult> {
  if (!LIVE) throw new Error('offline');
  const res = await fetch(`${LIVE}/calibration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.detail ?? `${res.status}`);
  return (await res.json()) as CalibrationResult;
}
