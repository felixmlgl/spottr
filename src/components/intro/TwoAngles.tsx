import React, { useEffect, useMemo, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { CameraCard } from '../../gyms/world/CameraCard';
import { WorldMap } from '../../gyms/world/WorldMap';
import { evidenceSentences, fmtTime, observationsAt, peopleAt, personColor, STATE_STYLE, trails } from '../../gyms/world/display';
import type { CameraRange, Timeline, WorldMapConfig, WorldRange } from '../../gyms/world/types';
import { usePlayback } from '../../gyms/world/usePlayback';

/** World-service export of the two-camera test room (scripts/gym_two_angles.py). */
const BASE = '/world-demo-angles/';

interface Data {
  config: WorldMapConfig;
  timeline: Timeline;
  world: WorldRange;
  cams: Record<string, CameraRange>;
}

const getJson = <T,>(path: string): Promise<T> =>
  fetch(BASE + path).then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(`${r.status} ${path}`))));

async function load(): Promise<Data> {
  const [config, timeline] = await Promise.all([getJson<WorldMapConfig>('config.json'), getJson<Timeline>('timeline.json')]);
  const seg = timeline.segments[0];
  const [world, ...rows] = await Promise.all([
    getJson<WorldRange>(seg.world_url),
    ...config.cameras.map((c) => getJson<CameraRange>(seg.camera_urls[c.camera_id])),
  ]);
  return {
    config: { ...config, cameras: config.cameras.map((c) => ({ ...c, plate_url: BASE + c.plate_url })) },
    timeline,
    world,
    cams: Object.fromEntries(rows.map((r) => [r.camera_id, r])),
  };
}

const STEPS = [
  ['Calibrate', 'Both cameras are mapped to one floor plan.'],
  ['Project', 'Everyone each camera sees lands on that plan.'],
  ['Resolve', 'Two sightings of one person become one identity.'],
];

export const TwoAngles: React.FC = () => {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hoverCam, setHoverCam] = useState<string | null>(null);
  const seg = data?.timeline.segments[0];
  const { t, playing, setPlaying, seek } = usePlayback(seg?.from_s ?? 0, seg?.to_s ?? 1);

  useEffect(() => {
    load().then(setData, () => setError(true));
  }, []);
  // Muted clips may autoplay; start once the data is in
  useEffect(() => {
    if (seg) setPlaying(true);
  }, [seg]);

  const frames = data?.world.frames ?? [];
  const people = useMemo(() => peopleAt(frames, t).filter((p) => p.camera_ids.length), [frames, t]);
  const trailMap = useMemo(() => trails(frames, t), [frames, t]);
  const obs = useMemo(
    () => Object.fromEntries(Object.entries(data?.cams ?? {}).map(([c, r]) => [c, observationsAt(r.rows, t)])),
    [data, t],
  );

  if (error) return <p className="p-4 text-sm text-[#6E6E73]">Could not load the two-camera demo.</p>;
  if (!data || !seg) return <div className="h-[420px] rounded-[22px] bg-[#F5F5F7] animate-pulse" aria-label="Loading" />;

  const cameraIds = data.config.cameras.map((c) => c.camera_id);
  const camLabel = Object.fromEntries(data.config.cameras.map((c) => [c.camera_id, c.label]));
  const detections = cameraIds.reduce((n, c) => n + (obs[c]?.length ?? 0), 0);
  const both = people.filter((p) => p.camera_ids.length > 1).length;
  const labelOf = (g: number) => `Person ${String(g).padStart(2, '0')}`;
  const links = data.timeline.events.filter((e) => e.type === 'cross_camera_link');

  return (
    <div className="flex flex-col gap-4">
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="bg-[#F5F5F7] rounded-2xl p-3 flex gap-3">
            <span className="w-6 h-6 shrink-0 rounded-full bg-[#34C759] text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
            <span>
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs text-[#6E6E73] mt-0.5">{body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#F5F5F7] rounded-[22px] p-2">
        {data.config.cameras.map((c) => (
          <CameraCard
            key={c.camera_id}
            camera={c}
            videoUrl={BASE + seg.clip_urls[c.camera_id]}
            videoStartsAt={seg.clip_start_s}
            t={t}
            playing={playing}
            observations={obs[c.camera_id] ?? []}
            selected={selected}
            onSelect={setSelected}
            debug={false}
            onHover={setHoverCam}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="bg-[#F5F5F7] rounded-[22px] p-3 sm:p-4 flex flex-col gap-3 min-w-0">
          <p className="text-sm tabular-nums" aria-live="polite">
            <span className="font-semibold">{detections}</span> camera detections <span className="text-[#8E8E93]">→</span>{' '}
            <span className="font-semibold">{people.length}</span> people
            <span className="text-[#6E6E73]"> · {both} seen by both cameras, shown once</span>
          </p>
          <div className="bg-white rounded-2xl overflow-hidden [&_svg]:max-h-[440px]">
            <WorldMap
              config={data.config}
              people={people}
              trails={trailMap}
              selected={selected}
              onSelect={setSelected}
              debug={false}
              hoverCamera={hoverCam}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPlaying(!playing)}
              aria-label={playing ? 'Pause' : 'Play'}
              className="w-9 h-9 shrink-0 rounded-full bg-[#1D1D1F] text-white flex items-center justify-center hover:bg-black cursor-pointer"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="relative flex-1">
              <input
                type="range"
                min={seg.from_s}
                max={seg.to_s}
                step={0.1}
                value={t}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Playback position"
                aria-valuetext={fmtTime(t - seg.from_s)}
                className="w-full accent-[#34C759] cursor-pointer"
              />
              <div className="absolute left-0 right-0 -bottom-1.5 h-1.5 pointer-events-none" aria-hidden>
                {links.map((e, i) => (
                  <span
                    key={i}
                    className="absolute w-1 h-1.5 rounded-full bg-[#34C759]"
                    style={{ left: `${((e.t - seg.from_s) / (seg.to_s - seg.from_s)) * 100}%` }}
                  />
                ))}
              </div>
            </div>
            <span className="text-sm font-semibold tabular-nums">{fmtTime(t - seg.from_s)}</span>
          </div>
          <p className="text-[11px] text-[#8E8E93] -mt-1">
            Green ticks: the moment the service matched one person across both cameras. It decides with a{' '}
            {data.config.decision_lag_s.toFixed(0)} s look-ahead, so the merge shows up on the map slightly earlier.
          </p>
        </div>

        <div className="bg-[#F5F5F7] rounded-[22px] p-4 flex flex-col gap-3">
          <p className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wide">What Spottr extracts</p>
          {people
            .slice()
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((p) => {
              const s = p.display_state ? STATE_STYLE[p.display_state] : null;
              const isSel = p.global_person_id === selected;
              return (
                <button
                  key={p.global_person_id}
                  onClick={() => setSelected(isSel ? null : p.global_person_id)}
                  aria-pressed={isSel}
                  className={`text-left rounded-2xl p-3 flex flex-col gap-1.5 cursor-pointer transition-colors ${
                    isSel ? 'bg-white ring-2 ring-[#34C759]' : 'bg-white/70 hover:bg-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: personColor(p.global_person_id) }} />
                    <span className="text-sm font-semibold flex-1">{p.label}</span>
                    {s && (
                      <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ backgroundColor: s.bg, color: s.text }}>
                        {p.display_state}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-[#6E6E73]">
                    Seen by {p.camera_ids.map((c) => camLabel[c] ?? c).join(' + ')} · at {p.x.toFixed(1)}, {p.y.toFixed(1)} m ·{' '}
                    {Math.round(p.identity_confidence * 100)}% sure
                  </span>
                  {isSel && (
                    <ul className="flex flex-col gap-1 pt-1">
                      {evidenceSentences(p, labelOf).map((line) => (
                        <li key={line} className="text-xs flex gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-[#34C759] shrink-0" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
          <p className="text-[11px] text-[#8E8E93]">
            One position and one identity per person, whichever camera sees them. Zones, sessions and workouts read from this single
            record instead of from each camera separately.
          </p>
        </div>
      </div>

      <p className="text-[11px] text-[#8E8E93]">
        Generated two-camera test scene. Calibrated by hand from floor landmarks both cameras can see (no surveyed floor plan, so
        positions are approximate). Faces of detected people are pixelated. Labels are anonymous and only valid inside this clip.
      </p>
    </div>
  );
};
