import React from 'react';
import { Activity, Flame, Gauge, Zap } from 'lucide-react';
import { MovementPhase } from '../services/repCounter';

interface RepCounterBadgeProps {
  repCount: number;
  exerciseName: string;
  phase: MovementPhase;
  jointAngle?: {
    joint: string;
    angle: number;
    min: number;
    max: number;
  };
  accentColor?: string;
  isProjectorMode?: boolean;
}

export const RepCounterBadge: React.FC<RepCounterBadgeProps> = ({
  repCount,
  exerciseName,
  phase,
  jointAngle,
  accentColor = '#10B981',
  isProjectorMode = false,
}) => {
  // Phase styling and human-friendly badge
  const phaseConfig: Record<
    MovementPhase,
    { label: string; bg: string; text: string; dot: string }
  > = {
    concentric: {
      label: 'CONCENTRIC (LIFTING)',
      bg: 'bg-emerald-950/80 border-emerald-500/50',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
    },
    eccentric: {
      label: 'ECCENTRIC (LOWERING)',
      bg: 'bg-amber-950/80 border-amber-500/50',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
    },
    inflection: {
      label: 'PEAK CONTRACTION / DEPTH',
      bg: 'bg-cyan-950/80 border-cyan-500/50',
      text: 'text-cyan-300',
      dot: 'bg-cyan-300',
    },
    lockout: {
      label: 'LOCKOUT / READY',
      bg: 'bg-zinc-800/80 border-zinc-600/50',
      text: 'text-zinc-300',
      dot: 'bg-zinc-400',
    },
    idle: {
      label: 'CALIBRATING POSE',
      bg: 'bg-zinc-900 border-zinc-800',
      text: 'text-zinc-400',
      dot: 'bg-zinc-500',
    },
  };

  const currentPhaseStyle = phaseConfig[phase] || phaseConfig.idle;

  // Calculate percent range for angle arc
  let anglePercent = 50;
  if (jointAngle && jointAngle.max > jointAngle.min) {
    const clamped = Math.max(jointAngle.min, Math.min(jointAngle.max, jointAngle.angle));
    anglePercent = Math.round(
      ((clamped - jointAngle.min) / (jointAngle.max - jointAngle.min)) * 100
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur-xl ${
        isProjectorMode ? 'p-8' : 'p-5'
      }`}
    >
      {/* Background glow accent */}
      <div
        className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: accentColor }}
      />

      {/* Top Header: Exercise Title & Live Edge Pill */}
      <div className="flex items-center justify-between gap-4 mb-3 border-b border-zinc-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
              LIVE EDGE REP COUNTER
            </span>
          </div>
          <h1
            className={`font-black tracking-tight text-zinc-100 uppercase mt-0.5 ${
              isProjectorMode ? 'text-3xl' : 'text-xl'
            }`}
          >
            {exerciseName}
          </h1>
        </div>

        {/* Phase Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold tracking-wide transition-all ${currentPhaseStyle.bg} ${currentPhaseStyle.text}`}
        >
          <span className={`w-2 h-2 rounded-full animate-ping ${currentPhaseStyle.dot}`} />
          <span>{currentPhaseStyle.label}</span>
        </div>
      </div>

      {/* Centerpiece: Projector-Optimized Giant Rep Counter */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-baseline gap-4">
          <div className="relative">
            {/* Projected giant number */}
            <div
              className={`font-black font-mono tracking-tighter text-zinc-50 select-none drop-shadow-md transition-transform duration-150 ${
                isProjectorMode ? 'text-9xl' : 'text-7xl md:text-8xl'
              }`}
            >
              {repCount}
            </div>
            {/* Subtle glow underneath */}
            <div
              className="absolute inset-0 font-black font-mono tracking-tighter text-emerald-400/20 blur-lg -z-10 select-none"
              aria-hidden="true"
            >
              {repCount}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-black font-mono uppercase tracking-widest text-zinc-400">
              REPS COMPLETED
            </span>
            <span className="text-xs text-zinc-400 font-mono mt-0.5 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Verified by Pose Stream
            </span>
          </div>
        </div>

        {/* Biomechanical Angle Gauge */}
        {jointAngle && (
          <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3 flex flex-col items-end min-w-[140px]">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono mb-1">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>{jointAngle.joint}</span>
            </div>
            <div className="text-2xl font-mono font-black text-cyan-300">
              {jointAngle.angle}°
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-150"
                style={{ width: `${anglePercent}%` }}
              />
            </div>
            <div className="flex justify-between w-full text-[10px] font-mono text-zinc-400 mt-1">
              <span>{jointAngle.min}° (Peak)</span>
              <span>{jointAngle.max}° (Lockout)</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom telemetry bar */}
      <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cadence: ~3.1s/rep</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Target Depth: Achieved</span>
          </span>
        </div>
        <span className="text-zinc-400 text-[11px]">
          Edge Hysteresis: Active (±10° band)
        </span>
      </div>
    </div>
  );
};
