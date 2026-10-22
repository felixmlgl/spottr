import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Info, Map } from 'lucide-react';
import { PIPELINE_CLIPS } from '../../config';
import { findClip, prefetchClip, useClipData, useClipSessions } from '../../hooks/useClipData';
import { PipelinePerson, clipDataBaseUrl } from '../../services/pipelineAdapter';
import { defaultPersonId, mainExercise, sortPeopleForPicker, trackedSeconds } from '../../services/memberSession';
import { PersonSpotlight } from './PersonSpotlight';
import { Logo } from '../Logo';
import { navigate } from '../../router';

const TwoAngles = lazy(() => import('./TwoAngles').then((m) => ({ default: m.TwoAngles })));

/** Third option: two cameras of one room fused into one floor map (world service), not a member clip. */
const ANGLES = 'angles';
const ANGLES_CLIPS = ['/world-demo-angles/segments/session/cam1.mp4', '/world-demo-angles/segments/session/cam2.mp4'];

interface DemoIntroProps {
  initialClipId?: string | null;
  initialPersonId?: string | null;
  onContinue: (clipId: string, personId: string) => void;
}

/**
 * A frame of the clip, drawn to a canvas (a paused <video> can stay blank until it is played).
 * Pixelated into coarse blocks so nobody in the crowd is recognisable before the privacy overlay is loaded.
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
          // ~110 blocks across: a face in a gym-wide shot ends up a few blocks wide
          canvas.width = 110;
          canvas.height = Math.round((110 * video.videoHeight) / video.videoWidth);
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }}
      />
      <canvas ref={canvasRef} className="w-full h-full object-cover [image-rendering:pixelated]" />
    </>
  );
};

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export const DemoIntro: React.FC<DemoIntroProps> = ({ initialClipId, initialPersonId, onContinue }) => {
  const sessions = useClipSessions();
  const [clipId, setClipId] = useState<string | null>(initialClipId === ANGLES ? ANGLES : findClip(initialClipId)?.id ?? null);
  const [personId, setPersonId] = useState<string | null>(initialPersonId ?? null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const step2Ref = useRef<HTMLElement>(null);

  const clip = findClip(clipId);
  const isAngles = clipId === ANGLES;
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
    if (id === clipId) {
      step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    prefetchClip(id);
    setClipId(id);
    setPersonId(null);
    setHoverId(null);
    // Jump to step 2 once it has rendered, so nobody has to scroll for it
    requestAnimationFrame(() => requestAnimationFrame(() => step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
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
          isSelected ? 'bg-accent/12 ring-2 ring-accent' : isHot ? 'bg-surface-2' : 'hover:bg-surface-2'
        }`}
      >
        <div className="w-10 h-12 rounded-lg overflow-hidden bg-line shrink-0">
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
          <p className={`text-sm font-semibold ${isHot ? 'text-ink' : 'text-ink-2'}`}>Person {p.id}</p>
          <p className="text-xs text-ink-2 truncate">
            {ex
              ? `${p.sets.length} set${p.sets.length > 1 ? 's' : ''} · ${p.total_reps} reps · ${ex}`
              : `On camera ${Math.round(trackedSeconds(p))} s · no sets`}
          </p>
        </div>
        {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-white text-ink pb-28">
      <header className="max-w-[1100px] mx-auto px-4 sm:px-6 h-16 flex items-center">
        <Logo />
        <span className="ml-2 px-2 py-0.5 rounded-full bg-surface hud-label">
          Demo
        </span>
      </header>

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 flex flex-col gap-10">
        <div className="pt-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.08]">
            See what the gym camera logged.
          </h1>
          <p className="text-base text-ink-2 mt-2 max-w-xl">
            Pick a clip, then a member. You'll see their workout the way they would.
          </p>
          <p className="text-sm text-ink-2 mt-3 max-w-xl flex items-start gap-2">
            <Info className="w-4 h-4 text-[#0071E3] shrink-0 mt-0.5" />
            <span>
              Real gym clips and real pipeline output, not a script.
            </span>
          </p>
        </div>

        {/* Step 1: clip */}
        <section className="flex flex-col gap-4">
          <h2 className="hud-label">1 · Choose a camera clip</h2>
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
                  className={`text-left rounded-[18px] sm:rounded-[22px] p-1.5 sm:p-2 pb-3 sm:pb-4 bg-surface transition-all cursor-pointer ${
                    isSelected ? 'ring-2 ring-accent bg-white shadow-sm' : 'hover:bg-surface-2'
                  }`}
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-ink">
                    {c.video && <ClipPoster src={c.video} />}
                    <span className="absolute top-1.5 left-2 font-mono text-[10px] text-white/90 flex items-center gap-1 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />
                      CAM {String(PIPELINE_CLIPS.indexOf(c) + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="px-1 sm:px-2 pt-2 sm:pt-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm sm:text-base font-bold">{c.title}</span>
                      {s && <span className="text-xs text-ink-2 font-mono">{formatDuration(s.duration_s)}</span>}
                    </div>
                    <p className="hidden sm:block text-xs text-ink-2 mt-0.5">
                      {!s
                        ? '\u00A0'
                        : liftersCount
                        ? `${s.people.length} people tracked · ${liftersCount} doing sets`
                        : `${s.people.length} people tracked · tracking only`}
                    </p>
                  </div>
                </button>
              );
            })}
            <button
              onClick={() => pickClip(ANGLES)}
              aria-pressed={isAngles}
              className={`text-left rounded-[18px] sm:rounded-[22px] p-1.5 sm:p-2 pb-3 sm:pb-4 bg-surface transition-all cursor-pointer ${
                isAngles ? 'ring-2 ring-accent bg-white shadow-sm' : 'hover:bg-surface-2'
              }`}
            >
              <div className="aspect-video rounded-sm overflow-hidden bg-ink grid grid-cols-2 gap-px">
                {ANGLES_CLIPS.map((src) => (
                  <ClipPoster key={src} src={src} />
                ))}
              </div>
              <div className="px-1 sm:px-2 pt-2 sm:pt-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm sm:text-base font-bold">Two angles</span>
                  <span className="text-xs text-ink-2 font-mono">0:07</span>
                </div>
                <p className="hidden sm:block text-xs text-ink-2 mt-0.5">2 cameras · 1 shared floor map</p>
              </div>
            </button>
          </div>
        </section>

        {/* Step 2 (two angles): one shared world from both cameras */}
        {isAngles && (
          <section ref={step2Ref} className="flex flex-col gap-4 scroll-mt-4 animate-in fade-in duration-200">
            <h2 className="hud-label">2 · Two cameras, one floor map</h2>
            <Suspense fallback={<div className="h-[420px] rounded-[22px] bg-surface animate-pulse" aria-label="Loading" />}>
              <TwoAngles />
            </Suspense>
          </section>
        )}

        {/* Step 2: person */}
        {clip && (
          <section ref={step2Ref} className="flex flex-col gap-4 scroll-mt-4 animate-in fade-in duration-200">
            <h2 className="hud-label">2 · Who should Spottr follow?</h2>

            {session && lifters.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface text-sm text-ink-2">
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

              <div className="panel p-2 flex flex-col gap-1 lg:max-h-[560px] lg:overflow-y-auto">
                {lifters.length > 0 && (
                  <>
                    <p className="px-2 pt-2 pb-1 hud-label">
                      Doing sets
                    </p>
                    {lifters.map(renderRow)}
                  </>
                )}
                {others.length > 0 && (
                  <>
                    <p className="px-2 pt-3 pb-1 hud-label">
                      {lifters.length ? 'Also in frame' : 'Everyone tracked'} ({others.length})
                    </p>
                    {others.map(renderRow)}
                  </>
                )}
                {!session && <p className="p-4 text-sm text-ink-2">Loading people…</p>}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Continue bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-xl border-t border-black/[0.06]">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-ink-2 truncate">
            {isAngles
              ? 'Two angles · one floor map'
              : !clip
              ? 'Choose a clip to start'
              : selected
              ? `${clip.title} clip · Person ${selected.id}${mainExercise(selected) ? ` · ${selected.total_reps} reps` : ''}`
              : 'Choose a person'}
          </p>
          {isAngles ? (
            <button
              onClick={() => navigate('/gyms/world-map')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-ink hover:bg-accent-deep text-white text-sm font-semibold transition-transform active:scale-95 cursor-pointer shrink-0"
            >
              <Map className="w-4 h-4" />
              Full world map
            </button>
          ) : (
            <button
              onClick={() => canContinue && onContinue(clipId!, personId!)}
              disabled={!canContinue}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-ink hover:bg-accent-deep text-white text-sm font-semibold transition-transform active:scale-95 disabled:opacity-30 disabled:active:scale-100 cursor-pointer disabled:cursor-default shrink-0"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
