import React, { useMemo } from 'react';
import { Activity, CalendarCheck, History, LucideIcon, Play } from 'lucide-react';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MEMBER_PROFILE } from '../mocks/memberData';
import { MuscleId, PastWorkout } from '../types/schema';
import { PipelinePerson } from '../services/pipelineAdapter';
import { DEMO_TODAY, trackedSeconds, workoutMuscles } from '../services/memberSession';
import { MUSCLE_NAMES } from '../data/exerciseMuscles';
import { BodyMap } from './BodyMap';
import { TabId } from './Navigation';
import { joinList } from '../services/nextSession';
import { HATCH, HatchDefs } from '../gyms/components/ui';
import { IconDot, OpenArrow, TILE_TONES, TileTone } from './Tile';

interface MainTabProps {
  person: PipelinePerson;
  /** Today's camera-tracked session first, then older workouts */
  history: PastWorkout[];
  onWatchReplay: () => void;
  onSelectTab: (tab: TabId) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const formatDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const formatSeconds = (s: number) => (s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

/** Shortcut tile in the reference's 2×2 style: icon top-left, open arrow top-right, value and label at the bottom. */
const Tile: React.FC<{
  icon: LucideIcon;
  tone: TileTone;
  value?: React.ReactNode;
  label: string;
  note?: string;
  onClick: () => void;
}> = ({ icon, tone, value, label, note, onClick }) => (
  <button onClick={onClick} className={`group text-left p-5 flex flex-col min-h-[190px] cursor-pointer ${TILE_TONES[tone]}`}>
    <span className="flex w-full items-start justify-between text-ink">
      <IconDot icon={icon} tone={tone} />
      <OpenArrow />
    </span>
    <span className="mt-auto pt-6 flex flex-col">
      {value !== undefined && <span className="num text-5xl text-ink">{value}</span>}
      <span className={`text-ink leading-snug ${value !== undefined ? 'text-sm font-medium mt-2' : 'text-lg font-medium'}`}>{label}</span>
      {note && <span className="text-xs text-ink-2 mt-0.5">{note}</span>}
    </span>
  </button>
);

export const MainTab: React.FC<MainTabProps> = ({ person, history, onWatchReplay, onSelectTab }) => {
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
  const latestSets = latest.exercises.reduce((sum, e) => sum + e.sets, 0);

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
    <div className="flex flex-col gap-4 pb-16 animate-in fade-in duration-200">
      <header className="pt-4 pb-4">
        <p className="text-sm font-medium text-ink-2">{MEMBER_PROFILE.gymName}</p>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-medium tracking-tight text-ink leading-[1.02] mt-2">
          Welcome back, {MEMBER_PROFILE.name}
        </h1>
        <p className="glass mt-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs text-ink-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          Today is a real gym clip. Older history is sample data.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Latest session: only while it's fresh (today or yesterday) */}
        {latestLabel && (
          <section className="panel lg:col-span-7 p-6 sm:p-7 flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-medium text-ink">{latestLabel}'s session</h2>
                <p className="hud-label mt-0.5">Logged by the gym camera</p>
              </div>
              <button onClick={onWatchReplay} aria-label="Watch how we counted" className="group text-ink cursor-pointer">
                <OpenArrow />
              </button>
            </div>
            <dl className="grid grid-cols-3 gap-3">
              <div className="flex flex-col-reverse">
                <dt className="text-sm text-ink-2 mt-1.5">reps</dt>
                <dd className="num text-4xl sm:text-6xl text-ink">{latest.total_reps}</dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="text-sm text-ink-2 mt-1.5">{latestSets === 1 ? 'set' : 'sets'}</dt>
                <dd className="num text-4xl sm:text-6xl text-accent-ink">{latestSets}</dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="text-sm text-ink-2 mt-1.5">on camera</dt>
                <dd className="num text-4xl sm:text-6xl text-ink">{formatSeconds(trackedSeconds(person))}</dd>
              </div>
            </dl>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <BodyMap values={latestMuscles} mode="intensity" size="md" />
              <div className="flex flex-col gap-2">
                <h3 className="font-display text-2xl font-medium tracking-tight text-ink">
                  {latest.total_reps === 0
                    ? 'No sets detected'
                    : topMuscles.length
                    ? `${joinList(topMuscles.map((m, i) => (i ? m.toLowerCase() : m)))} worked`
                    : 'No muscle load yet'}
                </h3>
                <p className="text-[15px] text-ink-2 leading-relaxed">
                  {latest.total_reps === 0
                    ? `You were on camera for ${formatSeconds(trackedSeconds(person))}. Sets show up here as soon as Spottr sees a repeated movement.`
                    : latest.recap || '…'}
                </p>
              </div>
            </div>
          </section>
        )}

        <div className={`grid grid-cols-2 gap-4 ${latestLabel ? 'lg:col-span-5' : 'lg:col-span-12 lg:grid-cols-4'}`}>
          <Tile
            icon={Play}
            tone="blue"
            label={latest.total_reps > 0 ? 'Watch how we counted' : 'Watch the footage'}
            note="The clip, rep by rep"
            onClick={onWatchReplay}
          />
          <Tile icon={CalendarCheck} tone="lime" value={sessionsThisWeek} label="sessions this week" onClick={() => onSelectTab('plan')} />
          <Tile icon={History} tone="glass" value={reps30} label="reps in 30 days" onClick={() => onSelectTab('history')} />
          <Tile icon={Activity} tone="glass" label="Recovery" note="What's ready to train" onClick={() => onSelectTab('recovery')} />
        </div>

        {/* Last 30 days */}
        <section className="panel lg:col-span-12 p-6 sm:p-7 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="hud-label">Last 30 days · {sessions30} sessions</span>
              <h2 className="text-xl font-medium text-ink mt-0.5">Reps per day</h2>
            </div>
            <div className="text-right">
              <p className="num text-4xl text-ink"><span className="marker">{todayReps}</span></p>
              <p className="text-xs text-ink-2 mt-1">reps today</p>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activity} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barCategoryGap="28%">
                <HatchDefs />
                <XAxis dataKey="label" interval={6} stroke="#636B7E" fontSize={11} tickLine={false} axisLine={false} dy={6} />
                <YAxis stroke="#636B7E" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
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
                <Bar dataKey="reps" radius={999} maxBarSize={14} background={{ fill: HATCH, radius: 999 }}>
                  {activity.map((d) => (
                    <Cell key={d.key} fill={d.isToday ? '#4D80FF' : '#CDD3DE'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-ink-2 -mt-1 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent" />
              Today, from the camera clip
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#CDD3DE]" />
              Sample history
            </span>
          </p>
        </section>
      </div>
    </div>
  );
};
