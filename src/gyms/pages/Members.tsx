import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, Send } from 'lucide-react';
import {
  AT_RISK_MEMBERS,
  AtRiskMember,
  ENGAGEMENT_SUMMARY,
  GYM,
  RETENTION_CURVE,
  SESSIONS_PER_WEEK_DISTRIBUTION,
} from '../../mocks/gym';
import { useToast } from '../components/Toast';
import {
  ACCENT,
  axisProps,
  Card,
  ChartTooltip,
  DemoBadge,
  Eyebrow,
  GRID,
  highlightBar,
  PageHeader,
  Segmented,
} from '../components/ui';

type RiskFilter = 'all' | 'inactive' | 'declining';

const PAGE_SIZE = 10;

const Sparkline: React.FC<{ values: number[] }> = ({ values }) => {
  const w = 72;
  const h = 24;
  const max = Math.max(1, ...values);
  const points = values.map((v, i) => [(i / (values.length - 1)) * (w - 4) + 2, h - 2 - (v / max) * (h - 4)]);
  const [lx, ly] = points[points.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke="#6E6E73"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lx} cy={ly} r={2.5} fill="#1D1D1F" />
    </svg>
  );
};

const lastVisitLabel = (days: number) => (days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`);

const AtRiskRow: React.FC<{ row: AtRiskMember; sent: boolean; onNudge: () => void }> = ({ row, sent, onNudge }) => {
  const { member } = row;
  return (
    <li className="grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.6fr)_auto] items-center gap-x-4 gap-y-2 py-3.5 border-b border-black/[0.05] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-white ring-1 ring-black/5 flex items-center justify-center text-sm font-semibold text-[#1D1D1F] shrink-0">
          {member.firstName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1D1D1F] truncate">{member.firstName}</p>
          <p className="text-xs text-[#6E6E73]">Member {member.memberNo}</p>
        </div>
      </div>

      <div className="hidden sm:block">
        <p className="text-sm text-[#1D1D1F]">{lastVisitLabel(row.daysSinceLastVisit)}</p>
        <p className="text-xs text-[#6E6E73]">{row.reason === 'inactive' ? 'No visit 14+ days' : 'Visits halved'}</p>
      </div>

      <div className="col-span-2 sm:col-span-1 row-start-2 sm:row-start-auto flex items-center gap-3 text-xs text-[#6E6E73]">
        <span className="sm:hidden text-[#1D1D1F]">{lastVisitLabel(row.daysSinceLastVisit)} ·</span>
        <Sparkline values={row.weeklyVisits} />
        <span className="tabular-nums">
          {row.usualRate.toFixed(1)} → {row.recentRate.toFixed(1)} / wk
        </span>
      </div>

      <button
        onClick={onNudge}
        disabled={sent}
        className={`col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto justify-self-end inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          sent
            ? 'bg-transparent text-[#248A3D] cursor-default'
            : 'bg-white text-[#1D1D1F] shadow-xs hover:bg-[#1D1D1F] hover:text-white cursor-pointer'
        }`}
      >
        {sent ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
        {sent ? 'Sent' : 'Send nudge'}
      </button>
    </li>
  );
};

export const Members: React.FC = () => {
  const toast = useToast();
  const [filter, setFilter] = useState<RiskFilter>('all');
  const [showAll, setShowAll] = useState(false);
  const [nudged, setNudged] = useState<Set<number>>(() => new Set());

  const counts = useMemo(
    () => ({
      all: AT_RISK_MEMBERS.length,
      inactive: AT_RISK_MEMBERS.filter((r) => r.reason === 'inactive').length,
      declining: AT_RISK_MEMBERS.filter((r) => r.reason === 'declining').length,
    }),
    []
  );

  const rows = filter === 'all' ? AT_RISK_MEMBERS : AT_RISK_MEMBERS.filter((r) => r.reason === filter);
  const visibleRows = showAll ? rows : rows.slice(0, PAGE_SIZE);

  const week12 = RETENTION_CURVE[RETENTION_CURVE.length - 1];
  const week4 = RETENTION_CURVE[4];

  const handleNudge = (row: AtRiskMember) => {
    setNudged((prev) => new Set(prev).add(row.member.index));
    toast(`Nudge sent to ${row.member.firstName}`);
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      <PageHeader
        eyebrow={
          <>
            <span>{GYM.name}</span>
            <DemoBadge />
          </>
        }
        title="Members"
        subtitle="Engagement across the membership, measured from real visits. No check-in data or surveys needed."
      />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="flex flex-col gap-4">
          <div>
            <Eyebrow>Last 4 weeks</Eyebrow>
            <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">Sessions per week</h2>
            <p className="text-xs text-[#6E6E73] mt-1">
              <span className="font-semibold text-[#1D1D1F]">{ENGAGEMENT_SUMMARY.regularsPct}%</span> of{' '}
              {ENGAGEMENT_SUMMARY.establishedMembers} members train twice a week or more
            </p>
          </div>
          <div className="h-60 w-full" role="img" aria-label="Distribution of members by average sessions per week">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SESSIONS_PER_WEEK_DISTRIBUTION} margin={{ top: 8, right: 0, left: -20, bottom: 0 }} barCategoryGap="32%">
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" {...axisProps} dy={6} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof SESSIONS_PER_WEEK_DISTRIBUTION)[number];
                    return <ChartTooltip title={`${d.label} sessions / week`} value={`${d.members} members`} />;
                  }}
                />
                <Bar dataKey="members" radius={[4, 4, 0, 0]} shape={highlightBar((i) => i >= 3)} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-[#6E6E73] -mt-1">Sessions per week · green = 2+ sessions</p>
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <Eyebrow>New members, last 6 months</Eyebrow>
            <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">Retention curve</h2>
            <p className="text-xs text-[#6E6E73] mt-1">
              <span className="font-semibold text-[#1D1D1F]">{week12.retained}%</span> still training after 12 weeks ·{' '}
              {100 - week4.retained}% drop off in the first month
            </p>
          </div>
          <div className="h-60 w-full" role="img" aria-label={`Share of new members still visiting by week since joining; ${week12.retained}% at week 12`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={RETENTION_CURVE} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="week" {...axisProps} tickFormatter={(w: number) => (w === 0 ? 'Join' : `W${w}`)} interval={1} dy={6} />
                <YAxis {...axisProps} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  cursor={{ stroke: '#D1D1D6', strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof RETENTION_CURVE)[number];
                    return (
                      <ChartTooltip
                        title={d.week === 0 ? 'Join week' : `Week ${d.week} after joining`}
                        value={`${d.retained}% still visiting`}
                        note={`Cohort of ${d.cohort} members`}
                      />
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="retained"
                  isAnimationActive={false}
                  stroke={ACCENT}
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#FFFFFF', stroke: ACCENT, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: ACCENT, stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-[#6E6E73] -mt-1">Share of new members with a visit in that week or the next</p>
        </Card>
      </section>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Eyebrow>At risk</Eyebrow>
            <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">
              {counts.all} members are slipping away
            </h2>
            <p className="text-xs text-[#6E6E73] mt-1 max-w-lg">
              Regulars who stopped coming or halved their visits in the last few weeks. Operators see first names
              only; the nudge arrives in the member's Spottr app.
            </p>
          </div>
          <Segmented<RiskFilter>
            ariaLabel="Filter at-risk members"
            options={[
              { id: 'all', label: `All (${counts.all})` },
              { id: 'inactive', label: `No visit 14+ days (${counts.inactive})` },
              { id: 'declining', label: `Visits halved (${counts.declining})` },
            ]}
            value={filter}
            onChange={(f) => {
              setFilter(f);
              setShowAll(false);
            }}
            className="self-start sm:self-auto"
          />
        </div>

        <div>
          <div className="hidden sm:grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.6fr)_auto] gap-x-4 text-xs font-medium text-[#6E6E73] pt-2 border-b border-black/[0.05] pb-2">
            <span>Member</span>
            <span>Last visit</span>
            <span>Visits, last 8 weeks</span>
            <span className="w-[108px]" />
          </div>
          <ul>
            {visibleRows.map((row) => (
              <AtRiskRow
                key={row.member.index}
                row={row}
                sent={nudged.has(row.member.index)}
                onNudge={() => handleNudge(row)}
              />
            ))}
          </ul>
        </div>

        {rows.length > PAGE_SIZE && (
          <button
            onClick={() => setShowAll((s) => !s)}
            className="self-center px-4 py-1.5 rounded-full text-xs font-medium text-[#1D1D1F] bg-white shadow-xs hover:bg-[#E8E8ED] transition-colors cursor-pointer"
          >
            {showAll ? 'Show fewer' : `Show all ${rows.length}`}
          </button>
        )}
      </Card>
    </div>
  );
};
