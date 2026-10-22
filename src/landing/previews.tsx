/**
 * The visuals in the landing page's chapters. Member chapters reuse the real squat clip and the member app's own
 * logic (workout card, recovery suggestion); gym chapters reuse dashboard pieces. Nothing here links away.
 */

import React, { useMemo, useState } from 'react';
import { Check, Loader2, Send } from 'lucide-react';
import { Link } from '../router';
import { useClipData } from '../hooks/useClipData';
import { getPipelineDetectionsAtTime, pipelinePersonToWorkoutSummary } from '../services/pipelineAdapter';
import { defaultPersonId, spotlightTime, summaryToWorkout, trackedSeconds, workoutHistory, workoutMuscles } from '../services/memberSession';
import { musclesWorkedTitle, suggestNextSession } from '../services/nextSession';
import { calculateMuscleRecovery } from '../services/recovery';
import { summaryService } from '../services/summary';
import { BodyMap, recoveryMapProps } from '../components/BodyMap';
import { BONES, SessionPlayer } from '../components/SessionPlayer';
import { CheckDot } from '../components/CheckDot';
import { Disclosure } from '../components/Disclosure';
import { Segmented } from '../gyms/components/ui';
import { PILOT_STEPS } from '../gyms/components/BusinessCards';
import { AVAILABLE_TODAY, BLUR_LIMITS } from '../gyms/pages/Privacy';
import { breakEvenMembers, DEFAULT_DUES, DUES_OPTIONS, formatUsd, PRICE_PER_LOCATION_MONTH } from '../gyms/pricing';
import { MEMBER_PROFILE } from '../mocks/memberData';
import { PoseSkeleton } from '../types/schema';

const NAME = MEMBER_PROFILE.name;

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

/** 6:02 pm: one real frame of Felix as Spottr sees him, drawn as body joints only. */
export const PoseFrame: React.FC<{ felix: Felix | null }> = ({ felix }) => {
  const skeleton = useMemo<PoseSkeleton | null>(() => {
    if (!felix) return null;
    const { data, person, personId } = felix;
    const det = getPipelineDetectionsAtTime(data.session, data.overlay, spotlightTime(person)).find((d) => d.person_id === personId);
    return det?.skeleton ?? null;
  }, [felix]);
  if (!felix) return <Loading className="aspect-[4/3]" />;
  if (!skeleton) return null;

  // Fit the joints into a 100×100 box, keeping the video's 16:9 proportions
  const pts = Object.entries(skeleton).map(([k, p]) => [k, p!.x * 16, p!.y * 9] as const);
  const xs = pts.map((p) => p[1]);
  const ys = pts.map((p) => p[2]);
  const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
  const s = 76 / Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY);
  const ox = 50 - ((Math.max(...xs) - minX) * s) / 2;
  const oy = 50 - ((Math.max(...ys) - minY) * s) / 2;
  const at = (name: keyof PoseSkeleton) => {
    const p = skeleton[name];
    return p ? [ox + (p.x * 16 - minX) * s, oy + (p.y * 9 - minY) * s] : null;
  };

  return (
    <figure className="panel p-5 sm:p-6">
      <div className="aspect-[4/3] rounded-[20px] bg-white/70 bg-[radial-gradient(var(--color-line)_1px,transparent_1px)] [background-size:14px_14px] flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-[85%]" role="img" aria-label={`${NAME}'s body joints from one frame of the clip`}>
          {BONES.map(([a, b]) => {
            const pa = at(a);
            const pb = at(b);
            return pa && pb ? (
              <line key={`${a}-${b}`} x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]} stroke="#4D80FF" strokeWidth={1.6} strokeLinecap="round" />
            ) : null;
          })}
          {BONES.flat()
            .filter((n, i, all) => all.indexOf(n) === i)
            .map((n) => {
              const p = at(n);
              return p ? <circle key={n} cx={p[0]} cy={p[1]} r={1.8} fill="#C7FF6A" stroke="#0E1117" strokeWidth={0.6} /> : null;
            })}
        </svg>
      </div>
      <figcaption className="hud-label mt-3">One frame of the real clip: the body joints Spottr follows. No face, no name.</figcaption>
    </figure>
  );
};

/** 6:05 pm: the real squat clip with the pipeline's live rep count. */
export const LiveReplay: React.FC<{ felix: Felix | null }> = ({ felix }) =>
  felix ? (
    <figure className="panel p-3 sm:p-4 flex flex-col gap-3">
      <SessionPlayer data={felix.data} personId={felix.personId} defaultOverlayMode="styled" repSound={false} />
      <figcaption className="hud-label px-1">Real gym clip. Everyone else is pixelated.</figcaption>
    </figure>
  ) : (
    <Loading />
  );

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
    <Link to="/gyms/privacy" className="self-start text-sm font-semibold text-accent-ink hover:text-ink">
      Everything we do and don't do yet ›
    </Link>
  </div>
);

/** Every month: the price, and the break-even for the visitor's own dues. */
export const PricingCard: React.FC = () => {
  const [dues, setDues] = useState<number>(DEFAULT_DUES);
  return (
    <div className="panel p-6 sm:p-7 flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-4">
        <div className="flex flex-col-reverse">
          <dt className="text-sm text-ink-2 mt-1.5">per location / month, hardware included</dt>
          <dd className="num text-5xl text-ink">{formatUsd(PRICE_PER_LOCATION_MONTH)}</dd>
        </div>
        <div className="flex flex-col-reverse">
          <dt className="text-sm text-ink-2 mt-1.5">for your members</dt>
          <dd className="num text-5xl text-ink">Free</dd>
        </div>
      </dl>
      <div className="rounded-[20px] bg-white/70 ring-1 ring-white p-5 flex flex-col gap-3">
        <span className="text-sm font-medium text-ink">Your average monthly dues</span>
        <Segmented
          ariaLabel="Average monthly dues"
          options={DUES_OPTIONS.map((d) => ({ id: d, label: formatUsd(d) }))}
          value={dues}
          onChange={setDues}
          className="self-start"
        />
        <p className="flex items-baseline gap-2 flex-wrap mt-1">
          <span className="num text-5xl text-ink">
            <span className="marker">{breakEvenMembers(dues)}</span>
          </span>
          <span className="text-base text-ink">members kept a month covers it</span>
        </p>
      </div>
    </div>
  );
};

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
