import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Share2,
  Calendar,
  Layers,
  ChevronRight,
  Shield,
  Loader2,
} from 'lucide-react';
import { WorkoutSummary as WorkoutSummaryType } from '../types/schema';
import { summaryService } from '../services/summary';

interface WorkoutSummaryProps {
  summary: WorkoutSummaryType;
  anonymousTag: string;
  onRestart: () => void;
  onBackToLive: () => void;
}

export const WorkoutSummary: React.FC<WorkoutSummaryProps> = ({
  summary,
  anonymousTag,
  onRestart,
  onBackToLive,
}) => {
  const [recapText, setRecapText] = useState<string>('');
  const [isLoadingRecap, setIsLoadingRecap] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const comparison = summaryService.getSessionComparison(summary);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingRecap(true);

    summaryService
      .generateRecap(summary)
      .then((res) => {
        if (isMounted) {
          setRecapText(res);
          setIsLoadingRecap(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setRecapText(summaryService.generateLocalRecap(summary));
          setIsLoadingRecap(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [summary]);

  const handleRegenerateRecap = async () => {
    setIsLoadingRecap(true);
    const text = await summaryService.generateRecap(summary);
    setRecapText(text);
    setIsLoadingRecap(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(
      `Spottr Workout Summary:\n${anonymousTag}\nTotal Reps: ${summary.total_reps}\nDuration: ${summary.total_duration_s}s\nRecap: ${recapText}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden animate-in fade-in duration-300">
      {/* Background ambient lighting */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
              WORKOUT COMPLETED
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              {anonymousTag}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-100 uppercase">
            Session Performance Summary
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>Automatically captured via Edge Camera Stream</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-mono transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Export Summary'}</span>
          </button>
          <button
            onClick={onRestart}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold font-mono transition-colors shadow-lg shadow-emerald-500/20"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-4 flex flex-col">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
            Total Reps
          </span>
          <span className="text-4xl md:text-5xl font-black font-mono text-zinc-100 mt-1">
            {summary.total_reps}
          </span>
          <span className="text-[11px] font-mono text-emerald-400 mt-1">
            +{comparison.repsDeltaPercent}% vs Last Session
          </span>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-4 flex flex-col">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Duration
          </span>
          <span className="text-4xl md:text-5xl font-black font-mono text-zinc-100 mt-1">
            {summary.total_duration_s}s
          </span>
          <span className="text-[11px] font-mono text-zinc-400 mt-1">
            Active under tension
          </span>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-4 flex flex-col">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            Working Sets
          </span>
          <span className="text-4xl md:text-5xl font-black font-mono text-zinc-100 mt-1">
            {summary.sessions.length}
          </span>
          <span className="text-[11px] font-mono text-zinc-400 mt-1">
            Identified exercises
          </span>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-4 flex flex-col">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Avg Cadence
          </span>
          <span className="text-4xl md:text-5xl font-black font-mono text-zinc-100 mt-1">
            {summary.total_reps > 0
              ? (summary.total_duration_s / summary.total_reps).toFixed(1)
              : '0'}
            s
          </span>
          <span className="text-[11px] font-mono text-amber-400 mt-1">
            Controlled tempo
          </span>
        </div>
      </div>

      {/* AI Coach Personalized Recap Card (Gemini 3.8 Flash) */}
      <div className="bg-gradient-to-r from-emerald-950/30 via-zinc-950/60 to-cyan-950/30 border border-emerald-500/30 rounded-xl p-5 mb-6 relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400">
              Personalized Workout Recap (Gemini AI Coach)
            </span>
          </div>
          <button
            onClick={handleRegenerateRecap}
            disabled={isLoadingRecap}
            className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
          >
            {isLoadingRecap && <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />}
            Refresh
          </button>
        </div>

        {isLoadingRecap ? (
          <div className="flex items-center gap-3 py-2 text-zinc-400 text-sm font-mono animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Analyzing repetition kinematics and generating coach feedback...</span>
          </div>
        ) : (
          <p className="text-sm text-zinc-200 leading-relaxed font-sans font-medium">
            "{recapText}"
          </p>
        )}
      </div>

      {/* Exercises Done Breakdown Table */}
      <div className="mb-6">
        <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider mb-3">
          Exercises Completed
        </h3>
        <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/80">
          {summary.sessions.map((session, idx) => (
            <div
              key={idx}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-zinc-800/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-mono font-bold text-zinc-300 text-xs">
                  0{idx + 1}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-100">
                    {session.exercise_name}
                  </h4>
                  <p className="text-xs text-zinc-400 font-mono">
                    Timeframe: {session.start_time.toFixed(1)}s - {session.end_time.toFixed(1)}s
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-xs text-zinc-400 block font-mono">
                    Repetitions
                  </span>
                  <span className="text-xl font-mono font-bold text-emerald-400">
                    {session.rep_count} Reps
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-400 block font-mono">
                    Pace
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-300">
                    {session.rep_count > 0
                      ? ((session.end_time - session.start_time) / session.rep_count).toFixed(1)
                      : '0'}
                    s / rep
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Rep Timeline Chart */}
      <div className="mb-6">
        <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Session Timeline & Rep Cadence</span>
          <span className="text-[10px] text-zinc-400">0s → {summary.total_duration_s}s</span>
        </h3>
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4">
          <div className="relative h-12 w-full bg-zinc-900 rounded-lg overflow-hidden flex items-center px-2">
            {/* Background gridlines */}
            {[0.25, 0.5, 0.75].map((pct) => (
              <div
                key={pct}
                className="absolute top-0 bottom-0 border-l border-zinc-800"
                style={{ left: `${pct * 100}%` }}
              />
            ))}

            {/* Rep spikes */}
            {summary.sessions.flatMap((s) => s.rep_timestamps).map((ts, i) => {
              const leftPercent = (ts / Math.max(summary.total_duration_s, 1)) * 100;
              return (
                <div
                  key={i}
                  className="absolute top-2 bottom-2 w-1.5 bg-emerald-400 rounded-full shadow-sm shadow-emerald-400/50 group cursor-pointer transition-transform hover:scale-125"
                  style={{ left: `${Math.min(98, Math.max(1, leftPercent))}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 text-[10px] font-mono px-1.5 py-0.5 rounded text-white whitespace-nowrap pointer-events-none transition-opacity">
                    Rep #{i + 1} at {ts.toFixed(1)}s
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 mt-2">
            <span>Start (0.0s)</span>
            <span className="text-emerald-400 font-semibold">
              ● Rep Spikes Registered by Camera
            </span>
            <span>Finish ({summary.total_duration_s}s)</span>
          </div>
        </div>
      </div>

      {/* Compared to Last Session (Placeholder) */}
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2 text-zinc-200 text-xs font-bold font-mono uppercase tracking-wider">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Compared to Historical Session ({comparison.previousSessionDate})</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          {comparison.highlights.map((highlight, idx) => (
            <div
              key={idx}
              className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-3 text-xs text-zinc-300 flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{highlight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
        <button
          onClick={onBackToLive}
          className="text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
        >
          ← Return to Live Video Stream
        </button>
        <span className="text-[11px] font-mono text-zinc-400">
          Spottr Edge AI Engine • v1.0.0
        </span>
      </div>
    </div>
  );
};
