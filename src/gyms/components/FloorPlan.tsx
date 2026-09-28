import React from 'react';
import { FLOOR_VIEWBOX, ZoneId, ZONES } from '../../mocks/gym';

/** Sequential single-hue (green) ramp for occupancy 0..1. */
const RAMP: [number, [number, number, number]][] = [
  [0, [236, 248, 239]],
  [0.5, [134, 214, 153]],
  [1, [31, 122, 53]],
];

export function occupancyColor(value: number): string {
  const v = Math.min(1, Math.max(0, value));
  const i = v <= RAMP[1][0] ? 0 : 1;
  const [a, ca] = RAMP[i];
  const [b, cb] = RAMP[i + 1];
  const t = (v - a) / (b - a);
  const mix = ca.map((c, k) => Math.round(c + (cb[k] - c) * t));
  return `rgb(${mix.join(',')})`;
}

export const OCCUPANCY_GRADIENT = `linear-gradient(to right, ${[0, 0.25, 0.5, 0.75, 1].map(occupancyColor).join(', ')})`;

interface FloorPlanProps {
  occupancy: Record<ZoneId, number>;
  waiting: Record<ZoneId, boolean>;
  selected: ZoneId;
  idleUnitIds: Set<string>;
  onSelect: (zone: ZoneId) => void;
}

export const FloorPlan: React.FC<FloorPlanProps> = ({ occupancy, waiting, selected, idleUnitIds, onSelect }) => (
  <svg
    viewBox={`0 0 ${FLOOR_VIEWBOX.w} ${FLOOR_VIEWBOX.h}`}
    className="w-full h-auto select-none"
    role="group"
    aria-label="Gym floor plan, zones colored by occupancy"
  >
    {/* Building shell with entrance gap */}
    <rect x={8} y={8} width={FLOOR_VIEWBOX.w - 16} height={608} rx={20} fill="#FFFFFF" />
    <path
      d={`M 540 616 L 28 616 Q 8 616 8 596 L 8 28 Q 8 8 28 8 L 972 8 Q 992 8 992 28 L 992 596 Q 992 616 972 616 L 660 616`}
      fill="none"
      stroke="#D1D1D6"
      strokeWidth={2}
    />
    <text x={600} y={636} textAnchor="middle" fontSize={16} fill="#6E6E73" fontWeight={500}>
      Entrance
    </text>

    {ZONES.map((zone) => {
      const occ = occupancy[zone.id];
      const isSelected = zone.id === selected;
      const pct = Math.round(occ * 100);
      const label = `${zone.name} · ${pct}%${waiting[zone.id] ? ' · queue' : ''}`;
      const chipW = label.length * 10.2 + 28;
      const { x, y, w } = zone.rect;
      return (
        <g
          key={zone.id}
          role="button"
          tabIndex={0}
          aria-pressed={isSelected}
          aria-label={`${zone.name}: ${pct}% in use${waiting[zone.id] ? ', members waiting' : ''}`}
          onClick={() => onSelect(zone.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(zone.id);
            }
          }}
          className="cursor-pointer outline-none group"
        >
          <rect
            x={x}
            y={y}
            width={w}
            height={zone.rect.h}
            rx={16}
            fill={occupancyColor(occ)}
            stroke={isSelected ? '#1D1D1F' : 'transparent'}
            strokeWidth={3}
            className="transition-[fill] duration-300 group-hover:opacity-90 group-focus-visible:stroke-[#1D1D1F]"
          />
          {zone.units.map((u) => (
            <rect
              key={u.id}
              x={u.rect.x}
              y={u.rect.y}
              width={u.rect.w}
              height={u.rect.h}
              rx={4}
              fill="#FFFFFF"
              fillOpacity={0.6}
              stroke={isSelected && idleUnitIds.has(u.id) ? '#1D1D1F' : 'none'}
              strokeWidth={2.5}
            >
              <title>{u.name}</title>
            </rect>
          ))}
          {/* Label chip: white background keeps text legible on every ramp step */}
          <rect x={x + 10} y={y + 10} width={Math.min(chipW, w - 20)} height={32} rx={16} fill="#FFFFFF" fillOpacity={0.94} />
          <text x={x + 24} y={y + 32} fontSize={18} fontWeight={600} fill="#1D1D1F">
            {label}
          </text>
        </g>
      );
    })}
  </svg>
);
