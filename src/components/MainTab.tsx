import React, { useMemo } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MEMBER_PROFILE } from '../mocks/memberData';
import { MuscleId, PastWorkout } from '../types/schema';
import { PipelinePerson } from '../services/pipelineAdapter';
import { DEMO_TODAY, trackedSeconds, workoutMuscles } from '../services/memberSession';
import { MUSCLE_NAMES } from '../data/exerciseMuscles';
import { BodyMap } from './BodyMap';
import { joinList } from '../services/nextSession';

interface MainTabProps {
  person: PipelinePerson;
  /** Today's camera-tracked session first, then older workouts */
  history: PastWorkout[];
  onWatchReplay: () => void;
  onOpenHistory: () => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const formatDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const formatSeconds = (s: number) => (s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

export const MainTab: React.FC<MainTabProps> = ({ person, history, onWatchReplay, onOpenHistory }) => {
  const latest = history[0];
  const latestMuscles = workoutMuscles(latest);
  const topMuscles = (Object.entries(latestMuscles) as [MuscleId, number][])
    .filter(([, v]) => v >= 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => MUSCLE_NAMES[m]);
  const daysAgo = Math.round(
    (new Date(`${DEMO_TODAY}T00:00:00Z`).getTime() - new Date(`${latest.date}T00:00:00Z`).getTime()) / DAY_MS
  );
  const latestLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : null;

  // Reps per day for the 30 days ending on the demo's "today"
  const activity = useMemo(() => {
    const end = new Date(`${DEMO_TODAY}T00:00:00Z`).getTime();
    const repsByDate = new Map<string, number>();
    history.forEach((w) => repsByDate.set(w.date, (repsByDate.get(w.date) || 0) + w.total_reps));
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(end - (29 - i) * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      return { key, label: formatDay(d), reps: repsByDate.get(key) || 0, isToday: key === DEMO_TODAY };
    });
  }, [history]);

  const sessions30 = activity.filter((d) => d.reps > 0).length;
  const reps30 = activity.reduce((sum, d) => sum + d.reps, 0);
  const sessionsThisWeek = activity.slice(-7).filter((d) => d.reps > 0).length;
  const todayReps = activity[activity.length - 1].reps;

  return (
    <div className="flex flex-col gap-8 pb-16 animate-in fade-in duration-200">
      <div className="pt-4">
        <p className="text-sm font-medium text-ink-2 tracking-wide mb-1">{MEMBER_PROFILE.gymName}</p>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-ink leading-[1.08]">
          Welcome back, {MEMBER_PROFILE.name}
        </h1>
        <p className="text-base text-ink-2 mt-2">Your session was logged automatically by the gym cameras.</p>
        <p className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface text-xs text-ink-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          Demo: today is a recorded gym clip run through the real Spottr pipeline. Older history is sample data.
        </p>
      </div>

      {/* Latest session overview: only while it's fresh (today or yesterday) */}
      {latestLabel && (
        <div className="panel p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col gap-3">
            <span className="hud-label">{latestLabel}, from the gym camera</span>
            {latest.total_reps > 0 && (
              <p className="flex items-baseline gap-3">
                <span className="font-dot text-7xl sm:text-8xl font-black leading-none text-ink">{latest.total_reps}</span>
                <span className="text-lg font-semibold text-ink-2">reps</span>
              </p>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              {latest.total_reps === 0
                ? 'No sets detected'
                : topMuscles.length
                ? `${joinList(topMuscles.map((m, i) => (i ? m.toLowerCase() : m)))} worked`
                : 'No muscle load yet'}
            </h2>
            <div className="pt-3 border-t border-black/[0.06] flex flex-col gap-2">
              <span className="hud-label">Recap</span>
              <p className="text-base text-ink leading-relaxed">
                {latest.total_reps === 0
                  ? `You were on camera for ${formatSeconds(trackedSeconds(person))}. Sets show up here as soon as Spottr sees a repeated movement.`
                  : latest.recap || '…'}
              </p>
            </div>
            <button
              onClick={onWatchReplay}
              className="self-start mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-surface-2 text-sm font-medium text-ink shadow-2xs cursor-pointer transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {latest.total_reps > 0 ? 'Watch how we counted' : 'Watch the footage'}
            </button>
          </div>
          <BodyMap values={latestMuscles} mode="intensity" size="md" />
        </div>
      )}

      {/* Last 30 days */}
      <div className="panel p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="hud-label">Last 30 days</span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-ink mt-0.5">Reps per day</h3>
          </div>
          <button
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-accent cursor-pointer shrink-0 pt-1"
          >
            See history
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-md bg-white px-3 py-2 ring-1 ring-accent/40">
            <p className="hud-label text-accent-ink">Today</p>
            <p className="font-dot text-3xl font-black text-ink">
              {todayReps}
              <span className="font-sans text-sm font-normal text-ink-2 ml-1">reps</span>
            </p>
          </div>
          <div className="px-3 py-2">
            <p className="hud-label">Sessions</p>
            <p className="font-dot text-3xl font-black text-ink">{sessions30}</p>
          </div>
          <div className="px-3 py-2">
            <p className="hud-label">Total reps</p>
            <p className="font-dot text-3xl font-black text-ink">{reps30}</p>
          </div>
          <div className="px-3 py-2">
            <p className="hud-label">This week</p>
            <p className="font-dot text-3xl font-black text-ink">
              {sessionsThisWeek}
              <span className="font-sans text-sm font-normal text-ink-2 ml-1">sessions</span>
            </p>
          </div>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activity} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barCategoryGap={2}>
              <XAxis
                dataKey="label"
                interval={6}
                stroke="#646E68"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#D3D8D3' }}
                dy={6}
              />
              <YAxis stroke="#646E68" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof activity)[number];
                  return (
                    <div className="bg-white rounded-xl px-3 py-2 shadow-lg ring-1 ring-black/[0.04]">
                      <p className="text-xs text-ink-2">{d.isToday ? `Today · ${d.label}` : d.label}</p>
                      <p className="text-sm font-bold text-ink">{d.reps ? `${d.reps} reps` : 'Rest day'}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="reps" radius={[4, 4, 0, 0]} maxBarSize={14}>
                {activity.map((d) => (
                  <Cell key={d.key} fill={d.isToday ? '#34C759' : '#B4BCB6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-ink-2 -mt-2 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-accent" />
            Today, from the camera clip
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-[#B4BCB6]" />
            Sample history
          </span>
        </p>
      </div>
    </div>
  );
};
