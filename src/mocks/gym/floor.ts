/**
 * Zone and equipment occupancy derived from simulated visits (avg. of the last 4 complete weeks).
 * Occupancy = people in the zone / zone capacity (one person per unit). Values above 1 mean
 * members are waiting for equipment.
 */

import { NOW_DAY, OPEN_HOURS, weekdayOf, ZoneId, ZONES } from './gym';
import { MEMBERS, VISITS, ZONE_SHARES } from './members';

const WEEKS_AVERAGED = 4;

/** DEMAND[zoneId][weekday][hourIndex] = avg. people wanting to use the zone. */
const DEMAND: Record<ZoneId, number[][]> = (() => {
  const demand = Object.fromEntries(
    ZONES.map((z) => [z.id, Array.from({ length: 7 }, () => OPEN_HOURS.map(() => 0))])
  ) as Record<ZoneId, number[][]>;

  const firstDay = NOW_DAY - 7 * WEEKS_AVERAGED;
  for (const v of VISITS) {
    if (v.day < firstDay || v.day >= NOW_DAY) continue;
    const wd = weekdayOf(v.day);
    const shares = ZONE_SHARES[MEMBERS[v.member].style];
    OPEN_HOURS.forEach((h, i) => {
      const overlap = Math.min(v.start + v.duration, h + 1) - Math.max(v.start, h);
      if (overlap <= 0) return;
      for (const z of ZONES) demand[z.id][wd][i] += (overlap * shares[z.id]) / WEEKS_AVERAGED;
    });
  }
  return demand;
})();

const hourIndex = (hour: number) => Math.max(0, OPEN_HOURS.indexOf(hour));

/** Share of the zone's equipment in use (0..1). */
export function zoneOccupancy(zoneId: ZoneId, weekday: number, hour: number): number {
  const zone = ZONES.find((z) => z.id === zoneId)!;
  return Math.min(1, DEMAND[zoneId][weekday][hourIndex(hour)] / zone.units.length);
}

/** People on average wanting the zone at that time (can exceed capacity). */
export function zoneDemand(zoneId: ZoneId, weekday: number, hour: number): number {
  return DEMAND[zoneId][weekday][hourIndex(hour)];
}

export function zoneHourly(zoneId: ZoneId, weekday: number) {
  return OPEN_HOURS.map((hour) => ({ hour, occupancy: zoneOccupancy(zoneId, weekday, hour) }));
}

/** Mean occupancy over opening hours for one weekday, or the whole week. */
export function zoneAverage(zoneId: ZoneId, weekday?: number): number {
  const days = weekday === undefined ? [0, 1, 2, 3, 4, 5, 6] : [weekday];
  let sum = 0;
  for (const d of days) for (const h of OPEN_HOURS) sum += zoneOccupancy(zoneId, d, h);
  return sum / (days.length * OPEN_HOURS.length);
}

export interface PeakSlot {
  weekday: number;
  hour: number;
  occupancy: number;
}

/** Busiest weekday/hour slots of the week for a zone. */
export function zonePeaks(zoneId: ZoneId, count = 3): PeakSlot[] {
  const slots: PeakSlot[] = [];
  for (let d = 0; d < 7; d++) {
    for (const h of OPEN_HOURS) slots.push({ weekday: d, hour: h, occupancy: zoneOccupancy(zoneId, d, h) });
  }
  return slots.sort((a, b) => b.occupancy - a.occupancy || zoneDemand(zoneId, b.weekday, b.hour) - zoneDemand(zoneId, a.weekday, a.hour)).slice(0, count);
}

export interface UnitUsage {
  id: string;
  name: string;
  /** Share of time in use during the zone's 10 busiest hours of the week. */
  peakUtilization: number;
  /** Share of time in use at the selected weekday/hour. */
  utilization: number;
}

/** Per-unit usage: zone demand is split across units by their relative popularity. */
export function unitUsage(zoneId: ZoneId, weekday: number, hour: number): UnitUsage[] {
  const zone = ZONES.find((z) => z.id === zoneId)!;
  const meanPop = zone.units.reduce((s, u) => s + u.popularity, 0) / zone.units.length;
  const peakOcc = zonePeaks(zoneId, 10).reduce((s, p) => s + p.occupancy, 0) / 10;
  const occ = zoneOccupancy(zoneId, weekday, hour);
  return zone.units.map((u) => {
    const rel = u.popularity / meanPop;
    return {
      id: u.id,
      name: u.name,
      peakUtilization: Math.min(1, peakOcc * rel),
      utilization: Math.min(1, occ * rel),
    };
  });
}

/** Units that sit unused most of the time even at the zone's peak. */
export function idleUnits(zoneId: ZoneId): UnitUsage[] {
  return unitUsage(zoneId, 0, OPEN_HOURS[0]).filter((u) => u.peakUtilization < 0.25);
}
