/**
 * Iron District Fitness (fictional) – gym profile, simulation clock and floor layout.
 *
 * Time model: the simulation covers DAYS_SIMULATED days ending "now" (Sunday, Sep 27 2026,
 * 10:45am — the same moment the member app treats as "today"). A timestamp `t` is measured
 * in hours since the start of day 0.
 */

export const GYM = {
  name: 'Iron District Fitness',
  city: 'Oakland, CA',
  memberCount: 600,
  openHour: 5,
  closeHour: 23,
};

export const DAYS_SIMULATED = 182; // 26 weeks
export const NOW_DAY = DAYS_SIMULATED - 1;
export const NOW_HOUR = 10.75;
export const NOW_T = NOW_DAY * 24 + NOW_HOUR;
export const WEEK_HOURS = 7 * 24;

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/** Hours shown on charts and the floor slider (bins start at these hours). */
export const OPEN_HOURS = Array.from({ length: GYM.closeHour - GYM.openHour }, (_, i) => GYM.openHour + i);

/** Monday = 0 … Sunday = 6. NOW_DAY is a Sunday. */
export const weekdayOf = (day: number) => (((6 - (NOW_DAY - day)) % 7) + 7) % 7;

export const NOW_WEEKDAY = weekdayOf(NOW_DAY);

const NOW_DATE_UTC = Date.UTC(2026, 8, 27);

export function dateOf(day: number): Date {
  return new Date(NOW_DATE_UTC - (NOW_DAY - day) * 86400000);
}

export function formatDate(day: number): string {
  return dateOf(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function formatHour(hour: number): string {
  const h = Math.floor(hour) % 24;
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${suffix}`;
}

// === Floor plan ===

export type ZoneId = 'squat' | 'bench' | 'dumbbell' | 'machines' | 'cardio' | 'stretch';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EquipmentUnit {
  id: string;
  name: string;
  /** Relative demand vs. other units in the zone (mean ≈ 1). */
  popularity: number;
  rect: Rect;
}

export interface Zone {
  id: ZoneId;
  name: string;
  unitNoun: string;
  rect: Rect;
  units: EquipmentUnit[];
}

export const FLOOR_VIEWBOX = { w: 1000, h: 640 };

function layoutUnits(
  zoneId: ZoneId,
  rect: Rect,
  cols: number,
  unitW: number,
  unitH: number,
  specs: [name: string, popularity: number][]
): EquipmentUnit[] {
  const rows = Math.ceil(specs.length / cols);
  const areaX = rect.x + 16;
  const areaY = rect.y + 48;
  const areaW = rect.w - 32;
  const areaH = rect.h - 64;
  const gapX = (areaW - cols * unitW) / (cols + 1);
  const gapY = (areaH - rows * unitH) / (rows + 1);
  return specs.map(([name, popularity], i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id: `${zoneId}-${i + 1}`,
      name,
      popularity,
      rect: {
        x: areaX + gapX + col * (unitW + gapX),
        y: areaY + gapY + row * (unitH + gapY),
        w: unitW,
        h: unitH,
      },
    };
  });
}

const zone = (
  id: ZoneId,
  name: string,
  unitNoun: string,
  rect: Rect,
  cols: number,
  unitW: number,
  unitH: number,
  specs: [string, number][]
): Zone => ({ id, name, unitNoun, rect, units: layoutUnits(id, rect, cols, unitW, unitH, specs) });

export const ZONES: Zone[] = [
  zone('squat', 'Squat racks', 'racks', { x: 24, y: 24, w: 380, h: 184 }, 6, 40, 96, [
    ['Rack 1', 1.05],
    ['Rack 2', 1.1],
    ['Rack 3', 1.1],
    ['Rack 4', 1.05],
    ['Rack 5', 0.95],
    ['Rack 6', 0.75],
  ]),
  zone('bench', 'Benches', 'benches', { x: 24, y: 224, w: 380, h: 160 }, 4, 64, 28, [
    ['Flat bench 1', 1.35],
    ['Flat bench 2', 1.35],
    ['Flat bench 3', 1.25],
    ['Incline bench 1', 1.1],
    ['Incline bench 2', 1.0],
    ['Decline bench', 0.3],
    ['Adjustable bench 1', 0.9],
    ['Adjustable bench 2', 0.75],
  ]),
  zone('dumbbell', 'Dumbbells', 'stations', { x: 24, y: 400, w: 380, h: 200 }, 6, 36, 36, [
    ['Station 1', 1.2],
    ['Station 2', 1.25],
    ['Station 3', 1.25],
    ['Station 4', 1.2],
    ['Station 5', 1.1],
    ['Station 6', 1.0],
    ['Station 7', 1.1],
    ['Station 8', 1.0],
    ['Station 9', 0.95],
    ['Station 10', 0.9],
    ['Station 11', 0.6],
    ['Station 12', 0.45],
  ]),
  zone('machines', 'Machines', 'machines', { x: 420, y: 24, w: 300, h: 360 }, 3, 68, 50, [
    ['Leg press', 1.4],
    ['Hack squat', 1.2],
    ['Lat pulldown', 1.35],
    ['Seated cable row', 1.2],
    ['Cable crossover', 1.45],
    ['Chest press', 0.9],
    ['Leg extension', 1.05],
    ['Lying leg curl', 1.0],
    ['Smith machine', 0.95],
    ['Shoulder press', 0.75],
    ['Pec deck', 0.3],
    ['Hip abduction', 0.25],
  ]),
  zone('stretch', 'Stretching', 'mats', { x: 420, y: 400, w: 300, h: 200 }, 3, 68, 44, [
    ['Mat 1', 1.1],
    ['Mat 2', 1.1],
    ['Mat 3', 1.0],
    ['Mat 4', 1.0],
    ['Foam roll station', 1.2],
    ['Mat 5', 0.6],
  ]),
  zone('cardio', 'Cardio', 'machines', { x: 736, y: 24, w: 240, h: 576 }, 2, 76, 40, [
    ['Treadmill 1', 1.3],
    ['Treadmill 2', 1.3],
    ['Treadmill 3', 1.25],
    ['Treadmill 4', 1.25],
    ['Treadmill 5', 1.15],
    ['Treadmill 6', 1.1],
    ['Bike 1', 1.0],
    ['Bike 2', 0.95],
    ['Bike 3', 0.9],
    ['Bike 4', 0.85],
    ['Rower 1', 0.9],
    ['Rower 2', 0.8],
    ['Stair climber 1', 1.2],
    ['Stair climber 2', 1.1],
    ['Ski erg', 0.2],
    ['Recumbent bike', 0.25],
  ]),
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<ZoneId, Zone>;
