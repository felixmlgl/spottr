import React from 'react';
import { Camera, ChevronRight, Dumbbell, ShieldCheck, Video } from 'lucide-react';
import { ScenarioMetadata } from '../types/schema';

interface ScenarioPickerProps {
  scenarios: ScenarioMetadata[];
  selectedScenarioId: string;
  onSelectScenario: (scenarioId: string) => void;
  onCustomVideoLoaded?: (file: File) => void;
  disabled?: boolean;
}

export const ScenarioPicker: React.FC<ScenarioPickerProps> = ({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  onCustomVideoLoaded,
  disabled = false,
}) => {
  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              1. Camera Feed / Scenario
            </h2>
            <p className="text-xs text-zinc-400">
              Select an edge RTSP stream or gym zone
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          ONVIF 1080P
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {scenarios.map((scenario) => {
          const isSelected = scenario.id === selectedScenarioId;
          return (
            <button
              key={scenario.id}
              onClick={() => onSelectScenario(scenario.id)}
              disabled={disabled}
              className={`text-left p-3 rounded-lg border transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-zinc-800/95 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 text-zinc-300'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden pointer-events-none">
                  <div className="bg-emerald-500 text-zinc-950 text-[9px] font-black uppercase py-0.5 tracking-tighter text-center transform rotate-45 translate-x-3 -translate-y-1 w-16">
                    ACTIVE
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-900 text-zinc-300 border border-zinc-700/60">
                  {scenario.camera_tag}
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  {scenario.duration_s}s
                </span>
              </div>

              <div className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                <span>{scenario.title}</span>
              </div>

              <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                {scenario.description}
              </p>

              <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 flex items-center gap-1 font-mono">
                  <Dumbbell className="w-3 h-3 text-emerald-400" />
                  {scenario.persons[0]?.current_exercise}
                </span>
                <span className="text-emerald-400 font-mono text-[10px] font-semibold flex items-center">
                  {scenario.persons.length} Tracked
                  <ChevronRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Optional Custom Video File Drop / Upload */}
      {onCustomVideoLoaded && (
        <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-zinc-400" />
            <span>Have custom gym phone video footage?</span>
          </span>
          <label className="cursor-pointer text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2 transition-colors">
            Upload MP4
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onCustomVideoLoaded(file);
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
};
