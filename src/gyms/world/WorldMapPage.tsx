import React, { useEffect, useMemo, useState } from 'react';
import { Bug, Info, MessageSquareQuote, Pause, Play, X } from 'lucide-react';
import { Card, Eyebrow, PageHeader, Segmented } from '../components/ui';
import { CameraCard } from './CameraCard';
import { PilotSetup } from './PilotSetup';
import { WorldMap } from './WorldMap';
import {
  getMetrics,
  getSegmentCamera,
  getSegmentWorld,
  getTimeline,
  getWorldMapConfig,
  isLive,
  liveSegments,
  mediaUrl,
  segmentVideo,
} from './api';
import {
  cameraShort,
  evidenceSentences,
  fmtTime,
  lifecycleLabel,
  observationsAt,
  peopleAt,
  personColor,
  STATE_STYLE,
  trails as buildTrails,
} from './display';
import type { CameraRange, MetricsPayload, Segment, Timeline, WorldMapConfig, WorldPerson, WorldRange } from './types';
import { usePlayback } from './usePlayback';

const TALK_TRACK =
  'Your cameras already see different parts of the room. Spottr calibrates them to one shared floor map, so they no longer behave like separate cameras. When a member moves through the gym, we maintain one session and one identity across views. This is what lets us understand the workout in the context of the whole gym, not just one camera clip.';

const StateChip: React.FC<{ state: WorldPerson['display_state'] }> = ({ state }) => {
  if (!state) return <span className="text-[11px] text-[#6E6E73]">Left the view</span>;
  const s = STATE_STYLE[state];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {state}
    </span>
  );
};

const CameraDots: React.FC<{ cameras: string[]; all: string[] }> = ({ cameras, all }) => (
  <span className="inline-flex gap-1" aria-label={`Seen by ${cameras.map(cameraShort).join(' and ') || 'no camera'}`}>
    {all.map((c) => (
      <span
        key={c}
        className={`text-[10px] font-semibold rounded px-1 py-px ${
          cameras.includes(c) ? 'bg-[#1D1D1F] text-white' : 'bg-[#F2F2F7] text-[#C7C7CC]'
        }`}
      >
        {cameraShort(c)}
      </span>
    ))}
  </span>
);

function useWorldData() {
  const [config, setConfig] = useState<WorldMapConfig | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [metrics, setMetrics] = useState<MetricsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([getWorldMapConfig(), getTimeline()])
      .then(([c, tl]) => {
        if (!alive) return;
        setConfig({ ...c, cameras: c.cameras.map((cam) => ({ ...cam, plate_url: mediaUrl(cam.plate_url) })) });
        setTimeline(tl);
      })
      .catch((e: Error) => alive && setError(e.message));
    getMetrics()
      .then((m) => alive && setMetrics(m))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return { config, timeline, metrics, error };
}

function useSegment(seg: Segment | null, cameraIds: string[]) {
  const [world, setWorld] = useState<WorldRange | null>(null);
  const [cams, setCams] = useState<Record<string, CameraRange>>({});
  useEffect(() => {
    if (!seg) return;
    let alive = true;
    setWorld(null);
    setCams({});
    getSegmentWorld(seg).then((w) => alive && setWorld(w));
    Promise.all(cameraIds.map((c) => getSegmentCamera(seg, c))).then(
      (rows) => alive && setCams(Object.fromEntries(rows.map((r) => [r.camera_id, r]))),
    );
    return () => {
      alive = false;
    };
  }, [seg, cameraIds.join(',')]);
  return { world, cams };
}

export const WorldMapPage: React.FC = () => {
  const [mode, setMode] = useState<'demo' | 'setup'>('demo');
  const { config, timeline, metrics, error } = useWorldData();

  return (
    <div className="flex flex-col gap-8 pb-16">
      <PageHeader
        eyebrow={
          <>
            <span>Great Hall · two-camera pilot demo</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-[#1D1D1F] bg-[#F5F5F7] ring-1 ring-black/[0.06]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
              {isLive ? 'Live service' : 'Recorded footage'}
            </span>
          </>
        }
        title="World map"
        subtitle="Cameras are observations of one shared model of the room. Whichever camera sees someone, they stay one anonymous identity on one floor map."
        aside={
          <Segmented
            ariaLabel="Mode"
            options={[
              { id: 'demo', label: 'Demo' },
              { id: 'setup', label: 'Pilot setup' },
            ]}
            value={mode}
            onChange={setMode}
            className="self-start sm:self-end"
          />
        }
      />

      {error && (
        <Card className="!p-5 text-sm text-[#1D1D1F]">
          Could not load the world-map data ({error}). {isLive ? 'Is the Spottr world service running?' : ''}
        </Card>
      )}

      {config && timeline && mode === 'demo' && <Demo config={config} timeline={timeline} metrics={metrics} />}
      {config && mode === 'setup' && <PilotSetup config={config} />}
      {!config && !error && <div className="h-[480px] rounded-[24px] bg-[#F5F5F7] animate-pulse" aria-label="Loading" />}
    </div>
  );
};

const Hero: React.FC = () => {
  const [talk, setTalk] = useState(false);
  return (
    <section className="rounded-[24px] bg-gradient-to-br from-[#F2FBF4] to-[#F5F5F7] p-6 sm:p-8 ring-1 ring-[#34C759]/10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] leading-tight">
            Two cameras. One shared floor map.
            <br />
            One identity per member.
          </h2>
          <p className="text-[15px] text-[#6E6E73] mt-3">
            Each camera is calibrated to the same floor plan, so a person seen from both sides of the room lands on the
            same spot and becomes one marker. When one camera loses them behind a chair, the other keeps the identity
            going.
          </p>
        </div>
        <button
          onClick={() => setTalk((v) => !v)}
          className="self-start lg:self-end inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-sm font-medium text-[#1D1D1F] shadow-xs ring-1 ring-black/[0.06] hover:bg-[#FAFAFA] cursor-pointer"
          aria-expanded={talk}
        >
          <MessageSquareQuote className="w-4 h-4 text-[#34C759]" aria-hidden />
          {talk ? 'Hide talk track' : 'Talk track'}
        </button>
      </div>
      <ol className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-6">
        {[
          ['Calibrate', 'Each camera is mapped to one floor plan.'],
          ['Project', 'Everyone each camera sees is placed on that plan.'],
          ['Resolve', 'Overlapping sightings become one identity, only when the evidence is strong.'],
        ].map(([title, body], i) => (
          <li key={title} className="bg-white/80 rounded-2xl p-4 flex gap-3">
            <span className="w-6 h-6 shrink-0 rounded-full bg-[#34C759] text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
            <span>
              <span className="block text-sm font-semibold text-[#1D1D1F]">{title}</span>
              <span className="block text-[13px] text-[#6E6E73] mt-0.5">{body}</span>
            </span>
          </li>
        ))}
      </ol>
      {talk && (
        <blockquote className="mt-5 bg-white rounded-2xl p-5 text-[15px] leading-relaxed text-[#1D1D1F] border-l-4 border-[#34C759]">
          “{TALK_TRACK}”
        </blockquote>
      )}
    </section>
  );
};

const Demo: React.FC<{ config: WorldMapConfig; timeline: Timeline; metrics: MetricsPayload | null }> = ({ config, timeline, metrics }) => {
  const segments = timeline.segments.length ? timeline.segments : liveSegments(timeline);
  const [segId, setSegId] = useState(segments[0]?.id);
  const seg = segments.find((s) => s.id === segId) ?? segments[0];
  const cameraIds = useMemo(() => config.cameras.map((c) => c.camera_id), [config]);
  const { world, cams } = useSegment(seg ?? null, cameraIds);
  const { t, playing, setPlaying, seek } = usePlayback(seg?.from_s ?? 0, seg?.to_s ?? 1);
  const [selected, setSelected] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
  const [hoverCam, setHoverCam] = useState<string | null>(null);

  useEffect(() => setSelected(null), [segId]);

  const frames = world?.frames ?? [];
  const people = useMemo(() => peopleAt(frames, t), [frames, t]);
  const trailMap = useMemo(() => buildTrails(frames, t), [frames, t]);
  const obs = useMemo(
    () => Object.fromEntries(cameraIds.map((c) => [c, cams[c] ? observationsAt(cams[c].rows, t) : []])),
    [cams, cameraIds, t],
  );
  const inRoom = people.filter((p) => p.state === 'active' || p.state === 'ambiguous' || p.state === 'temporarily_occluded');
  const detections = cameraIds.reduce((n, c) => n + obs[c].filter((o) => o.global_person_id).length, 0);
  const visibleNow = people.filter((p) => p.camera_ids.length > 0);
  const both = visibleNow.filter((p) => p.camera_ids.length > 1).length;
  const sel = selected ? people.find((p) => p.global_person_id === selected) ?? null : null;
  const labelOf = (g: number) => `Person ${String(g).padStart(2, '0')}`;
  const segEvents = timeline.events.filter((e) => seg && e.t >= seg.from_s && e.t <= seg.to_s && e.type === 'cross_camera_link');

  if (!seg) return null;
  const loading = !world || Object.keys(cams).length < cameraIds.length;

  return (
    <>
      <Hero />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Card className="!p-4 sm:!p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Segmented
                ariaLabel="Demo clip"
                options={segments.map((s) => ({ id: s.id, label: s.title }))}
                value={seg.id}
                onChange={setSegId}
              />
              <div className="flex items-center gap-2 flex-wrap">
                {(['Confirmed', 'Tracking', 'Needs confirmation'] as const).map((s) => (
                  <span key={s} title={STATE_STYLE[s].hint} className="inline-flex items-center gap-1 text-[11px] text-[#6E6E73]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATE_STYLE[s].dot }} />
                    {s}
                  </span>
                ))}
                <button
                  onClick={() => setDebug((d) => !d)}
                  aria-pressed={debug}
                  title="Show local track IDs, global IDs, calibration points and association links"
                  className={`ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                    debug ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  <Bug className="w-3 h-3" aria-hidden />
                  Debug
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 -mt-1">
              <p className="text-sm text-[#6E6E73]">{seg.summary}</p>
              <p className="text-sm text-[#1D1D1F] tabular-nums whitespace-nowrap" aria-live="polite">
                <span className="font-semibold">{detections}</span> camera detections <span className="text-[#8E8E93]">→</span>{' '}
                <span className="font-semibold">{visibleNow.length}</span> people
                <span className="text-[#6E6E73]"> · {both} seen by both, shown once</span>
              </p>
            </div>

            <div className="relative bg-white rounded-2xl overflow-hidden ring-1 ring-black/[0.04]">
              <WorldMap
                config={config}
                people={people}
                trails={trailMap}
                selected={selected}
                onSelect={setSelected}
                debug={debug}
                hoverCamera={hoverCam}
              />
              {loading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center text-sm text-[#6E6E73]">Loading clip…</div>}
            </div>

            {/* transport */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlaying(!playing)}
                aria-label={playing ? 'Pause' : 'Play'}
                className="w-10 h-10 shrink-0 rounded-full bg-[#1D1D1F] text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
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
                  {segEvents.map((e, i) => (
                    <span
                      key={i}
                      className="absolute w-1 h-1.5 rounded-full bg-[#34C759]"
                      style={{ left: `${((e.t - seg.from_s) / (seg.to_s - seg.from_s)) * 100}%` }}
                      title={`Cross-camera match at ${fmtTime(e.t - seg.from_s)}`}
                    />
                  ))}
                </div>
              </div>
              <span className="w-24 shrink-0 text-right text-sm font-semibold text-[#1D1D1F] tabular-nums">
                {fmtTime(t - seg.from_s)} / {fmtTime(seg.to_s - seg.from_s)}
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93] -mt-2">
              Green ticks mark moments when the service matched one person across both cameras. Identities are decided with a
              {` ${config.decision_lag_s.toFixed(0)} s`} look-ahead so early guesses can still be corrected.
            </p>
          </Card>

        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          {sel ? (
            <Card className="!p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: personColor(sel.global_person_id) }} />
                  <div>
                    <p className="text-lg font-bold text-[#1D1D1F] leading-tight">{sel.label}</p>
                    <p className="text-xs text-[#6E6E73]">{lifecycleLabel(sel)}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Close" className="p-1 rounded-full hover:bg-white cursor-pointer">
                  <X className="w-4 h-4 text-[#6E6E73]" />
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StateChip state={sel.display_state} />
                <CameraDots cameras={sel.camera_ids} all={cameraIds} />
              </div>
              {sel.display_state && <p className="text-[13px] text-[#6E6E73] -mt-1">{STATE_STYLE[sel.display_state].hint}</p>}
              <div>
                <Eyebrow>Why this is one identity</Eyebrow>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {evidenceSentences(sel, labelOf).map((s) => (
                    <li key={s} className="text-[13px] text-[#1D1D1F] flex gap-2">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-[#34C759] shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex justify-between text-xs text-[#6E6E73]">
                  <span>Identity confidence</span>
                  <span className="font-semibold text-[#1D1D1F] tabular-nums">{Math.round(sel.identity_confidence * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white mt-1 overflow-hidden">
                  <div className="h-full rounded-full bg-[#34C759]" style={{ width: `${sel.identity_confidence * 100}%` }} />
                </div>
              </div>
              {debug && (
                <dl className="text-[11px] text-[#6E6E73] grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 bg-white rounded-xl p-3">
                  <dt>Global ID</dt>
                  <dd className="font-mono text-[#1D1D1F]">{sel.global_person_id}</dd>
                  <dt>Local tracks</dt>
                  <dd className="font-mono text-[#1D1D1F]">{sel.local_track_ids.join(', ') || '—'}</dd>
                  <dt>Lifecycle</dt>
                  <dd className="font-mono text-[#1D1D1F]">{sel.state}</dd>
                  <dt>Evidence</dt>
                  <dd className="font-mono text-[#1D1D1F]">{sel.evidence.supported_by.join(', ') || '—'}</dd>
                  <dt>Floor (m)</dt>
                  <dd className="font-mono text-[#1D1D1F]">
                    {sel.x.toFixed(1)}, {sel.y.toFixed(1)}
                  </dd>
                </dl>
              )}
            </Card>
          ) : (
            <Card className="!p-5">
              <p className="text-sm text-[#6E6E73] flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#34C759]" aria-hidden />
                Tap a person on the map or in either camera to see how the views were linked.
              </p>
            </Card>
          )}

          <Card className="!p-5">
            <div className="flex items-baseline justify-between">
              <Eyebrow>In the room</Eyebrow>
              <span className="text-xs text-[#6E6E73] tabular-nums">{inRoom.length}</span>
            </div>
            <ul className="mt-3 flex flex-col gap-1 max-h-[360px] overflow-y-auto -mx-2">
              {inRoom
                .slice()
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((p) => (
                  <li key={p.global_person_id}>
                    <button
                      onClick={() => setSelected(p.global_person_id === selected ? null : p.global_person_id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-left cursor-pointer transition-colors ${
                        p.global_person_id === selected ? 'bg-white shadow-xs' : 'hover:bg-white/70'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: personColor(p.global_person_id) }} />
                      <span className="text-sm font-medium text-[#1D1D1F] flex-1 truncate">{p.label}</span>
                      <CameraDots cameras={p.camera_ids} all={cameraIds} />
                      <StateChip state={p.display_state} />
                    </button>
                  </li>
                ))}
              {!inRoom.length && <li className="px-2 text-sm text-[#6E6E73]">Nobody in view.</li>}
            </ul>
          </Card>
        </aside>

        <div className="flex flex-col gap-4 min-w-0 lg:col-start-1 lg:row-start-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.cameras.map((c) => {
              const v = segmentVideo(seg, timeline, c.camera_id);
              return (
                <CameraCard
                  key={`${seg.id}-${c.camera_id}`}
                  camera={c}
                  videoUrl={v?.url ?? null}
                  videoStartsAt={v?.startsAt ?? seg.from_s}
                  t={t}
                  playing={playing}
                  observations={obs[c.camera_id]}
                  selected={selected}
                  onSelect={setSelected}
                  debug={debug}
                  onHover={setHoverCam}
                />
              );
            })}
          </div>
          <p className="text-[11px] text-[#8E8E93] -mt-2">
            Clips are recorded footage of a public lounge, not a gym. Faces of people the detector found are pixelated; anyone it
            missed is not. Labels are anonymous and only valid inside this recording.
          </p>
        </div>
      </div>

      <HowItWorks config={config} metrics={metrics} />
    </>
  );
};

const HowItWorks: React.FC<{ config: WorldMapConfig; metrics: MetricsPayload | null }> = ({ config, metrics }) => {
  const held = metrics?.evaluation?.['420_480']?.strict;
  const tuned = metrics?.evaluation?.['030_090']?.strict;
  const q = config.calibration.quality;
  const offset = Object.values(config.sync.offsets_s).find((v) => v !== 0) ?? 0;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="flex flex-col gap-4">
        <Eyebrow>How it works</Eyebrow>
        <ol className="flex flex-col gap-3">
          {[
            ['Each camera tracks people on its own', 'Pose and box per person, with short-term IDs that only mean something inside that camera.'],
            ['Everyone lands on one floor plan', 'Each camera is calibrated to the floor, so a person’s feet map to metres on a shared plan.'],
            ['Overlapping sightings become one identity', 'Position, timing, movement and clothing colour all have to agree over several seconds. Weak evidence stays “Needs confirmation”.'],
            ['One world state for everything downstream', 'Sessions, zones and workouts read this single source of truth, not individual clips.'],
          ].map(([t, b], i) => (
            <li key={t} className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-white text-[#1D1D1F] text-xs font-bold flex items-center justify-center ring-1 ring-black/[0.06]">
                {i + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold text-[#1D1D1F]">{t}</span>
                <span className="block text-[13px] text-[#6E6E73]">{b}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>
      <Card className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-2">
          <Eyebrow>Measured on this footage</Eyebrow>
          <span className="text-[11px] text-[#6E6E73]">vs. hand-checked labels</span>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          {[
            [held ? pct(held.IDF1) : '–', 'identity consistency (IDF1) on a held-out minute'],
            [held ? String(held.false_merges.distinct_events) : '–', 'times two people were merged into one'],
            [held ? pct(held.cross_camera.recall) : '–', 'of moments seen by both cameras shown as one person'],
            [`${Math.abs(offset * 1000).toFixed(0)} ms`, `time offset found between the two recordings (${config.sync.confidence} confidence)`],
          ].map(([v, l]) => (
            <div key={l} className="bg-white rounded-2xl p-4">
              <dd className="text-2xl font-bold text-[#1D1D1F] tabular-nums">{v}</dd>
              <dt className="text-xs text-[#6E6E73] mt-0.5">{l}</dt>
            </div>
          ))}
        </dl>
        <p className="text-[12px] text-[#6E6E73] leading-relaxed">
          Calibration is graded <span className="font-semibold text-[#1D1D1F]">{q.grade ?? 'n/a'}</span>
          {q.cross_camera_floor_agreement_m &&
            `: the two cameras place the same person ${q.cross_camera_floor_agreement_m.median.toFixed(2)} m apart (median), ${q.cross_camera_floor_agreement_m.p90.toFixed(2)} m at the 90th percentile`}
          . The room had no surveyed floor plan, so metric scale comes from average body proportions (about ±5%).
          {tuned && ` On the minute used to tune the system, IDF1 was ${pct(tuned.IDF1)}.`} Uncertain identities are shown as
          “Needs confirmation” rather than merged.
        </p>
      </Card>
    </section>
  );
};
