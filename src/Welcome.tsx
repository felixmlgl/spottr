/**
 * Welcome page ("/").
 * Twenty-four 2.4s gym clips play back-to-back on a loop with quick cuts, while the
 * Spottr logo, a one-line pitch and the two entry points (member app, gyms) stay fixed on top.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link } from './router';

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
    className="whitespace-nowrap rounded-full border border-white/40 bg-white/55 px-6 py-3 text-[14px] font-medium text-ink shadow-[0_4px_24px_rgba(0,0,0,0.15)] backdrop-blur-md transition-colors hover:bg-white/75"
  >
    Try the member app
  </Link>
);

const GymsLink: React.FC = () => (
  <Link
    to="/gyms"
    className="whitespace-nowrap rounded-full px-5 py-3 text-[14px] font-medium text-white/90 transition-colors hover:text-white hover:bg-white/10"
  >
    For gym owners →
  </Link>
);

export const Welcome: React.FC = () => {
  const [active, setActive] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Play the active clip from the start; pause the others once they've faded out.
  useEffect(() => {
    const current = videoRefs.current[active];
    if (current) {
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

  // Browsers can refuse playback while the tab is in the background; resume when it's shown.
  useEffect(() => {
    const resume = () => {
      if (!document.hidden) videoRefs.current[active]?.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, [active]);

  const next = () => setActive((i) => (i + 1) % CLIPS.length);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black">
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
          <p className="font-mono text-[13px] sm:text-[15px] text-white/90 text-center [text-shadow:0_1px_12px_rgba(0,0,0,0.5)]">
            Your gym's cameras log every set and rep.
          </p>
        </div>

        <div className="absolute bottom-[9vh] left-1/2 -translate-x-1/2 flex flex-col sm:flex-row items-center gap-2">
          <DemoButton />
          <GymsLink />
        </div>
      </div>
    </main>
  );
};
