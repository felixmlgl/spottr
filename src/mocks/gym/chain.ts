/**
 * Iron District Fitness as a small chain (fictional). Oakland is the location the rest of the demo simulates
 * in detail; Berkeley and Emeryville are summary figures only, so the chain view has something to compare.
 */

import { GYM } from './gym';
import { AT_RISK_MEMBERS, KPIS } from './metrics';

export interface ChainLocation {
  id: string;
  city: string;
  members: number;
  visitsThisWeek: number;
  visitsLastWeek: number;
  sessionsPerMember: number;
  atRisk: number;
  spottrBoxes: 1 | 2;
  cameras: number;
  /** Only Oakland has the full dashboard in this demo */
  detailed: boolean;
}

const kpi = (id: string) => KPIS.find((k) => k.id === id)!;

export const CHAIN_LOCATIONS: ChainLocation[] = [
  {
    id: 'oakland',
    city: GYM.city.replace(', CA', ''),
    members: GYM.memberCount,
    visitsThisWeek: kpi('visits').value,
    visitsLastWeek: kpi('visits').previous,
    sessionsPerMember: kpi('frequency').value,
    atRisk: AT_RISK_MEMBERS.length,
    spottrBoxes: 2,
    cameras: 6,
    detailed: true,
  },
  {
    id: 'berkeley',
    city: 'Berkeley',
    members: 840,
    visitsThisWeek: 2105,
    visitsLastWeek: 2048,
    sessionsPerMember: 2.5,
    atRisk: 71,
    spottrBoxes: 2,
    cameras: 8,
    detailed: false,
  },
  {
    id: 'emeryville',
    city: 'Emeryville',
    members: 410,
    visitsThisWeek: 802,
    visitsLastWeek: 841,
    sessionsPerMember: 1.96,
    atRisk: 58,
    spottrBoxes: 1,
    cameras: 3,
    detailed: false,
  },
];
