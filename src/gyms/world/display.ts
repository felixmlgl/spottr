/**
 * Presentation helpers. Everything here is cosmetic: colours, plain-language copy, and interpolation
 * between the service's 5 Hz frames so markers glide instead of jumping. Identities, positions and states
 * always come unchanged from the service.
 */

import type { CameraObservation, CameraRow, DisplayState, Evidence, WorldFrame, WorldPerson } from './types';

/** Calm, distinguishable person colours; Spottr green is kept for the brand, not for one person. */
const PERSON_COLORS = ['#007AFF', '#FF9500', '#AF52DE', '#FF2D55', '#5856D6', '#A2845E', '#FF3B30', '#E3A500', '#BF5AF2', '#1C7ED6', '#D9480F'];

export function personColor(globalId: string | null | undefined): string {
  if (!globalId) return '#AEAEB2';
  const n = parseInt(globalId.replace(/\D/g, ''), 10) || 0;
  return PERSON_COLORS[n % PERSON_COLORS.length];
}

export const STATE_STYLE: Record<DisplayState, { dot: string; text: string; bg: string; hint: string }> = {
  Confirmed: { dot: '#34C759', text: '#1D7A35', bg: '#E9F8EE', hint: 'One identity, backed by strong evidence.' },
  Tracking: { dot: '#8E8E93', text: '#3A3A3C', bg: '#F2F2F7', hint: 'Followed by the cameras; not enough history yet to call it confirmed.' },
  'Needs confirmation': {
    dot: '#FF9500',
    text: '#8A4B00',
    bg: '#FFF4E5',
    hint: 'Evidence is not strong enough to decide. Spottr keeps the options open instead of guessing.',
  },
};

export function frameIndex(frames: { t: number }[], t: number): number {
  if (!frames.length) return -1;
  const t0 = frames[0].t;
  const step = frames.length > 1 ? frames[1].t - frames[0].t : 0.2;
  return Math.max(0, Math.min(frames.length - 1, Math.floor((t - t0) / step + 1e-6)));
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** People at time t, positions eased between the two surrounding service frames (display only). */
export function peopleAt(frames: WorldFrame[], t: number): WorldPerson[] {
  const i = frameIndex(frames, t);
  if (i < 0) return [];
  const a = frames[i];
  const b = frames[Math.min(i + 1, frames.length - 1)];
  const span = b.t - a.t;
  const k = span > 0 ? Math.max(0, Math.min(1, (t - a.t) / span)) : 0;
  const next = new Map(b.people.map((p) => [p.global_person_id, p]));
  return a.people.map((p) => {
    const q = next.get(p.global_person_id);
    return q ? { ...p, x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k) } : p;
  });
}

export function observationsAt(rows: CameraRow[], t: number): CameraObservation[] {
  const i = frameIndex(rows, t);
  if (i < 0) return [];
  const a = rows[i];
  const b = rows[Math.min(i + 1, rows.length - 1)];
  const span = b.t - a.t;
  const k = span > 0 ? Math.max(0, Math.min(1, (t - a.t) / span)) : 0;
  const next = new Map(b.observations.map((o) => [o.local_track_id, o]));
  return a.observations.map((o) => {
    const q = next.get(o.local_track_id);
    if (!q) return o;
    return { ...o, bbox: o.bbox.map((v, j) => lerp(v, q.bbox[j], k)) as CameraObservation['bbox'] };
  });
}

/** Short trail of recent positions per person (from service frames, not invented). */
export function trails(frames: WorldFrame[], t: number, seconds = 4): Map<string, [number, number][]> {
  const out = new Map<string, [number, number][]>();
  const i = frameIndex(frames, t);
  if (i < 0) return out;
  const step = frames.length > 1 ? frames[1].t - frames[0].t : 0.2;
  const n = Math.round(seconds / step);
  for (let j = Math.max(0, i - n); j <= i; j++) {
    for (const p of frames[j].people) {
      if (p.state === 'exited' || p.state === 'temporarily_occluded') continue;
      const arr = out.get(p.global_person_id) ?? [];
      arr.push([p.x, p.y]);
      out.set(p.global_person_id, arr);
    }
  }
  return out;
}

export function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
}

const CAMERA_SHORT: Record<string, string> = { cam1: 'P1', cam2: 'P2' };
export const cameraShort = (id: string) => CAMERA_SHORT[id] ?? id;

/** Plain-language reasons behind an identity, from the service's evidence summary. */
export function evidenceSentences(p: WorldPerson, labelOf: (gid: number) => string): string[] {
  const e: Evidence = p.evidence;
  const out: string[] = [];
  const l = e.link;
  if (l?.type === 'cross_camera') {
    const d = l.floor_distance_m;
    if (e.supported_by.includes('geometry'))
      out.push(`Both cameras place this person on the same spot of the floor${d !== undefined ? ` (${d.toFixed(1)} m apart)` : ''}.`);
    if (e.supported_by.includes('timing') && l.overlap_s) out.push(`Seen at the same moments by both cameras for ${l.overlap_s.toFixed(0)} s.`);
    if (e.supported_by.includes('motion')) out.push('Moving the same way in both views.');
    if (e.supported_by.includes('appearance')) out.push('Clothing colour matches across both views.');
  } else if (l?.type === 'reacquired') {
    out.push(
      `Picked up again ${l.gap_s !== undefined ? `${l.gap_s.toFixed(1)} s` : ''} after the camera lost them, ${
        l.distance_m !== undefined ? `${l.distance_m.toFixed(1)} m from where they were last seen` : 'close to where they were last seen'
      }.`,
    );
    if (e.supported_by.includes('appearance')) out.push('Clothing colour matches the earlier track.');
  }
  if (p.state === 'ambiguous' && e.ambiguous_with?.length) {
    out.push(
      `Could also be ${e.ambiguous_with.map(labelOf).join(' or ')}. Spottr waits for more evidence instead of merging them.`,
    );
  } else if (p.state === 'ambiguous') {
    out.push('Two explanations fit the evidence about equally well, so Spottr waits instead of merging them.');
  }
  if (!out.length) {
    out.push(
      p.camera_ids.length
        ? `Followed continuously by ${p.camera_ids.map(cameraShort).join(' and ')}; no other camera sees this spot right now.`
        : 'Not visible to any camera at the moment.',
    );
  }
  return out;
}

export function lifecycleLabel(p: WorldPerson): string {
  switch (p.state) {
    case 'temporarily_occluded':
      return 'Hidden for a moment';
    case 'exited':
      return 'Left the view';
    default:
      return p.camera_ids.length > 1 ? 'Seen by both cameras' : `Seen by ${cameraShort(p.camera_ids[0] ?? '')}`;
  }
}
