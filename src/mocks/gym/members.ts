/**
 * Simulated membership of Iron District Fitness: ~600 members and every visit they made
 * over the last 26 weeks. All dashboards derive their numbers from these two arrays.
 */

import {
  DAYS_SIMULATED,
  GYM,
  NOW_DAY,
  NOW_HOUR,
  weekdayOf,
  ZoneId,
} from './gym';
import { clamp, createRng, gaussian, int, pick, uniform, weighted } from './rng';

export type TrainingStyle = 'strength' | 'hypertrophy' | 'cardio' | 'general';
export type TimeSlot = 'early' | 'daytime' | 'lunch' | 'evening' | 'late';

export interface Member {
  index: number;
  memberNo: string; // e.g. "#0412"
  firstName: string;
  /** Day the membership started; negative = before the simulated window. */
  joinDay: number;
  style: TrainingStyle;
  preferredSlot: TimeSlot;
  /** Typical sessions per week while engaged. */
  baseRate: number;
  /** Day the member starts drifting away, or null if they stay engaged. */
  disengageDay: number | null;
}

export interface Visit {
  member: number; // Member.index
  day: number;
  start: number; // hour of day, e.g. 17.5
  duration: number; // hours
  sets: number; // tracked sets during the visit
}

/** Share of a visit spent in each zone, by training style. */
export const ZONE_SHARES: Record<TrainingStyle, Record<ZoneId, number>> = {
  strength: { squat: 0.44, bench: 0.16, dumbbell: 0.12, machines: 0.12, cardio: 0.06, stretch: 0.1 },
  hypertrophy: { squat: 0.1, bench: 0.14, dumbbell: 0.3, machines: 0.36, cardio: 0.05, stretch: 0.05 },
  cardio: { squat: 0, bench: 0.03, dumbbell: 0.08, machines: 0.14, cardio: 0.63, stretch: 0.12 },
  general: { squat: 0.08, bench: 0.1, dumbbell: 0.2, machines: 0.26, cardio: 0.26, stretch: 0.1 },
};

const SLOT_RANGES: Record<TimeSlot, [number, number]> = {
  early: [5.25, 7.75],
  daytime: [8.25, 16.25],
  lunch: [11.5, 13.5],
  evening: [16.75, 19.25],
  late: [19.25, 21.25],
};

// Mon..Sun relative traffic (sums to 7)
const WEEKDAY_FACTOR = [1.22, 1.17, 1.12, 1.06, 0.85, 0.82, 0.76];

const FIRST_NAMES = [
  'Maya', 'Jordan', 'Priya', 'Marcus', 'Sofia', 'Kenji', 'Aaliyah', 'Diego', 'Hannah', 'Andre',
  'Mei', 'Tyler', 'Camila', 'Omar', 'Grace', 'Devon', 'Leila', 'Ethan', 'Nia', 'Luis',
  'Chloe', 'Malik', 'Ana', 'Ryan', 'Imani', 'Arjun', 'Olivia', 'Jamal', 'Yuki', 'Carlos',
  'Emily', 'Darius', 'Isabel', 'Kevin', 'Zara', 'Mateo', 'Jasmine', 'Brandon', 'Lina', 'Sam',
  'Ava', 'Terrence', 'Rosa', 'Nathan', 'Keisha', 'Vikram', 'Lucy', 'Andres', 'Tiana', 'Daniel',
  'Hana', 'Xavier', 'Elena', 'Chris', 'Amara', 'Minh', 'Rachel', 'Jalen', 'Fatima', 'Josh',
  'Noor', 'Derek', 'Valeria', 'Alex', 'Simone', 'Rohan', 'Megan', 'Isaiah', 'Paola', 'Eric',
  'Ines', 'Trevor', 'Aisha', 'Kai', 'Brianna', 'Gabriel', 'Soo-jin', 'Miles', 'Lauren', 'Tomás',
  'Kiara', 'Anthony', 'Mariana', 'Jason', 'Asha', 'Julian', 'Tessa', 'Hector', 'Nicole', 'Wei',
  'Danielle', 'Rafael', 'Kayla', 'Samir', 'Brooke', 'Elijah', 'Lucia', 'Sean', 'Ayesha', 'Victor',
];

const SEED = 20260927;

function sampleBaseRate(rng: () => number): number {
  const tier = weighted(rng, { committed: 0.24, regular: 0.46, casual: 0.3 });
  if (tier === 'committed') return uniform(rng, 4, 5.5);
  if (tier === 'regular') return uniform(rng, 2.2, 3.6);
  return uniform(rng, 0.9, 1.9);
}

function generateMembers(): Member[] {
  const rng = createRng(SEED);
  const members: Member[] = [];

  for (let i = 0; i < GYM.memberCount; i++) {
    const isNew = rng() < 0.3;
    const joinDay = isNew ? int(rng, 0, NOW_DAY - 3) : -int(rng, 30, 1800);
    const style = weighted<TrainingStyle>(rng, { strength: 0.32, hypertrophy: 0.3, cardio: 0.14, general: 0.24 });
    const preferredSlot = weighted<TimeSlot>(rng, { early: 0.17, daytime: 0.12, lunch: 0.12, evening: 0.44, late: 0.15 });

    // When (if ever) does this member start drifting away?
    let disengageDay: number | null = null;
    if (isNew) {
      // New members churn fastest in the first 6 weeks
      for (let week = 0; joinDay + week * 7 <= NOW_DAY; week++) {
        const hazard = week < 6 ? 0.07 : 0.03;
        if (rng() < hazard) {
          disengageDay = joinDay + week * 7 + int(rng, 0, 6);
          break;
        }
      }
    } else if (rng() < 0.1) {
      disengageDay = int(rng, 0, NOW_DAY);
    }

    members.push({
      index: i,
      memberNo: `#${String(1000 + i * 7 + int(rng, 0, 6)).padStart(4, '0')}`,
      firstName: pick(rng, FIRST_NAMES),
      joinDay,
      style,
      preferredSlot,
      baseRate: sampleBaseRate(rng),
      disengageDay,
    });
  }
  return members;
}

const DURATION_BY_STYLE: Record<TrainingStyle, number> = {
  strength: 1.15,
  hypertrophy: 1.05,
  cardio: 0.75,
  general: 0.9,
};

function generateVisits(members: Member[]): Visit[] {
  const rng = createRng(SEED + 1);
  const visits: Visit[] = [];

  // Week-level noise shared by everyone (holidays, weather, …)
  const weekNoise = Array.from({ length: Math.ceil(DAYS_SIMULATED / 7) + 1 }, () => clamp(gaussian(rng, 1, 0.05), 0.88, 1.1));

  for (const m of members) {
    const firstDay = Math.max(0, m.joinDay);
    const strengthShare = 1 - ZONE_SHARES[m.style].cardio - ZONE_SHARES[m.style].stretch;

    for (let day = firstDay; day <= NOW_DAY; day++) {
      const weekday = weekdayOf(day);
      const isJoinDay = day === m.joinDay; // everyone comes in for their induction session

      let rate = m.baseRate;
      if (m.joinDay >= 0 && day - m.joinDay < 14) rate *= 1.15; // new-member enthusiasm
      if (m.disengageDay !== null && day >= m.disengageDay) {
        const drift = Math.min(1, (day - m.disengageDay) / 10);
        rate *= 1 - drift;
      }
      rate *= 1 + 0.06 * (day / DAYS_SIMULATED); // gentle back-to-school growth
      rate *= weekNoise[Math.floor((NOW_DAY - day) / 7)];

      const pVisit = clamp((rate / 7) * WEEKDAY_FACTOR[weekday], 0, 0.92);
      if (!isJoinDay && rng() >= pVisit) continue;

      let start: number;
      if (weekday >= 5) {
        start = clamp(gaussian(rng, 10.25, 1.9), 6, 19.5);
      } else {
        const [lo, hi] = rng() < 0.8 ? SLOT_RANGES[m.preferredSlot] : [5.5, 21];
        start = uniform(rng, lo, hi);
      }
      start = Math.round(start * 12) / 12; // 5-minute resolution

      // Today's visits only exist if they already started
      if (day === NOW_DAY && start > NOW_HOUR) continue;

      const duration = clamp(gaussian(rng, DURATION_BY_STYLE[m.style], 0.22), 0.5, Math.min(1.9, GYM.closeHour - start));
      const sets = Math.max(0, Math.round(duration * 17 * strengthShare + gaussian(rng, 0, 2)));

      visits.push({ member: m.index, day, start, duration, sets });
    }
  }

  return visits;
}

export const MEMBERS: Member[] = generateMembers();
export const VISITS: Visit[] = generateVisits(MEMBERS);

/** Visits grouped by member, in chronological order. */
export const VISITS_BY_MEMBER: Visit[][] = (() => {
  const grouped: Visit[][] = MEMBERS.map(() => []);
  for (const v of VISITS) grouped[v.member].push(v);
  return grouped;
})();
