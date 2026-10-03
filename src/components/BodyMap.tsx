import React, { useId, useRef, useState } from 'react';
import { MuscleId } from '../types/schema';
import { MUSCLE_NAMES } from '../data/exerciseMuscles';
import { BODY_BACK, BODY_FRONT, BodySlug, BodyView } from '../data/bodyPaths';

export interface BodyMapProps {
  /**
   * Values between 0.0 and 1.0 for intensity mode,
   * or recovery percent (0.0 to 1.0)
   */
  values?: Partial<Record<MuscleId, number>>;
  /**
   * Explicit color override per muscle (e.g. for recovery mode: #34C759, #FFCC00, #FF9500, #FF3B30)
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

const RECOVERY_LEGEND = [
  { label: 'Ready', color: '#34C759' },
  { label: 'Recovering', color: '#FFCC00' },
  { label: 'Fatigued', color: '#FF9500' },
  { label: 'Very fatigued', color: '#FF3B30' },
];

const MUSCLE_BASE = '#DCDCE1';
const BODY_BASE = '#E7E7EB';
const HAIR = '#C7C7CC';

/** Mix a hex color with white; amount 0..1 */
const tint = (hex: string, amount: number) => {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};

const recoveryGradient = (color: string) => ({ from: tint(color, 0.35), to: color });

export const BodyMap: React.FC<BodyMapProps> = ({
  values = {},
  colorMap,
  mode = 'intensity',
  getTooltipText,
  size = 'md',
  className = '',
}) => {
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleId | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleId | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
    if (mode === 'recovery') {
      if (colorMap && colorMap[mId]) return colorMap[mId]!;
      const val = values[mId] ?? 1.0;
      if (val < 0.25) return '#FF3B30'; // very fatigued
      if (val < 0.5) return '#FF9500'; // fatigued
      if (val < 0.85) return '#FFCC00'; // recovering
      return '#34C759'; // ready
    }
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
  // Recovery mode: "Hamstrings · Fatigued · ready in ~70h" (or "Hamstrings · Ready to train")
  // Trained mode: "Hamstrings · Heavy / Moderate / Light / Untrained"
  const getTooltipString = (mId: MuscleId): string => {
    const muscleName = MUSCLE_NAMES[mId] || mId;

    if (mode === 'recovery') {
      const custom = getTooltipText ? getTooltipText(mId) : '';
      if (custom && custom.toLowerCase().includes('ready to train')) {
        return `${muscleName} · Ready to train`;
      }

      // Extract hours if available in custom string (e.g. "72% (18h left)")
      const hoursMatch = custom.match(/(\d+)h/);
      let hours = hoursMatch ? hoursMatch[1] : null;

      const c = colorMap ? colorMap[mId] : undefined;
      const val = values[mId] ?? 1.0;

      if (c === '#FF3B30' || val < 0.25) {
        if (!hours) hours = '70';
        return `${muscleName} · Very fatigued · ready in ~${hours}h`;
      }
      if (c === '#FF9500' || val < 0.5) {
        if (!hours) hours = '48';
        return `${muscleName} · Fatigued · ready in ~${hours}h`;
      }
      if (c === '#FFCC00' || val < 0.85) {
        if (!hours) hours = '18';
        return `${muscleName} · Recovering · ready in ~${hours}h`;
      }
      return `${muscleName} · Ready to train`;
    }

    const level = intensityLevel(mId);
    return `${muscleName} · ${level ? INTENSITY_LEVELS[level].label : 'Untrained'}`;
  };

  const trackPointer = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPointerPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMuscleLeave = () => {
    setHoveredMuscle(null);
    setPointerPos(null);
  };

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
          const dimmed = !!activeMuscle && !isActive && !!gradient;
          const fill = gradient ? `url(#${gradId(mId!)})` : slug === 'hair' ? HAIR : mId ? MUSCLE_BASE : BODY_BASE;

          return (
            <g
              key={slug}
              fill={fill}
              filter={gradient ? `url(#bm-${uid}-${view}-glow)` : undefined}
              style={{ opacity: dimmed ? 0.45 : 1, transition: 'opacity 180ms ease' }}
              className={mId ? 'cursor-pointer' : undefined}
              onClick={mId ? () => setSelectedMuscle((prev) => (prev === mId ? null : mId)) : undefined}
              onMouseEnter={
                mId
                  ? (e) => {
                      setHoveredMuscle(mId);
                      trackPointer(e);
                    }
                  : undefined
              }
              onMouseMove={mId ? trackPointer : undefined}
              onMouseLeave={mId ? handleMuscleLeave : undefined}
            >
              {paths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  stroke={isActive ? '#FFFFFF' : 'none'}
                  strokeWidth={isActive ? 4 : 0}
                  strokeLinejoin="round"
                />
              ))}
            </g>
          );
        })}
      </svg>
    );
  };

  const legend =
    mode === 'recovery'
      ? RECOVERY_LEGEND.map(({ label, color }) => ({ label, ...recoveryGradient(color) }))
      : [
          { label: 'Untrained', from: MUSCLE_BASE, to: MUSCLE_BASE },
          ...Object.values(INTENSITY_LEVELS).map(({ label, from, to }) => ({ label, from, to })),
        ];

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center select-none w-full ${className}`}
      onMouseLeave={handleMuscleLeave}
    >
      {/* Figures Row: Front and Back side by side */}
      <div className="flex items-start justify-center gap-4 sm:gap-10 w-full">
        {(
          [
            ['front', 'Front', BODY_FRONT, FRONT_MUSCLES],
            ['back', 'Back', BODY_BACK, BACK_MUSCLES],
          ] as const
        ).map(([view, label, body, muscles]) => (
          <div key={view} className="flex-1 flex flex-col items-center" style={{ maxWidth }}>
            {renderFigure(view, body, muscles)}
            <span className="text-[11px] font-medium text-[#8E8E93] mt-2">{label}</span>
          </div>
        ))}
      </div>

      {/* Floating Tooltip that follows pointer (Desktop) */}
      {hoveredMuscle && pointerPos && (
        <div
          className="hidden md:flex pointer-events-none absolute z-30 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xl shadow-lg ring-1 ring-black/[0.05] text-xs items-center gap-2"
          style={{
            left: `${pointerPos.x}px`,
            top: `${Math.max(10, pointerPos.y - 42)}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: getMuscleColor(hoveredMuscle) || '#C7C7CC' }}
          />
          <span className="font-semibold text-[#1D1D1F]">{getTooltipString(hoveredMuscle)}</span>
        </div>
      )}

      {/* Active muscle pill (mobile taps, desktop clicks). Fixed-height slot so the card never resizes;
          on desktop the floating tooltip covers hover, so the pill only shows a clicked muscle there. */}
      <div className="mt-3 h-9 flex items-center justify-center">
        {activeMuscle ? (
          <div
            className={`px-4 py-2 rounded-full bg-white shadow-sm ring-1 ring-black/[0.04] text-xs flex items-center gap-2.5 animate-in fade-in duration-150 ${
              hoveredMuscle && hoveredMuscle !== selectedMuscle ? 'md:hidden' : ''
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getMuscleColor(activeMuscle) || '#C7C7CC' }}
            />
            <span className="font-semibold text-[#1D1D1F]">{getTooltipString(activeMuscle)}</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#8E8E93]">Tap a muscle for details</span>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#6E6E73] pt-3 border-t border-black/[0.04] w-full">
        {legend.map(({ label, from, to }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: `linear-gradient(180deg, ${from}, ${to})` }}
            />
            <span>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
