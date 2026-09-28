import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronRight, Dumbbell, Gauge, UserMinus, Users, Activity, Repeat, LucideIcon } from 'lucide-react';
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
import {
  axisProps,
  Card,
  ChartTooltip,
  DemoBadge,
  Eyebrow,
  GRID,
  highlightBar,
  PageHeader,
  Segmented,
  TrendChip,
} from '../components/ui';

const KPI_ICONS: Record<string, LucideIcon> = {
  now: Users,
  visits: Activity,
  frequency: Repeat,
  sets: Dumbbell,
};

const INSIGHT_ICONS: Record<Insight['id'], LucideIcon> = {
  capacity: Gauge,
  retention: UserMinus,
  equipment: Dumbbell,
};

const formatKpi = (kpi: Kpi) => (kpi.format === 'decimal' ? kpi.value.toFixed(1) : kpi.value.toLocaleString('en-US'));

const KpiCard: React.FC<{ kpi: Kpi }> = ({ kpi }) => {
  const Icon = KPI_ICONS[kpi.id];
  return (
    <div className="bg-[#F5F5F7] rounded-[24px] p-6 flex flex-col justify-between gap-4">
      <div className="flex items-start justify-between gap-3 text-[#6E6E73]">
        <span className="text-xs font-semibold uppercase tracking-wide leading-snug">{kpi.label}</span>
        <Icon className="w-4 h-4 stroke-[1.75] shrink-0" />
      </div>
      <div>
        <p className="text-4xl font-bold tracking-tight text-[#1D1D1F] flex items-center gap-2">
          {formatKpi(kpi)}
          {kpi.id === 'now' && (
            <span className="relative flex w-2.5 h-2.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#34C759] opacity-60 animate-ping" />
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-[#34C759]" />
            </span>
          )}
        </p>
        <TrendChip value={kpi.value} previous={kpi.previous} comparison={kpi.comparison} />
      </div>
    </div>
  );
};

const WeeklyVisitsChart: React.FC = () => {
  const current = WEEKLY_VISITS[WEEKLY_VISITS.length - 1];
  const average = Math.round(WEEKLY_VISITS.reduce((s, w) => s + w.visits, 0) / WEEKLY_VISITS.length);
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <Eyebrow>Last 12 weeks</Eyebrow>
        <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">Weekly visits</h2>
        <p className="text-xs text-[#6E6E73] mt-1">
          This week <span className="font-semibold text-[#1D1D1F]">{current.visits.toLocaleString('en-US')}</span> · 12-week
          average {average.toLocaleString('en-US')}
        </p>
      </div>
      <div className="h-64 w-full" role="img" aria-label={`Weekly visits over 12 weeks, from ${WEEKLY_VISITS[0].visits} to ${current.visits} this week`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={WEEKLY_VISITS} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barCategoryGap="36%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" {...axisProps} fontSize={11} interval="preserveStartEnd" minTickGap={16} dy={6} />
            <YAxis {...axisProps} width={44} tickFormatter={(v: number) => v.toLocaleString('en-US')} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
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
            <Bar dataKey="visits" radius={[4, 4, 0, 0]} shape={highlightBar((i) => WEEKLY_VISITS[i].isCurrent)} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

const PeakHoursChart: React.FC = () => {
  const [day, setDay] = useState(0);
  const data = PEAK_HOURS[day];
  const peak = data.reduce((best, d) => (d.people > best.people ? d : best), data[0]);
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div>
          <Eyebrow>Avg. of last 4 weeks</Eyebrow>
          <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">Peak hours</h2>
          <p className="text-xs text-[#6E6E73] mt-1">
            {DAY_NAMES[day]}s peak at <span className="font-semibold text-[#1D1D1F]">{formatHour(peak.hour)}</span> with{' '}
            ~{peak.people} members on the floor
          </p>
        </div>
        <Segmented
          ariaLabel="Day of week"
          options={DAY_LABELS.map((label, i) => ({ id: i, label }))}
          value={day}
          onChange={setDay}
          className="self-start"
        />
      </div>
      <div className="h-52 w-full" role="img" aria-label={`Members on the floor by hour on ${DAY_NAMES[day]}; peak ${peak.people} at ${formatHour(peak.hour)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 0, left: -24, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="hour" {...axisProps} fontSize={11} tickFormatter={formatHour} interval={2} dy={6} />
            <YAxis {...axisProps} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
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
            <Bar dataKey="people" radius={[4, 4, 0, 0]} shape={highlightBar((i) => data[i].hour === peak.hour)} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

const InsightsCard: React.FC = () => (
  <Card className="flex flex-col gap-5">
    <div>
      <Eyebrow>Insights</Eyebrow>
      <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">What Spottr noticed this week</h2>
    </div>
    <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {INSIGHTS.map((insight) => {
        const Icon = INSIGHT_ICONS[insight.id];
        return (
          <li key={insight.id} className="bg-white rounded-2xl p-5 flex flex-col gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F5F5F7] flex items-center justify-center">
              <Icon className="w-4.5 h-4.5 text-[#1D1D1F] stroke-[1.75]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-[#1D1D1F] leading-snug">{insight.title}</h3>
              <p className="text-sm text-[#6E6E73] mt-1.5 leading-relaxed">{insight.body}</p>
            </div>
            <Link
              to={insight.link.to}
              className="inline-flex items-center gap-0.5 text-sm font-medium text-[#248A3D] hover:text-[#1D1D1F] self-start"
            >
              {insight.link.label}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </li>
        );
      })}
    </ul>
  </Card>
);

export const Overview: React.FC = () => (
  <div className="flex flex-col gap-8 pb-16">
    <PageHeader
      eyebrow={
        <>
          <span>
            {GYM.name} · {GYM.city.replace(', CA', '')}
          </span>
          <DemoBadge />
        </>
      }
      title="Overview"
      subtitle="Sunday, Sep 27 · 10:45am. Everything below comes from the gym's existing cameras."
    />

    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {KPIS.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </section>

    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <WeeklyVisitsChart />
      <PeakHoursChart />
    </section>

    <InsightsCard />
  </div>
);
