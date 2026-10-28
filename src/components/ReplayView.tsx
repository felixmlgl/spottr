import React from 'react';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { LoadedPipelineData } from '../services/pipelineAdapter';
import { AppSettings } from '../services/settings';
import { SessionPlayer } from './SessionPlayer';

interface ReplayViewProps {
  data: LoadedPipelineData | null;
  personId: string;
  /** What the footage is, when it isn't a plain real gym clip */
  clipNote?: string;
  settings: AppSettings;
  onBack: () => void;
}

/** Proof view: the footage the member's stats came from. Opened from Main or History, never a tab. */
export const ReplayView: React.FC<ReplayViewProps> = ({ data, personId, clipNote, settings, onBack }) => (
  <div className="min-h-screen theme-night">
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-2 rounded-full bg-surface hover:bg-surface-2 text-sm font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div>
        <span className="hud-label">REC · replay</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">How we counted</h1>
        <p className="text-base text-ink-2 mt-1.5">
          The footage your stats came from. Everyone the pose model detects, except you (Person {personId}), is pixelated.
        </p>
        {clipNote && <p className="text-sm text-ink-3 mt-1">{clipNote}</p>}
      </div>

      {data?.errorNote && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface text-xs text-ink-2">
          <AlertCircle className="w-4 h-4 text-ink-3 shrink-0" />
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
        <div className="aspect-video rounded-[24px] bg-surface flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-ink-2" />
        </div>
      )}

      <p className="hud-label text-center pb-8">
        The plan for production: Spottr runs on the gym's own cameras through a Spottr box, so the video never leaves the gym.
      </p>
    </div>
  </div>
);
