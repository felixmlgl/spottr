import React, { useState, useRef } from 'react';
import { MuscleId } from '../types/schema';
import { MUSCLE_NAMES } from '../data/exerciseMuscles';
import { BODY_SILHOUETTE_PATH } from './BodySilhouette';

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

interface EllipseShape {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

// Heat zones positioned on the anatomical silhouette (~60% larger to fully fill regions and meet in middle)
// Front: front_delts (38,122), chest (80,150), biceps (38,165), forearms (25,215), abs (100,195), obliques (70,200), quads (78,300), calves (78,380), traps (100,90)
// Back: traps (100,100), rear_delts (38,122), triceps (38,165), lats (74,172), lower_back (100,215), glutes (82,245), hamstrings (78,310), calves (78,380)
const FRONT_MUSCLE_SHAPES: Partial<Record<MuscleId, EllipseShape[]>> = {
  chest: [
    { cx: 80, cy: 150, rx: 26, ry: 24 },
    { cx: 120, cy: 150, rx: 26, ry: 24 },
  ],
  front_delts: [
    { cx: 38, cy: 122, rx: 21, ry: 26 },
    { cx: 162, cy: 122, rx: 21, ry: 26 },
  ],
  biceps: [
    { cx: 38, cy: 165, rx: 20, ry: 32 },
    { cx: 162, cy: 165, rx: 20, ry: 32 },
  ],
  forearms: [
    { cx: 25, cy: 215, rx: 18, ry: 38 },
    { cx: 175, cy: 215, rx: 18, ry: 38 },
  ],
  abs: [
    { cx: 100, cy: 195, rx: 26, ry: 45 },
  ],
  obliques: [
    { cx: 70, cy: 200, rx: 16, ry: 29 },
    { cx: 130, cy: 200, rx: 16, ry: 29 },
  ],
  quads: [
    { cx: 78, cy: 300, rx: 24, ry: 64 },
    { cx: 122, cy: 300, rx: 24, ry: 64 },
  ],
  calves: [
    { cx: 78, cy: 380, rx: 21, ry: 54 },
    { cx: 122, cy: 380, rx: 21, ry: 54 },
  ],
  traps: [
    { cx: 100, cy: 90, rx: 28, ry: 22 },
  ],
};

const BACK_MUSCLE_SHAPES: Partial<Record<MuscleId, EllipseShape[]>> = {
  traps: [
    { cx: 100, cy: 100, rx: 29, ry: 26 },
  ],
  rear_delts: [
    { cx: 38, cy: 122, rx: 21, ry: 26 },
    { cx: 162, cy: 122, rx: 21, ry: 26 },
  ],
  triceps: [
    { cx: 38, cy: 165, rx: 20, ry: 32 },
    { cx: 162, cy: 165, rx: 20, ry: 32 },
  ],
  lats: [
    { cx: 74, cy: 172, rx: 20, ry: 36 },
    { cx: 126, cy: 172, rx: 20, ry: 36 },
  ],
  lower_back: [
    { cx: 100, cy: 215, rx: 26, ry: 26 },
  ],
  glutes: [
    { cx: 82, cy: 245, rx: 24, ry: 29 },
    { cx: 118, cy: 245, rx: 24, ry: 29 },
  ],
  hamstrings: [
    { cx: 78, cy: 310, rx: 24, ry: 64 },
    { cx: 122, cy: 310, rx: 24, ry: 64 },
  ],
  calves: [
    { cx: 78, cy: 380, rx: 21, ry: 54 },
    { cx: 122, cy: 380, rx: 21, ry: 54 },
  ],
};

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

  // Height and responsive width based on size
  const height = size === 'sm' ? 220 : size === 'lg' ? 380 : 300;
  const width = Math.round(height * (200 / 460));

  // Determine muscle color according to mode and values
  const getMuscleColor = (mId: MuscleId): string | null => {
    if (mode === 'recovery') {
      if (colorMap && colorMap[mId]) return colorMap[mId]!;
      const val = values[mId] ?? 1.0;
      if (val < 0.25) return '#FF3B30'; // very fatigued
      if (val < 0.5) return '#FF9500';  // fatigued
      if (val < 0.85) return '#FFCC00'; // recovering
      return '#34C759';                 // ready
    }

    // Trained / intensity mode: capped at vibrant #2DB84F (lightened from #1E8E3E for cleaner look)
    const intensity = values[mId] ?? 0;
    if (intensity <= 0) return null; // Untrained (stay base grey)
    if (intensity > 0.7) return '#2DB84F'; // heavy
    if (intensity > 0.35) return '#34C759'; // moderate
    return '#C7EFD1'; // light
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

    // Trained mode
    const intensity = values[mId] ?? 0;
    if (intensity > 0.7) return `${muscleName} · Heavy`;
    if (intensity > 0.35) return `${muscleName} · Moderate`;
    if (intensity > 0) return `${muscleName} · Light`;
    return `${muscleName} · Untrained`;
  };

  const handleMuscleEnter = (mId: MuscleId, e: React.MouseEvent) => {
    setHoveredMuscle(mId);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPointerPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMuscleMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPointerPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMuscleLeave = () => {
    setHoveredMuscle(null);
    setPointerPos(null);
  };

  const handleMuscleClick = (mId: MuscleId) => {
    setSelectedMuscle((prev) => (prev === mId ? null : mId));
  };

  const activeMuscle = hoveredMuscle || selectedMuscle;

  // Render one view (Front or Back) as an inline SVG with viewBox 0 0 200 460
  const renderFigureSvg = (
    view: 'front' | 'back',
    muscleShapeMap: Partial<Record<MuscleId, EllipseShape[]>>
  ) => {
    const clipId = `body-clip-${view}`;
    const blurFilterId = `heat-blur-${view}`;

    // Collect active muscles that have color
    const activeMuscleEntries = Object.entries(muscleShapeMap).filter(([id]) => {
      return getMuscleColor(id as MuscleId) !== null;
    });

    // In trained mode, sort entries by intensity so higher intensity cleanly caps overlaps without muddy dark blobs
    if (mode === 'intensity') {
      activeMuscleEntries.sort(([idA], [idB]) => {
        const valA = values[idA as MuscleId] ?? 0;
        const valB = values[idB as MuscleId] ?? 0;
        return valA - valB;
      });
    }

    return (
      <svg
        viewBox="0 0 200 460"
        style={{ width: `${width}px`, height: `${height}px` }}
        className="overflow-visible select-none"
      >
        <defs>
          {/* Exact body silhouette clip path using the smooth Catmull-Rom closed path */}
          <clipPath id={clipId}>
            <path d={BODY_SILHOUETTE_PATH} />
          </clipPath>

          {/* Gaussian blur (stdDeviation 8) for soft organic heat blending */}
          <filter id={blurFilterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" />
          </filter>

          {/* Radial gradients: full color out to ~70% of radius, then fade to 0 at edge */}
          {activeMuscleEntries.map(([id]) => {
            const mId = id as MuscleId;
            const color = getMuscleColor(mId);
            if (!color) return null;

            return (
              <radialGradient
                key={`grad-${view}-${mId}`}
                id={`heat-grad-${view}-${mId}`}
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="70%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </radialGradient>
            );
          })}
        </defs>

        {/* 1. Base body fill #E5E5EA */}
        <path d={BODY_SILHOUETTE_PATH} fill="#E5E5EA" />

        {/* 2. Soft feathered heat zones with radial gradients and stdDeviation 8 blur,
            clipped strictly inside the silhouette path */}
        <g clipPath={`url(#${clipId})`}>
          <g filter={`url(#${blurFilterId})`}>
            {activeMuscleEntries.map(([id, shapes]) => {
              const mId = id as MuscleId;
              if (!shapes) return null;

              const isHovered = activeMuscle === mId;
              // On hover: hovered zone gets slightly stronger (opacity 1.0),
              // other zones dim to 0.55-0.60; default covers full body in recovery mode
              const zoneOpacity = activeMuscle ? (isHovered ? 1.0 : 0.55) : (mode === 'recovery' ? 0.98 : 0.90);

              return (
                <g
                  key={`heat-${mId}`}
                  style={{
                    opacity: zoneOpacity,
                    transition: 'opacity 150ms ease',
                  }}
                >
                  {shapes.map((s, idx) => (
                    <ellipse
                      key={idx}
                      cx={s.cx}
                      cy={s.cy}
                      rx={s.rx}
                      ry={s.ry}
                      fill={`url(#heat-grad-${view}-${mId})`}
                    />
                  ))}
                </g>
              );
            })}
          </g>
        </g>

        {/* 3. Outer outline stroke #C7C7CC width 1.5 */}
        <path
          d={BODY_SILHOUETTE_PATH}
          fill="none"
          stroke="#C7C7CC"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="pointer-events-none"
        />

        {/* 4. Invisible interactive hit areas on top (strictly invisible, handling hover/tap) */}
        <g className="interactive-muscles">
          {Object.entries(muscleShapeMap).map(([id, shapes]) => {
            const mId = id as MuscleId;
            if (!shapes) return null;

            return (
              <g
                key={`hit-${mId}`}
                className="cursor-pointer"
                onClick={() => handleMuscleClick(mId)}
                onMouseEnter={(e) => handleMuscleEnter(mId, e)}
                onMouseMove={handleMuscleMove}
                onMouseLeave={handleMuscleLeave}
              >
                {shapes.map((s, idx) => (
                  <ellipse
                    key={idx}
                    cx={s.cx}
                    cy={s.cy}
                    rx={s.rx}
                    ry={s.ry}
                    fill="transparent"
                    stroke="none"
                    pointerEvents="all"
                  />
                ))}
              </g>
            );
          })}
        </g>
      </svg>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center select-none w-full ${className}`}
      onMouseLeave={handleMuscleLeave}
    >
      {/* Figures Row: Front and Back side by side */}
      <div className="flex items-center justify-center gap-6 sm:gap-14 w-full">
        {/* Front Figure */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center">
            {renderFigureSvg('front', FRONT_MUSCLE_SHAPES)}
          </div>
          <span className="text-[11px] font-medium text-[#8E8E93] mt-2">
            Front
          </span>
        </div>

        {/* Back Figure */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center">
            {renderFigureSvg('back', BACK_MUSCLE_SHAPES)}
          </div>
          <span className="text-[11px] font-medium text-[#8E8E93] mt-2">
            Back
          </span>
        </div>
      </div>

      {/* Floating Tooltip that follows pointer (Desktop) */}
      {hoveredMuscle && pointerPos && (
        <div
          className="hidden md:flex pointer-events-none absolute z-30 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-black/[0.06] text-xs items-center gap-2 transition-all duration-75"
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
          <span className="font-semibold text-[#1D1D1F]">
            {getTooltipString(hoveredMuscle)}
          </span>
        </div>
      )}

      {/* Active Muscle Info Pill / Mobile Tap Card */}
      {activeMuscle && (
        <div className="mt-4 px-4 py-2 rounded-2xl bg-white shadow-sm border border-black/[0.05] text-xs flex items-center gap-2.5 animate-in fade-in duration-150">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: getMuscleColor(activeMuscle) || '#C7C7CC' }}
          />
          <span className="font-semibold text-[#1D1D1F]">
            {getTooltipString(activeMuscle)}
          </span>
        </div>
      )}

      {/* Legend with Color Dots */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#6E6E73] pt-3 border-t border-black/[0.04] w-full">
        {mode === 'recovery' ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
              <span>Ready</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFCC00]" />
              <span>Recovering</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF9500]" />
              <span>Fatigued</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30]" />
              <span>Very fatigued</span>
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E5E5EA]" />
              <span>Untrained</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C7EFD1]" />
              <span>Light</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
              <span>Moderate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1E8E3E]" />
              <span>Heavy</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};
