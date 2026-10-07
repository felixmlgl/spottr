import React, { useMemo, useState } from 'react';
import { Camera, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import { MuscleId, PastWorkout } from '../types/schema';
import { MUSCLE_NAMES } from '../data/exerciseMuscles';
import { calculateMuscleRecovery, readyDayLabel, RecoveryCalculationResult } from '../services/recovery';
import {
  daysAgo,
  ExerciseSuggestion,
  exercisesForMuscle,
  joinList,
  lastTrainedIn,
  recentWorkouts,
  suggestNextSession,
} from '../services/nextSession';
import { BodyMap, recoveryColor, recoveryMapProps } from './BodyMap';
import { MyPlan, formatTarget, joinAmp } from './plan/MyPlan';
import { usePlan } from '../services/planStorage';
import { bestFitDay, dayGroups, dayMuscles, dayReadiness, upcomingDay, UpcomingDay } from '../services/planSchedule';
import { planExerciseInfo } from '../data/planExercises';

interface PlanTabProps {
  /** Today's camera-tracked session first, then older workouts */
  history: PastWorkout[];
}

/** Exercises shown per muscle at a time; "Generate new" moves on to the next ones */
const PAGE_SIZE = 3;

/** "today", "yesterday" or the weekday; only used for the last week */
const dayName = (w: PastWorkout) => {
  const d = daysAgo(w.date);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  return new Date(`${w.date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
};

const muscleList = (muscles: MuscleId[]) => muscles.map((m) => MUSCLE_NAMES[m]).join(' · ');

const ExerciseRow: React.FC<{ exercise: ExerciseSuggestion; badge?: React.ReactNode; note?: string; muted?: boolean }> = ({
  exercise,
  badge,
  note,
  muted,
}) => (
  <div className="p-4 flex items-center gap-4">
    {badge}
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-semibold truncate ${muted ? 'text-[#6E6E73]' : 'text-[#1D1D1F]'}`}>{exercise.name}</p>
      <p className="text-xs text-[#6E6E73] truncate">{note ?? muscleList(exercise.primary)}</p>
    </div>
    <span className={`text-sm font-semibold tabular-nums shrink-0 ${muted ? 'text-[#86868B]' : 'text-[#1D1D1F]'}`}>
      {exercise.sets} × {exercise.reps}
    </span>
  </div>
);

/** The page'th group of PAGE_SIZE items, wrapping around to the start once the list runs out */
const pageOf = <T,>(items: T[], page: number) =>
  items.length <= PAGE_SIZE
    ? items
    : Array.from({ length: PAGE_SIZE }, (_, i) => items[(page * PAGE_SIZE + i) % items.length]);

const SINGULAR: MuscleId[] = ['chest', 'lower_back'];

/** Why this day is next, and whether its muscles are ready for it. */
function upcomingReason({ day, last }: UpcomingDay, recovery: RecoveryCalculationResult, fitName: string | null) {
  const when = last
    ? daysAgo(last.workout.date) === 0
      ? 'today'
      : daysAgo(last.workout.date) === 1
      ? 'yesterday'
      : `on ${last.workout.display_date}`
    : '';
  const order = last
    ? `Your last session ${when} matched ${last.day.name}, so ${day.name} is next in your plan.`
    : `None of your recent workouts match a day in your plan yet, so it starts with ${day.name}.`;
  if (!day.exercises.length) return `${order} This day has no exercises yet.`;

  const { recovering, hoursUntilReady } = dayReadiness(day, recovery);
  if (!recovering.length) return `${order} Everything it trains is recovered.`;
  const names = joinList(recovering.slice(0, 3).map((m) => MUSCLE_NAMES[m].toLowerCase()));
  const plural = recovering.length > 1 || !SINGULAR.includes(recovering[0]);
  const more = recovering.length > 3 ? ' and more' : '';
  const alternative = fitName && fitName !== day.name ? ` If you'd rather wait, ${fitName} fits better today.` : '';
  return `${order} Your ${names}${more} ${plural ? 'are' : 'is'} still recovering (back to full ${readyDayLabel(
    hoursUntilReady
  )}).${alternative}`;
}

const NumberBadge: React.FC<{ n: number }> = ({ n }) => (
  <span className="w-7 h-7 rounded-full bg-[#F5F5F7] text-xs font-bold text-[#1D1D1F] flex items-center justify-center shrink-0">
    {n}
  </span>
);

interface MusclePanelProps {
  muscle: MuscleId;
  recovery: RecoveryCalculationResult;
  history: PastWorkout[];
}

/** The tapped muscle: how recovered it is, when it was last trained, and exercises for it three at a time. */
const MusclePanel: React.FC<MusclePanelProps> = ({ muscle, recovery, history }) => {
  const [page, setPage] = useState(0);
  const status = recovery.muscles[muscle];
  const name = MUSCLE_NAMES[muscle];
  const { fits, notYet } = exercisesForMuscle(muscle, recovery);

  const last = lastTrainedIn(muscle, history);
  const lastDay = last && daysAgo(last.workout.date);
  const lastTrainedText = !last
    ? 'Not trained in the last 4 weeks'
    : `Last trained ${lastDay === 0 ? 'today' : lastDay === 1 ? 'yesterday' : `on ${last.workout.display_date}`}${
        last.exercises.length ? ` · ${last.exercises.join(', ')}` : ''
      }`;

  const waitingNote = (waitingOn: MuscleId[]) =>
    `Waiting on ${muscleList(waitingOn).toLowerCase()} · ready ${readyDayLabel(
      Math.max(...waitingOn.map((m) => recovery.muscles[m].hours_remaining))
    )}`;

  // Suggest what fits now; when nothing does, page through what's waiting instead
  const suggestions: { exercise: ExerciseSuggestion; note?: string; muted: boolean }[] = fits.length
    ? fits.map((exercise) => ({ exercise, note: undefined, muted: false }))
    : notYet.map(({ exercise, waitingOn }) => ({ exercise, note: waitingNote(waitingOn), muted: true }));

  return (
    <div className="min-w-0 flex flex-col gap-4 animate-in fade-in duration-150">
      <div>
        <h4 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">{name}</h4>
        <p className="text-sm text-[#1D1D1F] mt-1 flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: recoveryColor(status.recovery_percent / 100) }}
          />
          {status.status === 'ready'
            ? 'Ready to train'
            : `${status.recovery_percent}% recovered · back to full ${readyDayLabel(status.hours_remaining)}`}
        </p>
        <p className="text-sm text-[#6E6E73] mt-0.5">{lastTrainedText}</p>
      </div>

      {!fits.length && status.status === 'ready' && (
        <p className="text-sm text-[#6E6E73]">
          Nothing fits yet: every exercise for {name.toLowerCase()} also leans on a muscle that's still recovering.
        </p>
      )}

      {suggestions.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">
              {fits.length ? 'Exercises that fit' : 'Not yet'}
            </p>
            <span className="text-xs text-[#86868B]">{suggestions.length} options</span>
          </div>
          <div
            key={page}
            className={`${
              fits.length ? 'bg-white' : 'bg-white/60'
            } rounded-2xl divide-y divide-black/[0.04] overflow-hidden animate-in fade-in duration-200`}
          >
            {pageOf(suggestions, page).map(({ exercise, note, muted }) => (
              <ExerciseRow key={exercise.id} exercise={exercise} note={note} muted={muted} />
            ))}
          </div>
          {suggestions.length > PAGE_SIZE && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-[#E8E8ED] text-sm font-medium text-[#1D1D1F] shadow-2xs cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Generate new
            </button>
          )}
        </div>
      )}

      {fits.length > 0 && notYet.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide mb-2">Not yet</p>
          <div className="bg-white/60 rounded-2xl divide-y divide-black/[0.04] overflow-hidden">
            {notYet.map(({ exercise, waitingOn }) => (
              <ExerciseRow key={exercise.id} exercise={exercise} muted note={waitingNote(waitingOn)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const PlanTab: React.FC<PlanTabProps> = ({ history }) => {
  const [pickedMuscle, setPickedMuscle] = useState<MuscleId | null>(null);
  const [plan, setPlan] = usePlan();

  const recovery = useMemo(() => calculateMuscleRecovery(history), [history]);
  const session = useMemo(() => suggestNextSession(recovery), [recovery]);
  const thisWeek = useMemo(() => recentWorkouts(history, 7), [history]);

  // With a plan, the next session is the plan's next day; without one, the recovery-based suggestion
  const upcoming = useMemo(() => (plan ? upcomingDay(plan, history) : null), [plan, history]);
  const fit = useMemo(() => (plan ? bestFitDay(plan, recovery) : null), [plan, recovery]);
  const fitReadiness = fit ? dayReadiness(fit, recovery) : null;

  // Until the member taps one, the map opens on the muscle the next session is built around
  const upcomingMuscles = upcoming ? dayMuscles(upcoming.day) : [];
  const muscle =
    pickedMuscle ??
    (upcoming && upcomingMuscles.length
      ? dayReadiness(upcoming.day, recovery).recovering[0] ?? upcomingMuscles[0]
      : session.spotlight);

  return (
    <div className="flex flex-col gap-8 pb-16 animate-in fade-in duration-200">
      <div className="pt-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F]">Plan</h1>
        <p className="text-base text-[#6E6E73] mt-2">
          What to train on your next visit, based on what you've worked and what's recovered.
        </p>
      </div>

      {/* Next session: from the plan when there is one */}
      {upcoming ? (
        <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col gap-6">
          <div>
            <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#34C759]" />
              Next session
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] mt-1">
              {upcoming.day.name}
              {upcoming.day.exercises.length > 0 && (
                <span className="text-[#6E6E73] font-semibold"> · {joinAmp(dayGroups(upcoming.day))}</span>
              )}
            </h2>
            <p className="text-base text-[#6E6E73] mt-2 leading-relaxed max-w-3xl">
              {upcomingReason(upcoming, recovery, fit?.name ?? null)}
            </p>
          </div>

          {upcoming.day.exercises.length > 0 && (
            <div className="bg-white rounded-2xl divide-y divide-black/[0.04] overflow-hidden">
              {upcoming.day.exercises.map((e, i) => {
                const info = planExerciseInfo(e.exerciseKey);
                return (
                  <div key={e.id} className="p-4 flex items-center gap-4">
                    <NumberBadge n={i + 1} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1D1D1F] truncate">{info.name}</p>
                      <p className="text-xs text-[#6E6E73] truncate">{muscleList(info.primary)}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-[#1D1D1F] shrink-0">{formatTarget(e)}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-[#6E6E73] flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 shrink-0" />
              The gym cameras count your reps as you go, so there's nothing to log.
            </p>
            <button
              onClick={() => document.getElementById('my-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="inline-flex items-center gap-1 min-h-11 text-sm font-medium text-[#1D1D1F] hover:text-[#34C759] cursor-pointer shrink-0 self-start sm:self-auto"
            >
              Edit plan
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
      <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col gap-6">
        <div>
          <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#34C759]" />
            Next session
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] mt-1">
            {session.title}
            <span className="text-[#6E6E73] font-semibold"> · {session.subtitle}</span>
          </h2>
          <p className="text-base text-[#6E6E73] mt-2 leading-relaxed max-w-3xl">{session.reason}</p>
        </div>

        {session.exercises.length > 0 && (
          <div className="bg-white rounded-2xl divide-y divide-black/[0.04] overflow-hidden">
            {session.exercises.map((ex, i) => (
              <ExerciseRow key={ex.id} exercise={ex} badge={<NumberBadge n={i + 1} />} />
            ))}
            {session.finisher && (
              <ExerciseRow
                exercise={session.finisher}
                badge={
                  <span className="px-2 h-7 rounded-full bg-[#34C759]/10 text-[10px] font-semibold text-[#1E8E3E] uppercase tracking-wide flex items-center shrink-0">
                    Finisher
                  </span>
                }
              />
            )}
          </div>
        )}

        <p className="text-xs text-[#6E6E73] flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 shrink-0" />
          The gym cameras count your reps as you go, so there's nothing to log.
        </p>
      </div>
      )}

      {/* Recovery map: tap a muscle to see exercises for it */}
      <div className="bg-[#F5F5F7] rounded-[24px] p-6 sm:p-8 flex flex-col gap-6">
        <div>
          <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">Recovery</span>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">What's ready to train</h3>
          <p className="text-sm text-[#6E6E73] mt-1 max-w-2xl">
            {thisWeek.length
              ? `This week you trained ${joinList(thisWeek.map(dayName))}.`
              : 'No workouts logged this week.'}{' '}
            Red muscles still need rest, green ones are ready. Tap a muscle to see exercises that fit.
          </p>
          {fit && fitReadiness && (
            <p className="mt-3 inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 px-3 py-2 rounded-xl bg-white text-sm text-[#1D1D1F]">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${fitReadiness.recovering.length ? 'bg-[#FF9500]' : 'bg-[#34C759]'}`}
                aria-hidden="true"
              />
              Best fit from your plan today: <span className="font-semibold">{fit.name}</span>
              <span className="text-[#6E6E73]">
                ·{' '}
                {fitReadiness.recovering.length
                  ? `${fitReadiness.recovering.length} of its muscles still recovering`
                  : 'everything it trains is recovered'}
              </span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-8 items-start">
          <BodyMap {...recoveryMapProps(recovery)} size="md" selectedMuscle={muscle} onSelectMuscle={setPickedMuscle} />
          <MusclePanel key={muscle} muscle={muscle} recovery={recovery} history={history} />
        </div>
      </div>

      {/* The member's editable plan */}
      <section id="my-plan" className="bg-[#F5F5F7] rounded-[24px] p-4 sm:p-8 flex flex-col gap-5 scroll-mt-20">
        <div className="px-2 sm:px-0 pt-2 sm:pt-0">
          <span className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide">Your rotation</span>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">My plan</h3>
        </div>
        <MyPlan plan={plan} onChange={setPlan} upcomingDayId={upcoming?.day.id ?? null} recovery={recovery} />
      </section>

      <p className="text-xs text-[#86868B] text-center">
        Suggestions use simplified recovery estimates and are not medical advice.
      </p>
    </div>
  );
};
