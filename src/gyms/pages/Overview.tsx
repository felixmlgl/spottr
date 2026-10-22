import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DoorOpen, Dumbbell, Gauge, LucideIcon, Repeat, UserMinus, Users } from 'lucide-react';
import { Link } from '../../router';
import {
  DAY_LABELS,
  DAY_NAMES,
  formatHour,
  GYM,
  Insight,
  INSIGHTS,
  Kpi,
  KPIS,
  PEAK_HOURS,
  WEEKLY_VISITS,
} from '../../mocks/gym';
import { InfoTip } from '../../components/Disclosure';
import { FloorStatus, NOW_SLOT_LABEL, ZONES_NOW } from '../components/FloorNow';
import { IconDot, OpenArrow, TILE_TONES, TileTone } from '../../components/Tile';
import {
  axisProps,
  ChartTooltip,
  DemoBadge,
  Eyebrow,
  GRID,
  HATCH,
  HatchDefs,
  highlightBar,
  Segmented,
  TrendChip,
} from '../components/ui';

const INSIGHT_LABELS: Record<Insight['id'], string> = {
  capacity: 'Capacity',
  retention: 'Retention',
  equipment: 'Equipment',
};

const INSIGHT_ICONS: Record<Insight['id'], LucideIcon> = { capacity: Gauge, retention: UserMinus, equipment: Dumbbell };

const formatKpi = (kpi: Kpi) => (kpi.format === 'decimal' ? kpi.value.toFixed(1) : kpi.value.toLocaleString('en-US'));
const pct = (v: number) => `${Math.round(v * 100)}%`;

const KPI = Object.fromEntries(KPIS.map((k) => [k.id, k])) as Record<string, Kpi>;

/** KPI tile in the reference's 2×2 style: icon top-left, open arrow top-right, number and label at the bottom. */
const KpiTile: React.FC<{ kpi: Kpi; icon: LucideIcon; to?: string; tone: TileTone }> = ({ kpi, icon, to, tone }) => {
  const toneClass = TILE_TONES[tone];
  const body = (
    <>
      <div className="flex items-start justify-between">
        <IconDot icon={icon} tone={tone} />
        {to && <OpenArrow className="text-ink" />}
      </div>
      <div className="mt-auto pt-8">
        {kpi.id === 'now' && (
          <span className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full bg-lime text-xs font-semibold text-[#0E1117]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0E1117] animate-pulse" />
            Live
          </span>
        )}
        <p className="num text-5xl text-ink">{formatKpi(kpi)}</p>
        <p className="text-sm font-medium text-ink mt-2 leading-snug">{kpi.label}</p>
        <TrendChip value={kpi.value} previous={kpi.previous} comparison={kpi.comparison} />
      </div>
    </>
  );
  const className = `group p-5 sm:p-6 flex flex-col min-h-[220px] ${toneClass}`;
  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
};

/** Zone list in the style of the reference's scorecard: timeline dots, a striped track with a pill fill, value. */
const ZoneScorecard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <section className={`panel p-6 sm:p-7 flex flex-col gap-5 ${className}`}>
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-medium text-ink">Zones right now</h2>
        <p className="hud-label mt-0.5 flex items-center gap-1">
          In use, typical for this hour
          <InfoTip label="How this is measured">4-week average for {NOW_SLOT_LABEL}.</InfoTip>
        </p>
      </div>
      <Link to="/gyms/floor" aria-label="Open the floor" className="group">
        <OpenArrow className="text-ink" />
      </Link>
    </div>
    <ol className="relative flex flex-col gap-4 before:absolute before:left-[3px] before:top-2 before:bottom-2 before:w-px before:bg-line">
      {ZONES_NOW.map(({ zone, occ }) => {
        const tone = occ >= 1 ? 'bg-coral' : occ >= 0.5 ? 'bg-amber' : 'bg-lime';
        return (
          <li key={zone.id} className="relative grid grid-cols-[7px_7.5rem_1fr_3rem] items-center gap-3">
            <span className={`w-[7px] h-[7px] rounded-full ring-4 ring-white/70 ${tone}`} />
            <span className="text-sm text-ink truncate">{zone.name}</span>
            <span className="relative h-3.5 rounded-full hatch overflow-hidden">
              <span className={`absolute inset-y-0 left-0 rounded-full ${tone}`} style={{ width: `${Math.max(occ, 0.04) * 100}%` }} />
            </span>
            <span className="text-sm font-medium text-ink text-right tabular-nums">{pct(occ)}</span>
          </li>
        );
      })}
    </ol>
    <p className="text-xs text-ink-2 mt-auto flex items-center gap-3 flex-wrap">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-coral" /> Full
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber" /> Busy
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-lime ring-1 ring-black/15" /> Room to train
      </span>
    </p>
  </section>
);

const WeeklyVisitsChart: React.FC<{ className?: string }> = ({ className = '' }) => {
  const current = WEEKLY_VISITS[WEEKLY_VISITS.length - 1];
  const average = Math.round(WEEKLY_VISITS.reduce((s, w) => s + w.visits, 0) / WEEKLY_VISITS.length);
  return (
    <section className={`panel p-6 sm:p-7 flex flex-col gap-4 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>Last 12 weeks</Eyebrow>
          <h2 className="text-xl font-medium text-ink mt-0.5">Weekly visits</h2>
        </div>
        <div className="text-right">
          <p className="num text-4xl text-ink"><span className="marker">{current.visits.toLocaleString('en-US')}</span></p>
          <p className="text-xs text-ink-2 mt-1">this week · avg. {average.toLocaleString('en-US')}</p>
        </div>
      </div>
      <div className="h-60 w-full" role="img" aria-label={`Weekly visits over 12 weeks, from ${WEEKLY_VISITS[0].visits} to ${current.visits} this week`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={WEEKLY_VISITS} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barCategoryGap="30%">
            <HatchDefs />
            <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 4" />
            <XAxis dataKey="label" {...axisProps} fontSize={11} interval="preserveStartEnd" minTickGap={16} dy={6} />
            <YAxis {...axisProps} width={44} tickFormatter={(v: number) => v.toLocaleString('en-US')} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof WEEKLY_VISITS)[number];
                return (
                  <ChartTooltip
                    title={`Week of ${d.label}`}
                    value={`${d.visits.toLocaleString('en-US')} visits`}
                    note={d.isCurrent ? 'This week' : undefined}
                  />
                );
              }}
            />
            <Bar
              dataKey="visits"
              radius={999}
              background={{ fill: HATCH, radius: 999 }}
              shape={highlightBar((i) => WEEKLY_VISITS[i].isCurrent)}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

const PeakHoursChart: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [day, setDay] = useState(0);
  const data = PEAK_HOURS[day];
  const peak = data.reduce((best, d) => (d.people > best.people ? d : best), data[0]);
  return (
    <section className={`panel p-6 sm:p-7 flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Eyebrow>Avg. of last 4 weeks</Eyebrow>
            <h2 className="text-xl font-medium text-ink mt-0.5">Peak hours</h2>
          </div>
          <div className="text-right">
            <p className="num text-4xl text-ink"><span className="marker">{formatHour(peak.hour)}</span></p>
            <p className="text-xs text-ink-2 mt-1">
              {DAY_NAMES[day]} peak · ~{peak.people} on the floor
            </p>
          </div>
        </div>
        <Segmented
          ariaLabel="Day of week"
          options={DAY_LABELS.map((label, i) => ({ id: i, label }))}
          value={day}
          onChange={setDay}
          className="self-start"
        />
      </div>
      <div className="flex-1 min-h-52 w-full" role="img" aria-label={`Members on the floor by hour on ${DAY_NAMES[day]}; peak ${peak.people} at ${formatHour(peak.hour)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 0, left: -24, bottom: 0 }} barCategoryGap="22%">
            <HatchDefs id="hatch-peak" />
            <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 4" />
            <XAxis dataKey="hour" {...axisProps} fontSize={11} tickFormatter={formatHour} interval={2} dy={6} />
            <YAxis {...axisProps} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof data)[number];
                return (
                  <ChartTooltip
                    title={`${DAY_LABELS[day]} ${formatHour(d.hour)}–${formatHour(d.hour + 1)}`}
                    value={`~${d.people} members on the floor`}
                  />
                );
              }}
            />
            <Bar
              dataKey="people"
              radius={999}
              background={{ fill: 'url(#hatch-peak)', radius: 999 }}
              shape={highlightBar((i) => data[i].hour === peak.hour)}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

const InsightsCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <section className={`panel p-6 sm:p-7 flex flex-col gap-4 ${className}`}>
    <div>
      <Eyebrow>Insights</Eyebrow>
      <h2 className="text-xl font-medium text-ink mt-0.5">What Spottr noticed this week</h2>
    </div>
    <ul className="flex flex-col gap-2">
      {INSIGHTS.map((insight) => (
        <li key={insight.id}>
          <Link
            to={insight.link.to}
            className="group flex items-start gap-4 p-4 rounded-[22px] bg-white/65 ring-1 ring-white transition-colors hover:bg-white"
          >
            <IconDot icon={INSIGHT_ICONS[insight.id]} className="bg-accent/10 text-accent-ink" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-accent-ink">{INSIGHT_LABELS[insight.id]}</span>
              <h3 className="text-[15px] font-semibold text-ink leading-snug">{insight.title}</h3>
              <p className="text-sm text-ink-2 mt-1 leading-relaxed line-clamp-2">{insight.body}</p>
            </div>
            <OpenArrow className="text-ink-2" />
          </Link>
        </li>
      ))}
    </ul>
  </section>
);

export const Overview: React.FC = () => (
  <div className="flex flex-col gap-4 pb-16">
    <header className="pt-4 pb-4">
      <div className="flex items-center gap-2 flex-wrap text-sm font-medium text-ink-2">
        {GYM.name} · {GYM.city.replace(', CA', '')}
        <DemoBadge />
      </div>
      <h1 className="text-5xl sm:text-6xl font-medium tracking-tight text-ink mt-2">Overview</h1>
      <p className="text-base text-ink-2 mt-3 max-w-xl">
        Sunday, Sep 27 · 10:45am · from your existing cameras
      </p>
    </header>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <FloorStatus className="lg:col-span-5" to="/gyms/floor" />
      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiTile kpi={KPI.now} icon={Users} to="/gyms/floor" tone="blue" />
        <KpiTile kpi={KPI.visits} icon={DoorOpen} to="/gyms/members" tone="glass" />
        <KpiTile kpi={KPI.frequency} icon={Repeat} to="/gyms/members" tone="glass" />
        <KpiTile kpi={KPI.sets} icon={Dumbbell} tone="lime" />
      </div>

      <WeeklyVisitsChart className="lg:col-span-7" />
      <ZoneScorecard className="lg:col-span-5" />

      <PeakHoursChart className="lg:col-span-6" />
      <InsightsCard className="lg:col-span-6" />
    </div>
  </div>
);
