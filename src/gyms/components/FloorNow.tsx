import React from 'react';
import { Link } from '../../router';
import { DAY_LABELS, formatHour, KPIS, NOW_DAY, NOW_HOUR, weekdayOf, zoneOccupancy, ZONES } from '../../mocks/gym';
import { TickGauge } from '../../components/TickGauge';
import { InfoTip } from '../../components/Disclosure';
import { OpenArrow } from '../../components/Tile';

const pct = (v: number) => `${Math.round(v * 100)}%`;

// Floor right now: zone use is the 4-week average for this weekday and hour (same numbers as the Floor page)
const NOW_WEEKDAY = weekdayOf(NOW_DAY);
const NOW_SLOT = Math.floor(NOW_HOUR);
export const ZONES_NOW = ZONES.map((zone) => ({ zone, occ: zoneOccupancy(zone.id, NOW_WEEKDAY, NOW_SLOT) })).sort(
  (a, b) => b.occ - a.occ,
);
const UNITS = ZONES.reduce((sum, z) => sum + z.units.length, 0);
const FLOOR_NOW = ZONES_NOW.reduce((sum, r) => sum + r.occ * r.zone.units.length, 0) / UNITS;
const FULLEST = ZONES_NOW[0];
export const NOW_SLOT_LABEL = `${DAY_LABELS[NOW_WEEKDAY]} ${formatHour(NOW_SLOT)}–${formatHour(NOW_SLOT + 1)}`;
const MEMBERS_IN = KPIS.find((k) => k.id === 'now')!.value;

/** Floor status: three headline numbers over a tick gauge of how much equipment is in use. `to` adds an open arrow. */
export const FloorStatus: React.FC<{ className?: string; to?: string }> = ({ className = '', to }) => (
  <section className={`panel p-6 sm:p-7 flex flex-col gap-6 ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-medium text-ink">Floor status</h2>
        <p className="hud-label mt-0.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-lime ring-1 ring-black/15 animate-pulse" />
          Right now
          <InfoTip label="Where these numbers come from">
            Members in: live count. Equipment and zones: the 4-week average for {NOW_SLOT_LABEL}.
          </InfoTip>
        </p>
      </div>
      {to && (
        <Link to={to} aria-label="Open the floor" className="group text-ink">
          <OpenArrow />
        </Link>
      )}
    </div>
    <dl className="grid grid-cols-3 gap-3">
      <div className="flex flex-col-reverse">
        <dt className="text-sm text-ink-2 mt-1.5">members in</dt>
        <dd className="num text-4xl text-ink">{MEMBERS_IN}</dd>
      </div>
      <div className="flex flex-col-reverse">
        <dt className="text-sm text-ink-2 mt-1.5">equipment in use</dt>
        <dd className="num text-4xl text-ink">
          <span className="marker">{pct(FLOOR_NOW)}</span>
        </dd>
      </div>
      <div className="flex flex-col-reverse">
        <dt className="text-sm text-ink-2 mt-1.5">
          {FULLEST.zone.name} {FULLEST.occ >= 1 ? 'full' : 'busiest'}
        </dt>
        <dd className={`num text-4xl ${FULLEST.occ >= 1 ? 'text-[#D93636]' : 'text-ink'}`}>{pct(FULLEST.occ)}</dd>
      </div>
    </dl>
    <TickGauge value={FLOOR_NOW} label={`${pct(FLOOR_NOW)} of equipment in use`} className="w-full mt-auto text-ink" />
  </section>
);
