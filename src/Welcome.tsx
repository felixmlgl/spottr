/**
 * Welcome page ("/").
 * Twenty-four 2.4s gym clips play back-to-back on a loop with quick cuts, while the
 * Spottr logo and the two entry points (member app, gyms) stay fixed on top. The pitch lives in the company section below.
 * Below the hero sits the company site for gym owners ("/#gyms", see Company.tsx).
 */

import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Link } from './router';

// Only fetched once the page renders, so the video hero isn't held up by the gym mocks it pulls in
const Company = lazy(() => import('./Company.tsx').then((m) => ({ default: m.Company })));

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');

const scrollToGyms = (behavior: ScrollBehavior) =>
  document.getElementById('gyms')?.scrollIntoView({ behavior });

// Four non-overlapping cuts per source video, in chronological order. Playback cycles
// source videos 1 → 6 on every cut while each video advances from start to end.
const CLIPS = [1, 2, 3, 4].flatMap((part) =>
  [1, 2, 3, 4, 5, 6].map((video) => ({
    src: `/welcome/gym${video}-${part}.mp4`,
    poster: `/welcome/gym${video}-${part}.jpg`,
  })),
);

// Near-hard cut: just enough blend to hide a dropped frame between clips
const FADE_MS = 120;

const DemoButton: React.FC = () => (
  <Link
    to="/demo"
    className="whitespace-nowrap rounded-full bg-lime px-6 py-3 text-[14px] font-semibold text-ink shadow-[0_8px_30px_rgba(199,255,106,0.35)] transition-transform hover:scale-[1.03]"
  >
    Try the member app
  </Link>
);

const GymsLink: React.FC = () => (
  <a
    href="#gyms"
    onClick={(e) => {
      e.preventDefault();
      scrollToGyms(scrollBehavior());
    }}
    className="glass whitespace-nowrap rounded-full px-5 py-3 text-[14px] font-medium text-ink transition-colors hover:bg-white/80"
  >
    For gym owners ↓
  </a>
);

export const Welcome: React.FC = () => {
  const [active, setActive] = useState(0);
  // Reduced motion: start on a still frame; the visitor can still press play
  const [paused, setPaused] = useState(prefersReducedMotion);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Play the active clip from the start (unless paused); pause the others once they've faded out.
  useEffect(() => {
    const current = videoRefs.current[active];
    if (current && !paused) {
      current.currentTime = 0;
      current.play().catch(() => {
        // Autoplay blocked (e.g. low-power mode): the poster frame stays visible.
      });
    }
    const timer = window.setTimeout(() => {
      videoRefs.current.forEach((v, i) => {
        if (v && i !== active) v.pause();
      });
    }, FADE_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  // Pause / resume the current clip in place
  useEffect(() => {
    const current = videoRefs.current[active];
    if (paused) current?.pause();
    else current?.play().catch(() => {});
    // Only on pause toggles: clip changes are handled above
  }, [paused]);

  // Browsers can refuse playback while the tab is in the background; resume when it's shown.
  useEffect(() => {
    const resume = () => {
      if (!document.hidden && !paused) videoRefs.current[active]?.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, [active, paused]);

  // Links to "/#gyms" (and the old "/gyms") land on the company section
  useEffect(() => {
    if (window.location.hash === '#gyms') scrollToGyms('auto');
  }, []);

  const next = () => setActive((i) => (i + 1) % CLIPS.length);

  return (
    <main>
      <section className="relative h-dvh w-full overflow-hidden bg-black">
        {CLIPS.map((clip, i) => (
          <video
            key={clip.src}
            ref={(el) => {
              videoRefs.current[i] = el;
            }}
            src={clip.src}
            poster={clip.poster}
            muted
            playsInline
            // Buffer only the current and upcoming clip
            preload={i === active || i === (active + 1) % CLIPS.length ? 'auto' : 'metadata'}
            onEnded={i === active ? next : undefined}
            className="absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
            style={{ opacity: i === active ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
            aria-hidden
          />
        ))}

        {/* Light scrim so the logo stays legible on bright frames */}
        <div className="absolute inset-0 bg-black/15" aria-hidden />

        <div className="relative z-10 flex h-full flex-col items-center px-4">
          <div className="flex flex-1 flex-col items-center justify-center gap-5 pt-[4vh] pb-[12vh]">
            <h1>
              <img
                src="/welcome/spottr-logo.png"
                alt="Spottr"
                className="w-[min(28.9vw,476px)] min-w-[187px] h-auto drop-shadow-[0_2px_24px_rgba(0,0,0,0.25)]"
              />
            </h1>
          </div>

          <div className="absolute bottom-[calc(9vh+3rem)] left-1/2 -translate-x-1/2 flex flex-col sm:flex-row items-center gap-2">
            <DemoButton />
            <GymsLink />
          </div>

          <button
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Play background video' : 'Pause background video'}
            className="glass absolute right-4 bottom-[calc(1rem+3rem)] w-11 h-11 rounded-full flex items-center justify-center text-ink cursor-pointer hover:bg-white/80"
          >
            {paused ? <Play className="w-4 h-4 fill-current" aria-hidden /> : <Pause className="w-4 h-4 fill-current" aria-hidden />}
          </button>
        </div>
      </section>

      {/* The company section rises over the video like a sheet: rounded frosted edge, video blurred through it */}
      <section id="gyms" aria-label="For gym owners" className="relative z-10 isolate -mt-12 pt-10 text-ink">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-64 -z-10 rounded-t-[44px] bg-gradient-to-b from-[#F5F6FA]/80 to-[#F5F6FA]/0 backdrop-blur-2xl [mask-image:linear-gradient(black_40%,transparent)]"
        />
        <span aria-hidden className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-ink/15" />
        <Suspense fallback={<div className="min-h-screen" />}>
          <Company onLogoClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })} />
        </Suspense>
      </section>
    </main>
  );
};
