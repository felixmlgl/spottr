import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Award, ChevronRight, Info, Play, X } from 'lucide-react';
import { PastWorkout } from '../types/schema';
import { BodyMap } from './BodyMap';
import { isSampleWorkout, workoutMuscles } from '../services/memberSession';

interface HistoryTabProps {
  /** Today's camera-tracked session first, then older workouts */
  workouts: PastWorkout[];
  todayRecap: string;
  onWatchReplay: () => void;
}

interface ExerciseStats {
  id: string;
  name: string;
  /** Oldest first */
  points: { date: string; reps: number; label: string; sample: boolean }[];
  best: { reps: number; date: string; sample: boolean };
  doneToday: boolean;
}

/** Exercises the pipeline has actually been tested on; they lead the trend and bests over sample-only ones */
const TESTED_EXERCISES = new Set(['squat', 'dip']);

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Per-exercise reps per session, derived from the history itself so bests and trends always match the log. */
function exerciseStats(workouts: PastWorkout[]): ExerciseStats[] {
  const byId = new Map<string, ExerciseStats>();
  [...workouts].reverse().forEach((w) => {
    const sample = isSampleWorkout(w);
    const date = sample ? formatDate(w.date) : 'Today';
    for (const ex of w.exercises) {
      const stats = byId.get(ex.exercise_id) ?? {
        id: ex.exercise_id,
        name: ex.name,
        points: [],
        best: { reps: 0, date, sample },
        doneToday: false,
      };
      stats.points.push({ date, reps: ex.total_reps, label: `${ex.sets} sets: ${ex.reps_per_set.join(' / ')}`, sample });
      if (ex.total_reps >= stats.best.reps) stats.best = { reps: ex.total_reps, date, sample };
      if (!sample) {
        stats.doneToday = true;
        stats.name = ex.name;
      }
      byId.set(ex.exercise_id, stats);
    }
  });
  // Today's exercises first, then tested ones, then the most frequent
  const rank = (e: ExerciseStats) => [Number(e.doneToday), Number(TESTED_EXERCISES.has(e.id)), e.points.length];
  return [...byId.values()].sort((a, b) => {
    const [ra, rb] = [rank(a), rank(b)];
    return rb[0] - ra[0] || rb[1] - ra[1] || rb[2] - ra[2];
  });
}

const SampleTag: React.FC = () => (
  <span className="hud-label text-ink-3">Sample</span>
);

export const HistoryTab: React.FC<HistoryTabProps> = ({ workouts, todayRecap, onWatchReplay }) => {
  const [selectedWorkout, setSelectedWorkout] = useState<PastWorkout | null>(null);

  const stats = useMemo(() => exerciseStats(workouts), [workouts]);
  // A trend needs at least two sessions
  const trendOptions = stats.filter((e) => e.points.length >= 2).slice(0, 3);
  const [pickedExercise, setPickedExercise] = useState<string | null>(null);
  const trend = trendOptions.find((e) => e.id === pickedExercise) ?? trendOptions[0];
  const bests = stats.slice(0, 3);

  const latest = workouts[0];
  const weekGroups = Array.from(new Set(workouts.map((w) => w.week_group)));
  const isToday = (w: PastWorkout) => w.id === latest.id;

  return (
    <div className="flex flex-col gap-10 pb-16 animate-in fade-in duration-200">
      <div className="pt-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">History</h1>
        <p className="text-base text-ink-2 mt-2">
          {workouts.length} sessions logged over the past 4 weeks.
        </p>
      </div>

      <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-surface text-sm text-ink-2">
        <Info className="w-4 h-4 text-[#0071E3] shrink-0 mt-0.5" />
        <span>
          Only today's session comes from the camera clip. Older sessions are sample data that show what a few weeks of
          history look like. So far the pipeline has been tested on squats and dips only.
        </span>
      </div>

      {/* Progress */}
      <div className="panel p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="hud-label">Volume trend</span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-ink mt-0.5">Reps per session</h3>
          </div>
          {trendOptions.length > 1 && (
            <div className="flex items-center p-1 bg-white rounded-full shadow-xs self-start sm:self-auto overflow-x-auto max-w-full">
              {trendOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPickedExercise(opt.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    trend?.id === opt.id ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'
                  }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend?.points ?? []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#646E68" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis
                stroke="#646E68"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 4', 'dataMax + 4']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white rounded-xl p-3 shadow-lg ring-1 ring-black/[0.04]">
                      <p className="text-xs text-ink-2">
                        {d.date}
                        {d.sample ? ' · sample' : ' · camera tracked'}
                      </p>
                      <p className="text-sm font-bold text-ink mt-0.5">{d.reps} reps</p>
                      <p className="text-[11px] text-ink-2 font-medium">{d.label}</p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="reps"
                stroke="#4D80FF"
                strokeWidth={2}
                dot={{ r: 4, fill: '#FFFFFF', stroke: '#4D80FF', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#4D80FF', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-black/[0.05]">
          {bests.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl p-4">
              <span className="hud-label flex items-center gap-1">
                <span className="w-5 h-5 rounded-full bg-lime text-ink flex items-center justify-center">
                  <Award className="w-3 h-3" />
                </span>
                Best · {e.best.date}
              </span>
              <p className="text-sm font-semibold text-ink mt-1">{e.name}</p>
              <p className="text-2xl font-bold tracking-tight text-ink flex items-baseline gap-2">
                {e.best.reps} reps
                {e.best.sample && <SampleTag />}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Workout list */}
      <div className="flex flex-col gap-8">
        {weekGroups.map((group) => (
          <div key={group} className="flex flex-col gap-3">
            <h3 className="hud-label px-2">{group}</h3>
            <div className="panel divide-y divide-black/[0.04] overflow-hidden">
              {workouts
                .filter((w) => w.week_group === group)
                .map((workout) => (
                  <button
                    key={workout.id}
                    onClick={() => setSelectedWorkout(workout)}
                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-black/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-base font-semibold text-ink flex items-center gap-2">
                        {workout.display_date}
                        {isToday(workout) ? (
                          <span className="hud-label text-accent">
                            Camera tracked
                          </span>
                        ) : (
                          isSampleWorkout(workout) && <SampleTag />
                        )}
                      </span>
                      <p className="text-sm text-ink-2 truncate mt-0.5">
                        {workout.exercises.map((e) => e.name).join(', ') || 'No sets detected'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-semibold text-ink block">{workout.total_reps} reps</span>
                        <span className="text-xs text-ink-2">{workout.duration_minutes} min</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-2" />
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Workout detail sheet */}
      {selectedWorkout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedWorkout(null)}
        >
          <div
            className="bg-white rounded-[28px] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 flex flex-col gap-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="hud-label">Session detail</span>
                <h2 className="text-2xl font-bold tracking-tight text-ink mt-0.5">{selectedWorkout.display_date}</h2>
              </div>
              <button
                onClick={() => setSelectedWorkout(null)}
                aria-label="Close"
                className="p-2 rounded-full bg-surface hover:bg-surface-2 text-ink-2 hover:text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 panel p-4 text-center">
              <div>
                <span className="text-xs text-ink-2 block">Total reps</span>
                <span className="num text-4xl text-accent-ink">{selectedWorkout.total_reps}</span>
              </div>
              <div>
                <span className="text-xs text-ink-2 block">Duration</span>
                <span className="num text-4xl text-ink">
                  {selectedWorkout.duration_minutes}
                  <span className="font-sans text-sm font-normal text-ink-2 ml-1">min</span>
                </span>
              </div>
            </div>

            {selectedWorkout.exercises.length > 0 && (
              <div className="panel divide-y divide-black/[0.04] overflow-hidden">
                {selectedWorkout.exercises.map((ex, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-ink">{ex.name}</h4>
                      <p className="text-xs text-ink-2 mt-0.5">Sets: {ex.reps_per_set.join(' / ')} reps</p>
                    </div>
                    <span className="text-sm font-semibold text-ink">{ex.total_reps} reps</span>
                  </div>
                ))}
              </div>
            )}

            <div className="panel p-5 flex flex-col items-center gap-3">
              <span className="hud-label self-start">
                Muscles targeted
              </span>
              <BodyMap values={workoutMuscles(selectedWorkout)} mode="intensity" size="sm" />
            </div>

            {isToday(selectedWorkout) && todayRecap && (
              <div className="panel p-5">
                <p className="text-sm text-ink leading-relaxed">{todayRecap}</p>
              </div>
            )}

            {isSampleWorkout(selectedWorkout) && (
              <p className="text-xs text-ink-2 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                Sample session for the demo, not tracked by a camera.
              </p>
            )}

            {isToday(selectedWorkout) ? (
              <button
                onClick={onWatchReplay}
                className="w-full py-3 rounded-full bg-ink hover:bg-black text-white text-sm font-medium cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Watch how we counted
              </button>
            ) : (
              <button
                onClick={() => setSelectedWorkout(null)}
                className="w-full py-3 rounded-full bg-ink hover:bg-black text-white text-sm font-medium cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
