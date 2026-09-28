/**
 * Plain-language findings for the operator overview. Every number is computed from the
 * same simulated data the charts use, so the copy always matches the dashboards.
 */

import { idleUnits, zoneDemand, zoneOccupancy } from './floor';
import { ZONE_BY_ID } from './gym';
import { AT_RISK_MEMBERS } from './metrics';

export interface Insight {
  id: 'capacity' | 'retention' | 'equipment';
  title: string;
  body: string;
  link: { to: string; label: string };
}

const MON_THU = [0, 1, 2, 3];
const EVENING = [17, 18]; // 5–7pm
const TARGET_PEAK_UTILIZATION = 0.85;

const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const listNames = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

function squatRackInsight(): Insight {
  const slots = MON_THU.flatMap((d) => EVENING.map((h) => [d, h] as const));
  const occupancy = avg(slots.map(([d, h]) => zoneOccupancy('squat', d, h)));
  const demand = avg(slots.map(([d, h]) => zoneDemand('squat', d, h)));
  const racks = ZONE_BY_ID.squat.units.length;
  const extra = Math.max(1, Math.ceil(demand / TARGET_PEAK_UTILIZATION) - racks);
  return {
    id: 'capacity',
    title: `Squat racks are at ${Math.round(occupancy * 100)}% capacity Mon–Thu 5–7pm`,
    body: `${extra} more rack${extra === 1 ? '' : 's'} would bring peak use under ${Math.round(
      TARGET_PEAK_UTILIZATION * 100
    )}% and cut waiting time for your busiest members.`,
    link: { to: '/gyms/floor', label: 'View floor' },
  };
}

function retentionInsight(): Insight {
  const lapsed = AT_RISK_MEMBERS.filter((r) => r.reason === 'inactive');
  const regulars = lapsed.filter((r) => r.usualRate >= 2).length;
  return {
    id: 'retention',
    title: `${lapsed.length} members have gone quiet in the last two months`,
    body: `None of them has visited in 14+ days, and ${regulars} were training twice a week or more a month ago. A personal nudge now is cheaper than winning them back after they cancel.`,
    link: { to: '/gyms/members', label: 'See who' },
  };
}

function idleEquipmentInsight(): Insight {
  const idle = idleUnits('machines');
  const busiestIdle = Math.max(...idle.map((u) => u.peakUtilization));
  const idlePct = Math.floor((1 - busiestIdle) * 20) * 5; // round down to a multiple of 5
  return {
    id: 'equipment',
    title: `${listNames(idle.map((u) => u.name))} sit unused ${idlePct}% of peak hours`,
    body: `That floor space could hold another squat rack, the zone members are queuing for.`,
    link: { to: '/gyms/floor', label: 'See idle equipment' },
  };
}

export const INSIGHTS: Insight[] = [squatRackInsight(), retentionInsight(), idleEquipmentInsight()];
