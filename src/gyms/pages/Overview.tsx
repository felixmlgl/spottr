import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronRight } from 'lucide-react';
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

const INSIGHT_LABELS: Record<Insight['id'], string> = {
  capacity: 'Capacity',
  retention: 'Retention',
  equipment: 'Equipment',
};

const formatKpi = (kpi: Kpi) => (kpi.format === 'decimal' ? kpi.value.toFixed(1) : kpi.value.toLocaleString('en-US'));

const KpiCell: React.FC<{ kpi: Kpi }> = ({ kpi }) => (
  <div className="px-5 py-5 sm:px-6 flex flex-col gap-2 border-line [&:not(:first-child)]:border-t sm:[&:not(:first-child)]:border-t-0 sm:[&:nth-child(even)]:border-l lg:[&:not(:first-child)]:border-l">
    <span className="hud-label leading-snug">{kpi.label}</span>
    <p className="font-dot text-5xl font-black text-ink leading-none">{formatKpi(kpi)}</p>
    <TrendChip value={kpi.value} previous={kpi.previous} comparison={kpi.comparison} />
  </div>
);

const WeeklyVisitsChart: React.FC = () => {
  const current = WEEKLY_VISITS[WEEKLY_VISITS.length - 1];
  const average = Math.round(WEEKLY_VISITS.reduce((s, w) => s + w.visits, 0) / WEEKLY_VISITS.length);
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <Eyebrow>Last 12 weeks</Eyebrow>
        <h2 className="text-xl font-bold tracking-tight text-ink mt-0.5">Weekly visits</h2>
        <p className="text-xs text-ink-2 mt-1">
          This week <span className="font-semibold text-ink">{current.visits.toLocaleString('en-US')}</span> · 12-week
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
          <h2 className="text-xl font-bold tracking-tight text-ink mt-0.5">Peak hours</h2>
          <p className="text-xs text-ink-2 mt-1">
            {DAY_NAMES[day]}s peak at <span className="font-semibold text-ink">{formatHour(peak.hour)}</span> with{' '}
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
      <h2 className="text-xl font-bold tracking-tight text-ink mt-0.5">What Spottr noticed this week</h2>
    </div>
    <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {INSIGHTS.map((insight) => {
        return (
          <li key={insight.id} className="bg-white rounded-sm p-5 flex flex-col gap-3">
            <span className="hud-label text-accent-ink">{INSIGHT_LABELS[insight.id]}</span>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-ink leading-snug">{insight.title}</h3>
              <p className="text-sm text-ink-2 mt-1.5 leading-relaxed">{insight.body}</p>
            </div>
            <Link
              to={insight.link.to}
              className="inline-flex items-center gap-0.5 text-sm font-medium text-accent-ink hover:text-ink self-start"
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
      subtitle="Sunday, Sep 27, 10:45am. Everything below comes from the gym's existing cameras."
    />

    <section className="viewfinder grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {KPIS.map((kpi) => (
        <KpiCell key={kpi.id} kpi={kpi} />
      ))}
    </section>

    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <WeeklyVisitsChart />
      <PeakHoursChart />
    </section>

    <InsightsCard />
  </div>
);
