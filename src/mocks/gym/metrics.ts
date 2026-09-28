/**
 * Operator metrics derived from the simulated members and visits.
 * "This week" = the 7 days ending now; "last week" = the 7 days before that.
 */

import {
  formatDate,
  NOW_DAY,
  NOW_HOUR,
  NOW_T,
  OPEN_HOURS,
  WEEK_HOURS,
  weekdayOf,
} from './gym';
import { Member, MEMBERS, Visit, VISITS, VISITS_BY_MEMBER } from './members';

const visitT = (v: Visit) => v.day * 24 + v.start;

/** Visits that started in [t0, t1). */
const visitsBetween = (t0: number, t1: number) => VISITS.filter((v) => visitT(v) >= t0 && visitT(v) < t1);

/** Start of the 7-day window `weeksAgo` weeks before now (0 = this week). */
const weekStartT = (weeksAgo: number) => NOW_T - (weeksAgo + 1) * WEEK_HOURS;

const visitsInWeek = (weeksAgo: number) => visitsBetween(weekStartT(weeksAgo), weekStartT(weeksAgo) + WEEK_HOURS);

const isMemberBy = (m: Member, t: number) => m.joinDay * 24 <= t;

// === KPIs ===

export interface Kpi {
  id: string;
  label: string;
  value: number;
  previous: number;
  format: 'int' | 'decimal';
  comparison: string;
}

function peopleInGymAt(day: number, hour: number): number {
  return VISITS.filter((v) => v.day === day && v.start <= hour && hour < v.start + v.duration).length;
}

function avgSessionsPerMember(weeksAgo: number): number {
  const start = weekStartT(weeksAgo);
  const active = MEMBERS.filter((m) => isMemberBy(m, start)).length;
  const visits = visitsInWeek(weeksAgo).filter((v) => isMemberBy(MEMBERS[v.member], start)).length;
  return visits / active;
}

const thisWeek = visitsInWeek(0);
const lastWeek = visitsInWeek(1);
const sumSets = (visits: Visit[]) => visits.reduce((sum, v) => sum + v.sets, 0);

export const KPIS: Kpi[] = [
  {
    id: 'now',
    label: 'Members in the gym now',
    value: peopleInGymAt(NOW_DAY, NOW_HOUR),
    previous: peopleInGymAt(NOW_DAY - 7, NOW_HOUR),
    format: 'int',
    comparison: 'vs. same time last week',
  },
  {
    id: 'visits',
    label: 'Visits this week',
    value: thisWeek.length,
    previous: lastWeek.length,
    format: 'int',
    comparison: 'vs. last week',
  },
  {
    id: 'frequency',
    label: 'Avg. sessions per member / week',
    value: avgSessionsPerMember(0),
    previous: avgSessionsPerMember(1),
    format: 'decimal',
    comparison: 'vs. last week',
  },
  {
    id: 'sets',
    label: 'Tracked sets this week',
    value: sumSets(thisWeek),
    previous: sumSets(lastWeek),
    format: 'int',
    comparison: 'vs. last week',
  },
];

// === Weekly visits (last 12 weeks) ===

export interface WeeklyVisits {
  label: string; // start date of the 7-day window
  visits: number;
  isCurrent: boolean;
}

export const WEEKLY_VISITS: WeeklyVisits[] = Array.from({ length: 12 }, (_, i) => {
  const weeksAgo = 11 - i;
  const startDay = Math.floor(weekStartT(weeksAgo) / 24);
  return {
    label: formatDate(startDay),
    visits: visitsInWeek(weeksAgo).length,
    isCurrent: weeksAgo === 0,
  };
});

// === Peak hours: avg. people on the floor per hour, per weekday (last 4 complete weeks) ===

export interface HourlyTraffic {
  hour: number;
  people: number;
}

/** PEAK_HOURS[weekday] → one entry per open hour. */
export const PEAK_HOURS: HourlyTraffic[][] = (() => {
  const totals = Array.from({ length: 7 }, () => OPEN_HOURS.map(() => 0));
  const firstDay = NOW_DAY - 28;
  for (const v of VISITS) {
    if (v.day < firstDay || v.day >= NOW_DAY) continue;
    const wd = weekdayOf(v.day);
    OPEN_HOURS.forEach((h, i) => {
      const overlap = Math.min(v.start + v.duration, h + 1) - Math.max(v.start, h);
      if (overlap > 0) totals[wd][i] += overlap;
    });
  }
  return totals.map((row) => row.map((sum, i) => ({ hour: OPEN_HOURS[i], people: Math.round(sum / 4) })));
})();

// === Engagement: sessions/week distribution (last 4 weeks) ===

export interface DistributionBucket {
  label: string;
  members: number;
}

const DIST_WINDOW_START = NOW_T - 4 * WEEK_HOURS;
const establishedMembers = MEMBERS.filter((m) => isMemberBy(m, DIST_WINDOW_START));

export const SESSIONS_PER_WEEK_DISTRIBUTION: DistributionBucket[] = (() => {
  const buckets: DistributionBucket[] = [
    { label: '0', members: 0 },
    { label: '<1', members: 0 },
    { label: '1–2', members: 0 },
    { label: '2–3', members: 0 },
    { label: '3–4', members: 0 },
    { label: '4+', members: 0 },
  ];
  for (const m of establishedMembers) {
    const count = VISITS_BY_MEMBER[m.index].filter((v) => visitT(v) >= DIST_WINDOW_START).length;
    const perWeek = count / 4;
    const idx = count === 0 ? 0 : perWeek < 1 ? 1 : perWeek < 2 ? 2 : perWeek < 3 ? 3 : perWeek < 4 ? 4 : 5;
    buckets[idx].members++;
  }
  return buckets;
})();

export const ENGAGEMENT_SUMMARY = (() => {
  const regulars = SESSIONS_PER_WEEK_DISTRIBUTION.slice(3).reduce((s, b) => s + b.members, 0);
  return {
    establishedMembers: establishedMembers.length,
    regularsPct: Math.round((regulars / establishedMembers.length) * 100), // 2+ sessions/week
  };
})();

// === Retention curve: new members still visiting k weeks after joining ===

export interface RetentionPoint {
  week: number;
  retained: number; // % of cohort with a visit in week k or k + 1
  cohort: number;
}

// Cohort = members who joined in the last 26 weeks, early enough to have completed week k + 1.
// A two-week window keeps once-a-week members who skip a week from counting as churned.
export const RETENTION_CURVE: RetentionPoint[] = Array.from({ length: 13 }, (_, week) => {
  const cohort = MEMBERS.filter((m) => m.joinDay >= 0 && m.joinDay + (week + 2) * 7 <= NOW_DAY);
  const retained = cohort.filter((m) =>
    VISITS_BY_MEMBER[m.index].some((v) => v.day >= m.joinDay + week * 7 && v.day < m.joinDay + (week + 2) * 7)
  ).length;
  return { week, retained: Math.round((retained / cohort.length) * 100), cohort: cohort.length };
});

// === At-risk members ===

export type RiskReason = 'inactive' | 'declining';

export interface AtRiskMember {
  member: Member;
  reason: RiskReason;
  daysSinceLastVisit: number;
  /** Visits per week over the last 8 weeks, oldest first. */
  weeklyVisits: number[];
  /** Avg. sessions/week before the drop (weeks 4–8 ago). */
  usualRate: number;
  recentRate: number;
}

function weeklyCounts(visits: Visit[], weeks: number): number[] {
  return Array.from({ length: weeks }, (_, i) => {
    const weeksAgo = weeks - 1 - i;
    const t0 = weekStartT(weeksAgo);
    return visits.filter((v) => visitT(v) >= t0 && visitT(v) < t0 + WEEK_HOURS).length;
  });
}

const allRiskRows: AtRiskMember[] = MEMBERS.flatMap((m) => {
  const visits = VISITS_BY_MEMBER[m.index];
  if (visits.length === 0 || m.joinDay > NOW_DAY - 28) return [];
  const last = visits[visits.length - 1];
  const daysSinceLastVisit = NOW_DAY - last.day;
  const weekly = weeklyCounts(visits, 8);
  const usualRate = weekly.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  const recentRate = weekly.slice(5).reduce((a, b) => a + b, 0) / 3;

  let reason: RiskReason | null = null;
  if (daysSinceLastVisit >= 14) reason = 'inactive';
  else if (usualRate >= 2 && recentRate <= usualRate * 0.5) reason = 'declining';
  if (!reason) return [];

  return [{ member: m, reason, daysSinceLastVisit, weeklyVisits: weekly, usualRate, recentRate }];
});

/** Members who haven't visited in 14+ days (includes long-lapsed memberships). */
export const INACTIVE_14D_COUNT = allRiskRows.filter((r) => r.reason === 'inactive').length;

/**
 * The nudge list: members who were regulars recently and are slipping — lapsed for
 * 14–60 days, or visiting at half their usual rate. Most-engaged-before first.
 */
export const AT_RISK_MEMBERS: AtRiskMember[] = allRiskRows
  .filter((r) => r.reason === 'declining' || (r.daysSinceLastVisit <= 60 && r.usualRate > 0))
  .sort((a, b) => b.usualRate - a.usualRate || a.daysSinceLastVisit - b.daysSinceLastVisit);
