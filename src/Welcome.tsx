/**
 * Welcome page ("/").
 * Twenty-four 2.4s gym clips play back-to-back on a loop with quick cuts, while the
 * Spottr logo and one button that scrolls into the story below stay fixed on top. The story lives in the company section.
 * Below the hero sits the company site for gym owners ("/#gyms", see Company.tsx). It rises over the pinned video like a
 * sheet, and every step of that hand-over follows the scroll position rather than a timer.
 */

import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

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

/** The one hero action: scroll into the story below instead of leaving the page. */
const StoryButton: React.FC = () => (
  <a
    href="#gyms"
    onClick={(e) => {
      e.preventDefault();
      scrollToGyms(scrollBehavior());
    }}
    className="glass whitespace-nowrap rounded-full px-6 py-3 text-[14px] font-semibold text-ink transition-transform hover:scale-[1.03]"
    // Liquid glass that picks up a little logo blue as the page scrolls (--hero-scroll is 0 → 1, set on the hero),
    // and fades out before the sheet reaches it. Opacity on the button itself: on an ancestor it would stop the glass blur.
    style={
      {
        '--glass-fill': 'color-mix(in srgb, #4D80FF calc(var(--hero-scroll, 0) * 35%), rgb(255 255 255 / 0.72))',
        '--glass-fill-2': 'color-mix(in srgb, #4D80FF calc(var(--hero-scroll, 0) * 35%), rgb(255 255 255 / 0.42))',
        opacity: 'calc(1 - var(--hero-scroll, 0) * 4)',
      } as React.CSSProperties
    }
  >
    See how it works ↓
  </a>
);

export const Welcome: React.FC = () => {
  const [active, setActive] = useState(0);
  const [reduceMotion] = useState(prefersReducedMotion);
  // Reduced motion: start on a still frame; the visitor can still press play
  const [paused, setPaused] = useState(reduceMotion);
  // Once the sheet covers the screen the video is out of sight, so it stops too
  const [covered, setCovered] = useState(false);
  const stopped = paused || covered;
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const heroRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const grabRef = useRef<HTMLSpanElement>(null);

  // Play the active clip from the start (unless stopped); pause the others once they've faded out.
  useEffect(() => {
    const current = videoRefs.current[active];
    if (current && !stopped) {
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
    if (stopped) current?.pause();
    else current?.play().catch(() => {});
    // Only on pause toggles: clip changes are handled above
  }, [stopped]);

  // The sheet hand-over, in step with the scroll. Written straight to the elements so scrolling doesn't re-render the 24 videos.
  useEffect(() => {
    const onScroll = () => {
      const hero = heroRef.current;
      if (!hero) return;
      const y = window.scrollY;
      const h = hero.offsetHeight;
      // 0 at rest → 1 once the sheet fills the screen
      hero.style.setProperty('--hero-scroll', String(Math.min(y / h, 1)));
      // The sheet fades in over the first 80px, so at rest only its grab bar shows over the video
      const edge = Math.min(y / 80, 1);
      const sheet = sheetRef.current;
      if (sheet) sheet.style.opacity = String(edge);
      if (grabRef.current) {
        grabRef.current.style.backgroundColor = `color-mix(in srgb, rgb(14 17 23 / 0.15) ${edge * 100}%, rgb(255 255 255 / 0.7))`;
      }
      // Sheet over the whole screen: its wash now matches the page's own, so the page takes over and the pinned video stops painting
      const isCovered = y >= h;
      hero.style.visibility = isCovered ? 'hidden' : '';
      if (sheet) sheet.style.visibility = isCovered ? 'hidden' : '';
      setCovered(isCovered);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Browsers can refuse playback while the tab is in the background; resume when it's shown.
  useEffect(() => {
    const resume = () => {
      if (!document.hidden && !stopped) videoRefs.current[active]?.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, [active, stopped]);

  // Links to "/#gyms" (and the old "/gyms") land on the company section
  useEffect(() => {
    if (window.location.hash === '#gyms') scrollToGyms('auto');
  }, []);

  const next = () => setActive((i) => (i + 1) % CLIPS.length);

  return (
    <main>
      {/* Pinned: the sheet below slides up over it instead of pushing it away */}
      <section ref={heroRef} className="sticky top-0 h-dvh w-full overflow-hidden bg-black">
        {/* The footage leans in a little as the sheet comes up */}
        <div
          className="absolute inset-0"
          style={reduceMotion ? undefined : { transform: 'scale(calc(1 + var(--hero-scroll, 0) * 0.06))' }}
        >
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
        </div>

        {/* Light scrim so the logo stays legible on bright frames; it deepens under the rising sheet */}
        <div className="absolute inset-0 bg-black" style={{ opacity: 'calc(0.15 + var(--hero-scroll, 0) * 0.45)' }} aria-hidden />

        <div className="relative z-10 flex h-full flex-col items-center px-4">
          <div
            className="flex flex-1 flex-col items-center justify-center gap-5 pt-[4vh] pb-[12vh]"
            style={reduceMotion ? undefined : { transform: 'translateY(calc(var(--hero-scroll, 0) * -10vh))' }}
          >
            <h1 style={{ opacity: 'calc(1 - var(--hero-scroll, 0) * 2)' }}>
              <img
                src="/welcome/spottr-logo.png"
                alt="Spottr"
                className="w-[min(28.9vw,476px)] min-w-[187px] h-auto drop-shadow-[0_2px_24px_rgba(0,0,0,0.25)]"
              />
            </h1>
          </div>

          <div className="absolute bottom-[calc(9vh+3rem)] left-1/2 -translate-x-1/2 flex flex-col sm:flex-row items-center gap-2">
            <StoryButton />
          </div>

          <button
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Play background video' : 'Pause background video'}
            // Faint smoked glass so it doesn't compete with the logo and the story button; brightens on hover
            className="glass absolute right-4 bottom-[calc(1rem+3rem)] w-9 h-9 rounded-full flex items-center justify-center text-white/70 cursor-pointer transition-colors hover:text-white [--glass-fill:rgb(255_255_255/0.14)] [--glass-fill-2:rgb(255_255_255/0.06)] [--glass-rim:rgb(255_255_255/0.35)] hover:[--glass-fill:rgb(255_255_255/0.3)]"
            style={{ opacity: 'calc(1 - var(--hero-scroll, 0) * 6)' }}
          >
            {paused ? <Play className="w-3.5 h-3.5 fill-current" aria-hidden /> : <Pause className="w-3.5 h-3.5 fill-current" aria-hidden />}
          </button>
        </div>
      </section>

      {/* The company section rises over the pinned video like a sheet. Links land with its rounded top just off screen. */}
      <section id="gyms" aria-label="For gym owners" className="relative z-10 isolate -mt-12 -scroll-mt-12 pt-10 text-ink">
        {/* The sheet itself: opacity, and when the page takes over, set by the scroll effect above */}
        <div
          ref={sheetRef}
          aria-hidden
          className="sheet absolute inset-x-0 top-0 -z-10 h-[calc(100dvh+3rem)] rounded-t-[40px] opacity-0 shadow-[0_-24px_60px_-24px_rgb(0_0_0/0.55)]"
        />
        <span ref={grabRef} aria-hidden className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1.5 rounded-full bg-white/70" />
        <Suspense fallback={<div className="min-h-screen" />}>
          <Company onLogoClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })} />
        </Suspense>
      </section>
    </main>
  );
};
