/**
 * The visuals in the landing page's chapters. Member chapters reuse the real squat clip and the member app's own
 * logic (workout card, recovery suggestion); the two-camera chapter plays the world service's test scene in the gym
 * dashboard's camera cards; gym chapters reuse dashboard pieces. Nothing here links away.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Pause, Play, Send } from 'lucide-react';
import { useClipData } from '../hooks/useClipData';
import { pipelinePersonToWorkoutSummary } from '../services/pipelineAdapter';
import { defaultPersonId, summaryToWorkout, trackedSeconds, workoutHistory, workoutMuscles } from '../services/memberSession';
import { musclesWorkedTitle, suggestNextSession } from '../services/nextSession';
import { calculateMuscleRecovery } from '../services/recovery';
import { summaryService } from '../services/summary';
import { BodyMap, recoveryMapProps } from '../components/BodyMap';
import { CheckDot } from '../components/CheckDot';
import { ANGLES_BASE, type AnglesData, loadAngles } from '../components/intro/twoAnglesData';
import { Disclosure } from '../components/Disclosure';
import { TierPricing } from '../components/TierPricing';
import { PILOT_STEPS } from '../gyms/components/BusinessCards';
import { CameraCard } from '../gyms/world/CameraCard';
import { observationsAt, peopleAt } from '../gyms/world/display';
import { usePlayback } from '../gyms/world/usePlayback';
import { AVAILABLE_TODAY, BLUR_LIMITS } from '../site/Privacy';
import { MEMBER_PROFILE } from '../mocks/memberData';

const NAME = MEMBER_PROFILE.name;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Felix: the person the squat clip follows by default, with the member app's workout history built on top. */
export function useFelix() {
  const data = useClipData('squat');
  return useMemo(() => {
    const personId = data ? defaultPersonId(data.session) : null;
    const person = data?.session.people.find((p) => String(p.id) === personId);
    if (!data || !personId || !person) return null;
    const summary = pipelinePersonToWorkoutSummary(person, data.session);
    // Local recap only: the landing page never calls the AI recap
    const history = workoutHistory(summaryToWorkout(summary, summaryService.generateLocalRecap(summary)));
    return { data, person, personId, history };
  }, [data]);
}
type Felix = NonNullable<ReturnType<typeof useFelix>>;

const Loading: React.FC<{ className?: string }> = ({ className = 'aspect-video' }) => (
  <div className={`panel relative overflow-hidden flex items-center justify-center ${className}`}>
    {/* Halftone still of the clip while its data loads (scripts/halftone.py) */}
    <img src="/halftone/loading.svg" alt="" className="absolute inset-0 w-full h-full object-cover animate-pulse" />
    <Loader2 className="relative w-6 h-6 animate-spin text-ink-3" aria-label="Loading" />
  </div>
);

/** 6:02 pm: he walks in. A stock photo whose edges fade into the page, so it reads as a mood rather than a camera view. */
export const WalkInPhoto: React.FC = () => (
  <img
    src="/landing/walk-in.jpg"
    alt="Someone walking into a gym with a sports bag, seen from behind at floor level"
    width={683}
    height={360}
    loading="lazy"
    decoding="async"
    // A taller crop than the photo: the sides it loses would fade out anyway. The top fades least, where the bag is.
    className="w-full aspect-[4/3] object-cover object-[58%_50%] [mask-image:linear-gradient(to_right,transparent,#000_20%,#000_80%,transparent),linear-gradient(to_bottom,transparent,#000_12%,#000_72%,transparent)] [mask-composite:intersect]"
  />
);

/** 6:05 pm: one room from two corners. The multi-camera tracking turns every sighting of a person into one identity. */
export const TwoCameras: React.FC = () => {
  const [data, setData] = useState<AnglesData | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  // Pressing pause wins over scrolling back into view; reduced motion starts paused
  const [held, setHeld] = useState(prefersReducedMotion);
  const ref = useRef<HTMLElement>(null);
  const seg = data?.timeline.segments[0];
  // The clips stop before the tracking data does: loop where they end, so the picture never stands still
  const [clipEnd, setClipEnd] = useState<number | null>(null);
  const end = Math.min(seg?.to_s ?? 1, clipEnd ?? Infinity);
  const { t, playing, setPlaying } = usePlayback(seg?.from_s ?? 0, end);

  useEffect(() => {
    loadAngles().then(setData, () => setFailed(true));
  }, []);
  useEffect(() => {
    if (!seg) return;
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => setClipEnd(seg.clip_start_s + probe.duration);
    probe.src = ANGLES_BASE + Object.values(seg.clip_urls)[0];
    return () => {
      probe.onloadedmetadata = null;
    };
  }, [seg]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // The muted clips only run while they're on screen, and only once their length is known (a new end resets usePlayback)
  useEffect(() => {
    setPlaying(clipEnd !== null && inView && !held);
  }, [clipEnd, inView, held, setPlaying]);

  const people = data ? peopleAt(data.world.frames, t).filter((p) => p.camera_ids.length) : [];
  const obs = Object.fromEntries(Object.entries(data?.cams ?? {}).map(([c, r]) => [c, observationsAt(r.rows, t)]));
  const sightings = Object.values(obs).reduce((n, o) => n + o.length, 0);
  const matched = people.some((p) => p.camera_ids.length > 1);

  return (
    <figure ref={ref} className="panel p-3 sm:p-4 flex flex-col gap-3">
      {data && seg ? (
        <>
          {data.config.cameras.map((c) => (
            <CameraCard
              key={c.camera_id}
              camera={c}
              videoUrl={ANGLES_BASE + seg.clip_urls[c.camera_id]}
              videoStartsAt={seg.clip_start_s}
              t={t}
              playing={playing}
              observations={obs[c.camera_id] ?? []}
              selected={selected}
              onSelect={setSelected}
              debug={false}
            />
          ))}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
            <button
              onClick={() => setHeld(playing)}
              aria-label={playing ? 'Pause' : 'Play'}
              className="w-9 h-9 shrink-0 rounded-full bg-accent-ink text-white flex items-center justify-center hover:bg-accent-deep cursor-pointer"
            >
              {playing ? <Pause className="w-4 h-4" aria-hidden /> : <Play className="w-4 h-4 ml-0.5" aria-hidden />}
            </button>
            <p className="flex-1 whitespace-nowrap text-sm text-ink tabular-nums">
              <span className="font-semibold">{sightings}</span> sightings <span className="text-ink-3">→</span>{' '}
              <span className="font-semibold">{people.length}</span> {people.length === 1 ? 'person' : 'people'}
            </p>
            <span
              className={`px-2.5 py-0.5 rounded-full bg-lime text-xs font-semibold text-ink transition-opacity duration-300 ${
                matched ? 'opacity-100' : 'opacity-0'
              }`}
            >
              Matched across cameras
            </span>
          </div>
        </>
      ) : failed ? (
        <p className="p-4 text-sm text-ink-2">Could not load the two-camera clip.</p>
      ) : (
        <div className="aspect-[4/5] rounded-[20px] bg-white/60 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-ink-3" aria-label="Loading" />
        </div>
      )}
      <figcaption className="hud-label px-1">One room, two corners. Each person counts once, whichever camera sees them.</figcaption>
    </figure>
  );
};

const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** 6:41 pm: the workout card from the member app, filled from the clip. */
export const WorkoutCard: React.FC<{ felix: Felix | null }> = ({ felix }) => {
  if (!felix) return <Loading className="aspect-[4/3]" />;
  const latest = felix.history[0];
  const sets = latest.exercises.reduce((sum, e) => sum + e.sets, 0);
  return (
    <div className="panel p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-lime ring-1 ring-black/15" />
        <span className="text-sm font-medium text-ink">{NAME}'s app · Today's workout</span>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {[
          ['reps', latest.total_reps, 'text-ink'],
          [sets === 1 ? 'set' : 'sets', sets, 'text-accent-ink'],
          ['on camera', formatSeconds(trackedSeconds(felix.person)), 'text-ink'],
        ].map(([label, value, tone]) => (
          <div key={label as string} className="flex flex-col-reverse">
            <dt className="text-sm text-ink-2 mt-1.5">{label}</dt>
            <dd className={`num text-4xl sm:text-5xl ${tone}`}>{value}</dd>
          </div>
        ))}
      </dl>
      <h3 className="font-display text-2xl font-medium tracking-tight text-ink">{musclesWorkedTitle(latest)}</h3>
      <BodyMap values={workoutMuscles(latest)} mode="intensity" size="md" />
    </div>
  );
};

/** Next morning: the recovery map and the workout the member app suggests next. */
export const NextWorkout: React.FC<{ felix: Felix | null }> = ({ felix }) => {
  const plan = useMemo(() => {
    if (!felix) return null;
    const recovery = calculateMuscleRecovery(felix.history);
    return { recovery, next: suggestNextSession(recovery) };
  }, [felix]);
  if (!plan) return <Loading className="aspect-[4/3]" />;
  const { recovery, next } = plan;
  return (
    <div className="panel p-6 sm:p-7 flex flex-col gap-5">
      <div>
        <span className="hud-label">Next workout</span>
        <h3 className="font-display text-3xl font-medium tracking-tight text-ink mt-1">{next.title}</h3>
        <p className="text-sm text-ink-2 mt-1">{next.reason}</p>
      </div>
      <BodyMap {...recoveryMapProps(recovery)} size="md" />
      {next.exercises.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {next.exercises.slice(0, 3).map((ex) => (
            <li key={ex.name} className="px-3 py-1.5 rounded-full bg-white/80 ring-1 ring-black/[0.06] text-xs font-medium text-ink">
              {ex.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// An illustration, not data: a regular who trained about three times a week, then stopped
const FELIX_VISITS = [3, 4, 3, 3, 3, 1, 0, 0];

/** 2 weeks later: how a slipping regular shows up on the gym dashboard, with a working nudge button. */
export const SlippingExample: React.FC = () => {
  const [sent, setSent] = useState(false);
  const max = Math.max(...FELIX_VISITS);
  return (
    <div className="panel p-6 sm:p-7 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">Gym dashboard · Slipping</span>
        <span className="px-2.5 py-0.5 rounded-full bg-[#FFE7E4] text-xs font-semibold text-[#A3281F]">New</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-sm font-semibold text-ink ring-1 ring-black/[0.06]">
          {NAME[0]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-ink">{NAME}</p>
          <p className="text-sm text-ink-2">No visit in 15 days</p>
        </div>
        <button
          onClick={() => setSent(true)}
          disabled={sent}
          className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold transition-colors ${
            sent ? 'bg-lime text-ink cursor-default' : 'bg-accent-ink text-white hover:bg-accent-deep cursor-pointer'
          }`}
        >
          {sent ? <Check className="w-4 h-4" aria-hidden /> : <Send className="w-4 h-4" aria-hidden />}
          {sent ? 'Sent' : 'Send nudge'}
        </button>
      </div>
      <div>
        <div className="flex items-end gap-2 h-28" role="img" aria-label={`Visits per week over 8 weeks: ${FELIX_VISITS.join(', ')}`}>
          {FELIX_VISITS.map((v, i) => (
            <div key={i} className="flex-1 h-full rounded-full hatch flex items-end">
              <div
                className={`w-full rounded-full ${i >= FELIX_VISITS.length - 3 ? 'bg-coral' : 'bg-accent'}`}
                style={{ height: `${Math.max(v / max, 0.06) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-2 mt-2 flex justify-between">
          <span>8 weeks ago</span>
          <span className="font-medium text-ink">3 → 0 visits / week</span>
          <span>this week</span>
        </p>
      </div>
      <p className={`text-sm text-ink-2 transition-opacity ${sent ? 'opacity-100' : 'opacity-0'}`} aria-live="polite">
        {sent ? `The nudge lands in ${NAME}'s member app. Staff only see his first name.` : ''}
      </p>
    </div>
  );
};

// The four privacy points a gym owner asks about first; the full list lives on the privacy page
const PRIVACY_FIRST = ['No face recognition', 'Workouts come from pose data', 'Gym staff see aggregates', 'Bystanders pixelated in the replay'];

export const PrivacyList: React.FC = () => (
  <div className="panel p-6 sm:p-7 flex flex-col gap-4">
    <figure className="flex flex-col gap-2">
      <img
        src="/halftone/privacy.svg"
        alt="A frame of the squat clip drawn as dots, with the body points of each person in it"
        className="w-full rounded-[20px]"
      />
      <figcaption className="hud-label">
        Illustration from the real clip: sets and reps are computed from body points like these.
      </figcaption>
    </figure>
    <ul className="flex flex-col gap-3">
      {AVAILABLE_TODAY.filter((item) => PRIVACY_FIRST.includes(item.title)).map((item) => (
        <li key={item.title} className="flex gap-3 p-4 rounded-[20px] bg-white/70 ring-1 ring-white">
          <CheckDot className="w-6 h-6 mt-0.5" />
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink">{item.title}</p>
            <p className="text-sm text-ink-2">{item.summary}</p>
            <Disclosure className="mt-1">
              <p className="text-sm text-ink-2 leading-relaxed">{item.body}</p>
            </Disclosure>
          </div>
        </li>
      ))}
    </ul>
    <p className="text-sm text-ink-2">
      <span className="font-semibold text-ink">Today's limit:</span> {BLUR_LIMITS[0]}
    </p>
  </div>
);

/** Every month: the price, and the break-even for the visitor's own dues. */
export const PricingCard: React.FC = () => (
  <div className="panel p-6 sm:p-7">
    <TierPricing />
  </div>
);

/** Getting started: the four pilot steps on one line. */
export const PilotSteps: React.FC = () => (
  <ol className="panel p-6 sm:p-7 flex flex-col">
    {PILOT_STEPS.map(([title, body], i) => (
      <li key={title} className="relative flex gap-4 pb-6 last:pb-0">
        {i < PILOT_STEPS.length - 1 && <span aria-hidden className="absolute left-[17px] top-10 bottom-1 w-0.5 rounded-full bg-line" />}
        <span className="w-9 h-9 shrink-0 rounded-full bg-white text-sm font-semibold text-accent-ink flex items-center justify-center ring-1 ring-black/[0.06]">
          {i + 1}
        </span>
        <div className="pt-1.5">
          <p className="text-base font-semibold text-ink">{title}</p>
          <p className="text-sm text-ink-2 mt-0.5 leading-relaxed">{body}</p>
        </div>
      </li>
    ))}
  </ol>
);
