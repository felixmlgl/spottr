import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { PIPELINE_CLIPS } from '../../config';
import { findClip, prefetchClip, useClipData, useClipSessions } from '../../hooks/useClipData';
import { PipelinePerson, clipDataBaseUrl } from '../../services/pipelineAdapter';
import { defaultPersonId, mainExercise, sortPeopleForPicker, trackedSeconds } from '../../services/memberSession';
import { PersonSpotlight } from './PersonSpotlight';

interface DemoIntroProps {
  initialClipId?: string | null;
  initialPersonId?: string | null;
  onContinue: (clipId: string, personId: string) => void;
}

/**
 * A frame of the clip, drawn to a canvas (a paused <video> can stay blank until it is played).
 * Softly blurred so nobody in the crowd is recognisable before the privacy overlay is loaded.
 */
const ClipPoster: React.FC<{ src: string }> = ({ src }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  return (
    <>
      <video
        src={src}
        preload="metadata"
        muted
        playsInline
        className="hidden"
        onLoadedMetadata={(e) => {
          (e.target as HTMLVideoElement).currentTime = 1;
        }}
        onSeeked={(e) => {
          const video = e.target as HTMLVideoElement;
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.filter = `blur(${Math.max(2, video.videoWidth / 280)}px)`;
          ctx.drawImage(video, 0, 0);
        }}
      />
      <canvas ref={canvasRef} className="w-full h-full object-cover" />
    </>
  );
};

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export const DemoIntro: React.FC<DemoIntroProps> = ({ initialClipId, initialPersonId, onContinue }) => {
  const sessions = useClipSessions();
  const [clipId, setClipId] = useState<string | null>(findClip(initialClipId)?.id ?? null);
  const [personId, setPersonId] = useState<string | null>(initialPersonId ?? null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const step2Ref = useRef<HTMLElement>(null);

  const clip = findClip(clipId);
  const session = clipId ? sessions[clipId] : undefined;
  const data = useClipData(clipId);

  const people = useMemo(() => (session ? sortPeopleForPicker(session.people) : []), [session]);
  const lifters = people.filter((p) => (p.sets?.length || 0) > 0);
  const others = people.filter((p) => !(p.sets?.length || 0));

  // Pre-select the top lifter once a clip's people are known (unless a valid person is already chosen)
  useEffect(() => {
    if (!session) return;
    if (!personId || !session.people.some((p) => String(p.id) === personId)) {
      setPersonId(defaultPersonId(session));
    }
  }, [session]);

  const pickClip = (id: string) => {
    if (id === clipId) return;
    prefetchClip(id);
    setClipId(id);
    setPersonId(null);
    setHoverId(null);
    // On small screens step 2 starts below the fold
    if (window.matchMedia('(max-width: 639px)').matches) {
      requestAnimationFrame(() => step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  const thumbUrl = (p: PipelinePerson) => (clip && p.thumbnail ? `${clipDataBaseUrl(clip)}/${p.thumbnail}` : null);
  const selected = people.find((p) => String(p.id) === personId);
  const canContinue = Boolean(clipId && selected);

  const renderRow = (p: PipelinePerson) => {
    const id = String(p.id);
    const isSelected = id === personId;
    const isHot = isSelected || id === hoverId;
    const ex = mainExercise(p);
    const thumb = thumbUrl(p);
    return (
      <button
        key={id}
        onClick={() => setPersonId(id)}
        onMouseEnter={() => setHoverId(id)}
        onMouseLeave={() => setHoverId(null)}
        aria-pressed={isSelected}
        className={`w-full flex items-center gap-3 p-2 pr-3 rounded-2xl text-left transition-colors cursor-pointer ${
          isSelected ? 'bg-[#34C759]/12 ring-2 ring-[#34C759]' : isHot ? 'bg-[#E8E8ED]' : 'hover:bg-[#E8E8ED]'
        }`}
      >
        <div className="w-10 h-12 rounded-lg overflow-hidden bg-[#D2D2D7] shrink-0">
          {thumb && (
            <img
              src={thumb}
              alt=""
              loading="lazy"
              className={`w-full h-full object-cover transition-[filter] ${isHot ? '' : 'grayscale opacity-70'}`}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${isHot ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'}`}>Person {p.id}</p>
          <p className="text-xs text-[#6E6E73] truncate">
            {ex
              ? `${p.sets.length} set${p.sets.length > 1 ? 's' : ''} · ${p.total_reps} reps · ${ex}`
              : `On camera ${Math.round(trackedSeconds(p))} s · no sets`}
          </p>
        </div>
        {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-[#34C759] shrink-0" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] pb-28">
      <header className="max-w-[1100px] mx-auto px-4 sm:px-6 h-16 flex items-center">
        <span className="text-xl font-bold tracking-tight">Spottr</span>
        <span className="ml-2 px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wide">
          Demo
        </span>
      </header>

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 flex flex-col gap-10">
        <div className="pt-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">
            See what the gym camera logged.
          </h1>
          <p className="text-base text-[#6E6E73] mt-2 max-w-xl">
            Pick a real gym clip, then pick the member you want to follow. Spottr shows you their workout as they would see it.
          </p>
        </div>

        {/* Step 1: clip */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide">1 · Choose a camera clip</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {PIPELINE_CLIPS.map((c) => {
              const s = sessions[c.id];
              const liftersCount = s ? s.people.filter((p) => p.sets?.length).length : 0;
              const isSelected = c.id === clipId;
              return (
                <button
                  key={c.id}
                  onClick={() => pickClip(c.id)}
                  aria-pressed={isSelected}
                  className={`text-left rounded-[18px] sm:rounded-[22px] p-1.5 sm:p-2 pb-3 sm:pb-4 bg-[#F5F5F7] transition-all cursor-pointer ${
                    isSelected ? 'ring-2 ring-[#34C759] bg-white shadow-sm' : 'hover:bg-[#EBEBEF]'
                  }`}
                >
                  <div className="aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-[#1D1D1F]">
                    {c.video && <ClipPoster src={c.video} />}
                  </div>
                  <div className="px-1 sm:px-2 pt-2 sm:pt-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm sm:text-base font-bold">{c.title}</span>
                      {s && <span className="text-xs text-[#6E6E73] font-mono">{formatDuration(s.duration_s)}</span>}
                    </div>
                    <p className="hidden sm:block text-xs text-[#6E6E73] mt-0.5">
                      {!s
                        ? 'Loading…'
                        : liftersCount
                        ? `${s.people.length} people tracked · ${liftersCount} doing sets`
                        : `${s.people.length} people tracked · tracking only`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: person */}
        {clip && (
          <section ref={step2Ref} className="flex flex-col gap-4 scroll-mt-4 animate-in fade-in duration-200">
            <h2 className="text-sm font-semibold text-[#6E6E73] uppercase tracking-wide">2 · Who should Spottr follow?</h2>

            {session && lifters.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#F5F5F7] text-sm text-[#6E6E73]">
                <Info className="w-4 h-4 text-[#0071E3] shrink-0" />
                <span>Nobody did a set in this clip. Tracking only: pick anyone to see what Spottr records.</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
              <PersonSpotlight
                data={data}
                people={people}
                selectedId={personId}
                hoverId={hoverId}
                onSelect={setPersonId}
              />

              <div className="bg-[#F5F5F7] rounded-[22px] p-2 flex flex-col gap-1 lg:max-h-[560px] lg:overflow-y-auto">
                {lifters.length > 0 && (
                  <>
                    <p className="px-2 pt-2 pb-1 text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wide">
                      Doing sets
                    </p>
                    {lifters.map(renderRow)}
                  </>
                )}
                {others.length > 0 && (
                  <>
                    <p className="px-2 pt-3 pb-1 text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wide">
                      {lifters.length ? 'Also in frame' : 'Everyone tracked'} ({others.length})
                    </p>
                    {others.map(renderRow)}
                  </>
                )}
                {!session && <p className="p-4 text-sm text-[#6E6E73]">Loading people…</p>}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Continue bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-xl border-t border-black/[0.06]">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-[#6E6E73] truncate">
            {!clip
              ? 'Choose a clip to start'
              : selected
              ? `${clip.title} clip · Person ${selected.id}${mainExercise(selected) ? ` · ${selected.total_reps} reps` : ''}`
              : 'Choose a person'}
          </p>
          <button
            onClick={() => canContinue && onContinue(clipId!, personId!)}
            disabled={!canContinue}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1D1D1F] hover:bg-black text-white text-sm font-semibold transition-transform active:scale-95 disabled:opacity-30 disabled:active:scale-100 cursor-pointer disabled:cursor-default shrink-0"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
