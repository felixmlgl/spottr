/**
 * Loader for the world-service export of the two-camera test room (scripts/gym_two_angles.py), shared by the demo's
 * "Two angles" option (TwoAngles.tsx) and the landing page (landing/previews.tsx).
 */

import type { CameraRange, Timeline, WorldMapConfig, WorldRange } from '../../gyms/world/types';

export const ANGLES_BASE = '/world-demo-angles/';

export interface AnglesData {
  config: WorldMapConfig;
  timeline: Timeline;
  world: WorldRange;
  cams: Record<string, CameraRange>;
}

const getJson = <T,>(path: string): Promise<T> =>
  fetch(ANGLES_BASE + path).then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(`${r.status} ${path}`))));

export async function loadAngles(): Promise<AnglesData> {
  const [config, timeline] = await Promise.all([getJson<WorldMapConfig>('config.json'), getJson<Timeline>('timeline.json')]);
  const seg = timeline.segments[0];
  const [world, ...rows] = await Promise.all([
    getJson<WorldRange>(seg.world_url),
    ...config.cameras.map((c) => getJson<CameraRange>(seg.camera_urls[c.camera_id])),
  ]);
  return {
    config: { ...config, cameras: config.cameras.map((c) => ({ ...c, plate_url: ANGLES_BASE + c.plate_url })) },
    timeline,
    world,
    cams: Object.fromEntries(rows.map((r) => [r.camera_id, r])),
  };
}
