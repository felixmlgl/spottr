import React from 'react';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { LoadedPipelineData } from '../services/pipelineAdapter';
import { AppSettings } from '../services/settings';
import { SessionPlayer } from './SessionPlayer';

interface ReplayViewProps {
  data: LoadedPipelineData | null;
  personId: string;
  settings: AppSettings;
  onBack: () => void;
}

/** Proof view: the footage the member's stats came from. Opened from Main or History, never a tab. */
export const ReplayView: React.FC<ReplayViewProps> = ({ data, personId, settings, onBack }) => (
  <div className="min-h-screen bg-white text-[#1D1D1F]">
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-sm font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">How we counted</h1>
        <p className="text-base text-[#6E6E73] mt-1.5">
          The footage your stats came from. Everyone except Person {personId} is pixelated.
        </p>
      </div>

      {data?.errorNote && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F5F7] text-xs text-[#6E6E73]">
          <AlertCircle className="w-4 h-4 text-[#8E8E93] shrink-0" />
          <span>{data.errorNote}</span>
        </div>
      )}

      {data ? (
        <SessionPlayer
          data={data}
          personId={personId}
          defaultOverlayMode={settings.overlayMode}
          repSound={settings.repSound}
        />
      ) : (
        <div className="aspect-video rounded-[24px] bg-[#F5F5F7] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#6E6E73]" />
        </div>
      )}

      <p className="text-xs text-[#86868B] text-center pb-8">
        In production Spottr runs on the gym's own cameras through an edge device; the video never leaves the gym.
      </p>
    </div>
  </div>
);
