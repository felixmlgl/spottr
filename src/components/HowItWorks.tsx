import React, { useState } from 'react';
import {
  Camera,
  Cpu,
  MonitorCheck,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Server,
  Lock,
} from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-zinc-800 text-emerald-400 border border-zinc-700">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <span>How Spottr Works in Production</span>
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                EDGE ARCHITECTURE
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Your gym's cameras count for you · Zero-wearable automated tracking via existing CCTV
            </p>
          </div>
        </div>
        <div className="text-zinc-400 hover:text-zinc-200">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-zinc-800/80">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3">
            {/* Step 1 */}
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                    STEP 01
                  </span>
                  <Camera className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="font-bold text-xs text-zinc-100 uppercase mb-1">
                  Existing Gym Cameras
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Uses standard ceiling IP security cameras already installed in the facility
                  via RTSP/ONVIF streams. No expensive sensors or wearable devices required.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-900 text-[10px] font-mono text-zinc-400">
                Input: 1080p @ 30 FPS Stream
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                    STEP 02
                  </span>
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <h4 className="font-bold text-xs text-zinc-100 uppercase mb-1">
                  Raspberry Pi Edge Node
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Compact edge box runs local YOLO person tracking and pose landmarker at ~30ms
                  latency. Biomechanical joint-angle hysteresis computes reps locally.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-900 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Strict Privacy: No raw video uploaded</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                    STEP 03
                  </span>
                  <MonitorCheck className="w-4 h-4 text-purple-400" />
                </div>
                <h4 className="font-bold text-xs text-zinc-100 uppercase mb-1">
                  Spottr Dashboard
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Gym members get automated logs pushed to their member app, while gym operators
                  monitor zone density and equipment utilization in real-time.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-900 text-[10px] font-mono text-zinc-400">
                Output: Verified Rep Logs + AI Recap
              </div>
            </div>
          </div>

          {/* Hackathon Prototype Transparency Banner */}
          <div className="mt-3 bg-zinc-950/90 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-300">
              <span className="font-bold text-amber-300 mr-1.5 font-mono">
                [Hackathon Demo Note]:
              </span>
              <span>
                To prototype rapidly for today's pitch, demo footage was recorded on a smartphone
                positioned at ceiling/tripod elevation to simulate standard CCTV angles. The system
                architecture, tracking interfaces, and rep hysteresis state machine operate
                identically to the production edge deployment.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
