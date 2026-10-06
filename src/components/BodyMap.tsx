import React, { createContext, useContext, useId, useState } from 'react';
import { MuscleId, RecoveryStatus } from '../types/schema';
import { MUSCLE_NAMES } from '../data/exerciseMuscles';
import { BODY_BACK, BODY_FRONT, BodySlug, BodyView } from '../data/bodyPaths';
import { FEMALE_BODY_BACK, FEMALE_BODY_FRONT } from '../data/bodyPathsFemale';
import type { RecoveryCalculationResult } from '../services/recovery';
import type { BodyModel } from '../services/settings';

/** The figure every BodyMap below draws; the app provides the member's setting */
export const BodyModelContext = createContext<BodyModel>('male');

const BODIES: Record<BodyModel, { front: BodyView; back: BodyView }> = {
  male: { front: BODY_FRONT, back: BODY_BACK },
  female: { front: FEMALE_BODY_FRONT, back: FEMALE_BODY_BACK },
};

export interface BodyMapProps {
  /**
   * Values between 0.0 and 1.0 for intensity mode,
   * or recovery percent (0.0 to 1.0)
   */
  values?: Partial<Record<MuscleId, number>>;
  /**
   * Explicit color override per muscle; recovery mode otherwise blends red → green from the value
   */
  colorMap?: Partial<Record<MuscleId, string>>;
  /**
   * Mode: 'intensity' (shades of Apple green) or 'recovery' (status colors)
   */
  mode?: 'intensity' | 'recovery';
  /**
   * Custom label or status subtitle generator
   */
  getTooltipText?: (muscleId: MuscleId) => string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /**
   * Makes the map a muscle picker: the parent owns the selection and gets every tap or keypress on a muscle.
   * Without it, clicking a muscle just toggles its details pill.
   */
  selectedMuscle?: MuscleId | null;
  onSelectMuscle?: (muscleId: MuscleId) => void;
}

/**
 * Recovery colors from just trained to ready: red → orange → yellow → green. Green starts at 85%, where a muscle
 * counts as ready to train.
 */
const RECOVERY_STOPS: [number, string][] = [
  [0, '#FF3B30'],
  [0.35, '#FF9500'],
  [0.65, '#FFCC00'],
  [0.85, '#34C759'],
];

/** Color for a muscle that is `recovered` (0..1) of the way back, blended between the neighbouring stops */
export const recoveryColor = (recovered: number): string => {
  const v = Math.min(1, Math.max(0, recovered));
  const upper = RECOVERY_STOPS.findIndex(([at]) => at >= v);
  if (upper === 0) return RECOVERY_STOPS[0][1];
  if (upper === -1) return RECOVERY_STOPS[RECOVERY_STOPS.length - 1][1];
  const [a, from] = RECOVERY_STOPS[upper - 1];
  const [b, to] = RECOVERY_STOPS[upper];
  return mixHex(from, to, (v - a) / (b - a));
};

const recoveryLabel = (item: RecoveryStatus) => {
  if (item.status === 'ready') return 'Ready to train';
  if (item.status === 'recovering') return 'Recovering';
  return item.recovery_percent < 25 ? 'Very fatigued' : 'Fatigued';
};

/** BodyMap props that color every muscle by how recovered it is */
export function recoveryMapProps(
  recovery: RecoveryCalculationResult
): Pick<BodyMapProps, 'mode' | 'values' | 'getTooltipText'> {
  const values: Partial<Record<MuscleId, number>> = {};
  Object.values(recovery.muscles).forEach((item) => {
    values[item.muscle_id] = item.recovery_percent / 100;
  });
  return {
    mode: 'recovery',
    values,
    getTooltipText: (muscleId) => {
      const item = recovery.muscles[muscleId];
      if (!item) return '';
      if (item.status === 'ready') return recoveryLabel(item);
      return `${recoveryLabel(item)} · ready in ~${item.hours_remaining}h`;
    },
  };
}

/** Which of our muscle ids each MuscleMap body part shows, per view. Unmapped parts stay neutral. */
const FRONT_MUSCLES: Partial<Record<BodySlug, MuscleId>> = {
  chest: 'chest',
  deltoids: 'front_delts',
  biceps: 'biceps',
  triceps: 'triceps',
  forearm: 'forearms',
  abs: 'abs',
  obliques: 'obliques',
  trapezius: 'traps',
  quadriceps: 'quads',
  calves: 'calves',
};

const BACK_MUSCLES: Partial<Record<BodySlug, MuscleId>> = {
  trapezius: 'traps',
  deltoids: 'rear_delts',
  'upper-back': 'lats',
  triceps: 'triceps',
  forearm: 'forearms',
  'lower-back': 'lower_back',
  gluteal: 'glutes',
  hamstring: 'hamstrings',
  calves: 'calves',
};

/** Top → bottom stops for each trained level, so every muscle reads as a lit, rounded shape */
const INTENSITY_LEVELS = {
  light: { label: 'Light', from: '#D4F5DD', to: '#A2E4B4' },
  moderate: { label: 'Moderate', from: '#7BE495', to: '#34C759' },
  heavy: { label: 'Heavy', from: '#3DD164', to: '#1E8E3E' },
} as const;
type IntensityLevel = keyof typeof INTENSITY_LEVELS;

const MUSCLE_BASE = '#DCDCE1';
const PICKED_STROKE = '#1D1D1F';
const BODY_BASE = '#E7E7EB';
const HAIR = '#C7C7CC';

/** Blend hex color `a` toward `b`; amount 0..1 */
const mixHex = (a: string, b: string, amount: number) => {
  const [na, nb] = [a, b].map((hex) => parseInt(hex.slice(1), 16));
  const [r, g, bl] = [16, 8, 0].map((shift) => {
    const ca = (na >> shift) & 255;
    return Math.round(ca + (((nb >> shift) & 255) - ca) * amount);
  });
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
};

/** Mix a hex color with white; amount 0..1 */
const tint = (hex: string, amount: number) => mixHex(hex, '#FFFFFF', amount);

const recoveryGradient = (color: string) => ({ from: tint(color, 0.35), to: color });

export const BodyMap: React.FC<BodyMapProps> = ({
  values = {},
  colorMap,
  mode = 'intensity',
  getTooltipText,
  size = 'md',
  className = '',
  selectedMuscle: pickedMuscle = null,
  onSelectMuscle,
}) => {
  const figure = BODIES[useContext(BodyModelContext)];
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleId | null>(null);
  const [ownSelection, setOwnSelection] = useState<MuscleId | null>(null);
  const isPicker = !!onSelectMuscle;
  const selectedMuscle = isPicker ? pickedMuscle : ownSelection;
  const selectMuscle = (mId: MuscleId) =>
    onSelectMuscle ? onSelectMuscle(mId) : setOwnSelection((prev) => (prev === mId ? null : mId));
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  const maxWidth = size === 'sm' ? 120 : size === 'lg' ? 210 : 165;

  const intensityLevel = (mId: MuscleId): IntensityLevel | null => {
    const v = values[mId] ?? 0;
    if (v <= 0) return null;
    if (v > 0.7) return 'heavy';
    if (v > 0.35) return 'moderate';
    return 'light';
  };

  // Solid color for a muscle (tooltip dots); null when untrained
  const getMuscleColor = (mId: MuscleId): string | null => {
    if (mode === 'recovery') return colorMap?.[mId] ?? recoveryColor(values[mId] ?? 1);
    const level = intensityLevel(mId);
    return level ? INTENSITY_LEVELS[level].to : null;
  };

  // Gradient stops for a muscle's fill; null when it should stay neutral
  const getMuscleGradient = (mId: MuscleId): { from: string; to: string } | null => {
    if (mode === 'recovery') return recoveryGradient(getMuscleColor(mId)!);
    const level = intensityLevel(mId);
    return level ? INTENSITY_LEVELS[level] : null;
  };

  // Tooltip string generator:
  // Recovery mode: "Hamstrings · Fatigued · ready in ~70h" (or "Hamstrings · Ready to train"), from getTooltipText
  // Trained mode: "Hamstrings · Heavy / Moderate / Light / Untrained"
  const getTooltipString = (mId: MuscleId): string => {
    const muscleName = MUSCLE_NAMES[mId] || mId;

    if (mode === 'recovery') {
      const custom = getTooltipText?.(mId);
      if (custom) return `${muscleName} · ${custom}`;
      const val = values[mId] ?? 1;
      return `${muscleName} · ${val >= 0.85 ? 'Ready to train' : val >= 0.45 ? 'Recovering' : 'Fatigued'}`;
    }

    const level = intensityLevel(mId);
    return `${muscleName} · ${level ? INTENSITY_LEVELS[level].label : 'Untrained'}`;
  };

  const handleMuscleLeave = () => setHoveredMuscle(null);

  const activeMuscle = hoveredMuscle || selectedMuscle;

  const renderFigure = (view: 'front' | 'back', body: BodyView, muscles: Partial<Record<BodySlug, MuscleId>>) => {
    // One gradient per muscle that's lit in this view (shared by both sides of the body)
    const lit = new Map<MuscleId, { from: string; to: string }>();
    Object.values(muscles).forEach((mId) => {
      const g = getMuscleGradient(mId!);
      if (g) lit.set(mId!, g);
    });
    const gradId = (mId: MuscleId) => `bm-${uid}-${view}-${mId}`;

    return (
      <svg viewBox={body.viewBox} className="w-full h-auto overflow-visible select-none" role="img" aria-label={`${view} view`}>
        <defs>
          {[...lit].map(([mId, g]) => (
            <linearGradient key={mId} id={gradId(mId)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={g.from} />
              <stop offset="100%" stopColor={g.to} />
            </linearGradient>
          ))}
          <filter id={`bm-${uid}-${view}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#000" floodOpacity="0.1" />
          </filter>
        </defs>

        {body.parts.map(({ slug, paths }) => {
          const mId = muscles[slug];
          const gradient = mId ? lit.get(mId) : undefined;
          const isActive = !!mId && activeMuscle === mId;
          // A picker keeps its selection outlined and only dims on hover, so the map stays readable
          const isPicked = isPicker && !!mId && selectedMuscle === mId;
          const focus = isPicker ? hoveredMuscle : activeMuscle;
          const dimmed = !!focus && focus !== mId && !!gradient;
          const fill = gradient ? `url(#${gradId(mId!)})` : slug === 'hair' ? HAIR : mId ? MUSCLE_BASE : BODY_BASE;

          return (
            <g
              key={slug}
              fill={fill}
              filter={gradient ? `url(#bm-${uid}-${view}-glow)` : undefined}
              style={{ opacity: dimmed ? 0.45 : 1, transition: 'opacity 180ms ease' }}
              className={mId ? 'cursor-pointer outline-none' : undefined}
              onClick={mId ? () => selectMuscle(mId) : undefined}
              {...(isPicker && mId
                ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': MUSCLE_NAMES[mId],
                    'aria-pressed': isPicked,
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectMuscle(mId);
                      }
                    },
                    onFocus: () => setHoveredMuscle(mId),
                    onBlur: () => setHoveredMuscle(null),
                  }
                : {})}
              onMouseEnter={mId ? () => setHoveredMuscle(mId) : undefined}
              onMouseLeave={mId ? handleMuscleLeave : undefined}
            >
              {paths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  stroke={isPicked ? PICKED_STROKE : isActive ? '#FFFFFF' : 'none'}
                  strokeWidth={isPicked ? 3 : isActive ? 4 : 0}
                  strokeLinejoin="round"
                />
              ))}
            </g>
          );
        })}
      </svg>
    );
  };

  const intensityLegend = [
    { label: 'Untrained', from: MUSCLE_BASE, to: MUSCLE_BASE },
    ...Object.values(INTENSITY_LEVELS).map(({ label, from, to }) => ({ label, from, to })),
  ];

  return (
    <div className={`flex flex-col items-center select-none w-full ${className}`} onMouseLeave={handleMuscleLeave}>
      {/* Figures Row: Front and Back side by side */}
      <div className="flex items-start justify-center gap-4 sm:gap-10 w-full">
        {(
          [
            ['front', 'Front', figure.front, FRONT_MUSCLES],
            ['back', 'Back', figure.back, BACK_MUSCLES],
          ] as const
        ).map(([view, label, body, muscles]) => (
          <div key={view} className="flex-1 flex flex-col items-center" style={{ maxWidth }}>
            {renderFigure(view, body, muscles)}
            <span className="text-[11px] font-medium text-[#8E8E93] mt-2">{label}</span>
          </div>
        ))}
      </div>

      {/* Details for the hovered (or else selected) muscle. It sits in a fixed-height slot below the figures, so it
          never covers the body and the card never resizes. */}
      <div className="mt-3 h-9 w-full flex items-center justify-center">
        {activeMuscle ? (
          <div className="max-w-full px-4 py-2 rounded-full bg-white shadow-sm ring-1 ring-black/[0.04] text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getMuscleColor(activeMuscle) || '#C7C7CC' }}
            />
            <span className="font-semibold text-[#1D1D1F] truncate">{getTooltipString(activeMuscle)}</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#8E8E93]">Tap a muscle for details</span>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#6E6E73] pt-3 border-t border-black/[0.04] w-full">
        {mode === 'recovery' ? (
          <span className="flex items-center gap-2">
            <span>Fatigued</span>
            <span
              className="w-32 h-2.5 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${RECOVERY_STOPS.map(([at, color]) => `${color} ${at * 100}%`).join(', ')})`,
              }}
            />
            <span>Ready</span>
          </span>
        ) : (
          intensityLegend.map(({ label, from, to }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: `linear-gradient(180deg, ${from}, ${to})` }}
              />
              <span>{label}</span>
            </span>
          ))
        )}
      </div>
    </div>
  );
};
