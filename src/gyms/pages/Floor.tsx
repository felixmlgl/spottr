import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Clock, Pause, Play, Users } from 'lucide-react';
import {
  DAY_LABELS,
  DAY_NAMES,
  formatHour,
  GYM,
  idleUnits,
  zoneAverage,
  ZONE_BY_ID,
  zoneDemand,
  zoneHourly,
  ZoneId,
  zoneOccupancy,
  zonePeaks,
  ZONES,
} from '../../mocks/gym';
import { FloorPlan, OCCUPANCY_GRADIENT } from '../components/FloorPlan';
import { axisProps, Card, ChartTooltip, DemoBadge, Eyebrow, highlightBar, PageHeader, Segmented } from '../components/ui';

const SLIDER_MIN = 6;
const SLIDER_MAX = 22;

const pct = (v: number) => `${Math.round(v * 100)}%`;

const ZoneDetail: React.FC<{ zoneId: ZoneId; day: number; hour: number }> = ({ zoneId, day, hour }) => {
  const zone = ZONE_BY_ID[zoneId];
  const capacity = zone.units.length;
  const occ = zoneOccupancy(zoneId, day, hour);
  const demand = zoneDemand(zoneId, day, hour);
  const waiting = demand - capacity;
  const hourly = zoneHourly(zoneId, day).filter((h) => h.hour >= SLIDER_MIN && h.hour <= SLIDER_MAX);
  const peaks = zonePeaks(zoneId, 3);
  const idle = idleUnits(zoneId);

  return (
    <Card className="flex flex-col gap-6 !p-6">
      <div>
        <Eyebrow>
          {DAY_NAMES[day]} · {formatHour(hour)}
        </Eyebrow>
        <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F] mt-0.5">{zone.name}</h2>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-5xl font-bold tracking-tight text-[#1D1D1F]">{pct(occ)}</span>
          <span className="text-sm text-[#6E6E73]">in use</span>
        </div>
        <p className="text-sm text-[#6E6E73] mt-1 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          ~{Math.min(capacity, Math.round(demand))} of {capacity} {zone.unitNoun} busy
          {waiting >= 0.5 && <span className="font-semibold text-[#1D1D1F]">· ~{Math.round(waiting)} waiting</span>}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4">
          <dt className="text-xs text-[#6E6E73]">Avg. utilization, {DAY_LABELS[day]}</dt>
          <dd className="text-xl font-bold text-[#1D1D1F] mt-0.5">{pct(zoneAverage(zoneId, day))}</dd>
        </div>
        <div className="bg-white rounded-2xl p-4">
          <dt className="text-xs text-[#6E6E73]">Avg. utilization, week</dt>
          <dd className="text-xl font-bold text-[#1D1D1F] mt-0.5">{pct(zoneAverage(zoneId))}</dd>
        </div>
      </dl>

      <div>
        <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide mb-2">{DAY_NAMES[day]} by hour</p>
        <div className="h-24 w-full" role="img" aria-label={`${zone.name} occupancy by hour on ${DAY_NAMES[day]}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly} margin={{ top: 2, right: 14, left: 14, bottom: 0 }} barCategoryGap="12%">
              <XAxis dataKey="hour" {...axisProps} fontSize={10} tickFormatter={formatHour} interval={3} height={16} />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof hourly)[number];
                  return <ChartTooltip title={`${DAY_LABELS[day]} ${formatHour(d.hour)}`} value={`${pct(d.occupancy)} in use`} />;
                }}
              />
              <Bar dataKey="occupancy" radius={[3, 3, 0, 0]} shape={highlightBar((i) => hourly[i].hour === hour)} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide mb-2">Peak times</p>
        <ul className="flex flex-col gap-1.5">
          {peaks.map((p) => (
            <li key={`${p.weekday}-${p.hour}`} className="flex items-center justify-between text-sm">
              <span className="text-[#1D1D1F] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#6E6E73]" />
                {DAY_NAMES[p.weekday]} {formatHour(p.hour)}–{formatHour(p.hour + 1)}
              </span>
              <span className="font-semibold text-[#1D1D1F] tabular-nums">
                {pct(p.occupancy)}
                {zoneDemand(zoneId, p.weekday, p.hour) - capacity >= 0.5 && (
                  <span className="font-normal text-[#6E6E73]"> · queue</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide mb-2">Idle equipment</p>
        {idle.length === 0 ? (
          <p className="text-sm text-[#6E6E73]">None. Every unit in this zone is in demand at peak.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {idle.map((u) => (
              <li key={u.id} className="flex items-center justify-between text-sm gap-3">
                <span className="text-[#1D1D1F]">{u.name}</span>
                <span className="text-[#6E6E73] text-right">unused {pct(1 - u.peakUtilization)} of peak hours</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};

export const Floor: React.FC = () => {
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState(18);
  const [selected, setSelected] = useState<ZoneId>('squat');
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setHour((h) => (h >= SLIDER_MAX ? SLIDER_MIN : h + 1));
    }, 700);
    return () => window.clearInterval(id);
  }, [playing]);

  const { occupancy, waiting } = useMemo(() => {
    const occupancy = {} as Record<ZoneId, number>;
    const waiting = {} as Record<ZoneId, boolean>;
    for (const z of ZONES) {
      occupancy[z.id] = zoneOccupancy(z.id, day, hour);
      waiting[z.id] = zoneDemand(z.id, day, hour) - z.units.length >= 0.5;
    }
    return { occupancy, waiting };
  }, [day, hour]);

  const idleUnitIds = useMemo(() => new Set(idleUnits(selected).map((u) => u.id)), [selected]);

  return (
    <div className="flex flex-col gap-8 pb-16">
      <PageHeader
        eyebrow={
          <>
            <span>{GYM.name}</span>
            <DemoBadge />
          </>
        }
        title="Floor"
        subtitle="How each zone is used through the day, averaged over the last 4 weeks. Click a zone for details."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
        <Card className="flex flex-col gap-5 !p-4 sm:!p-6">
          {/* Controls */}
          <div className="flex flex-col gap-4">
            <Segmented
              ariaLabel="Day of week"
              options={DAY_LABELS.map((label, i) => ({ id: i, label }))}
              value={day}
              onChange={setDay}
              className="self-start"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Pause day playback' : 'Play through the day'}
                className="w-9 h-9 shrink-0 rounded-full bg-white shadow-xs flex items-center justify-center text-[#1D1D1F] hover:bg-[#E8E8ED] transition-colors cursor-pointer"
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <label className="flex-1 flex flex-col gap-1">
                <span className="sr-only">Hour of day</span>
                <input
                  type="range"
                  min={SLIDER_MIN}
                  max={SLIDER_MAX}
                  step={1}
                  value={hour}
                  onChange={(e) => {
                    setPlaying(false);
                    setHour(Number(e.target.value));
                  }}
                  aria-valuetext={formatHour(hour)}
                  className="w-full accent-[#34C759] cursor-pointer"
                />
                <span className="flex justify-between text-[11px] text-[#6E6E73]">
                  <span>{formatHour(SLIDER_MIN)}</span>
                  <span>{formatHour(14)}</span>
                  <span>{formatHour(SLIDER_MAX)}</span>
                </span>
              </label>
              <span className="w-24 shrink-0 text-right text-sm font-semibold text-[#1D1D1F] tabular-nums">
                {DAY_LABELS[day]} {formatHour(hour)}
              </span>
            </div>
          </div>

          <FloorPlan
            occupancy={occupancy}
            waiting={waiting}
            selected={selected}
            idleUnitIds={idleUnitIds}
            onSelect={setSelected}
          />

          {/* Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-[#6E6E73]">
            <span className="font-medium">Share of equipment in use</span>
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <span>0%</span>
              <span className="h-2 flex-1 rounded-full" style={{ background: OCCUPANCY_GRADIENT }} />
              <span>100%</span>
            </div>
            <span>“queue” = members waiting · outlined = idle equipment</span>
          </div>
        </Card>

        <ZoneDetail zoneId={selected} day={day} hour={hour} />
      </div>
    </div>
  );
};
