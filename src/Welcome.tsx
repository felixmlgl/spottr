/**
 * Welcome page ("/").
 * Twenty-four 2.4s gym clips play back-to-back on a loop with quick cuts, while the
 * Spottr logo and the demo button stay fixed on top.
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
    className="whitespace-nowrap rounded-full border border-white/40 bg-white/55 px-6 py-3 text-[14px] font-medium text-[#1D1D1F] shadow-[0_4px_24px_rgba(0,0,0,0.15)] backdrop-blur-md transition-colors hover:bg-white/75"
  >
    Try our demo
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
        <div className="flex flex-1 items-center justify-center pt-[4vh] pb-[12vh]">
          <h1>
            <img
              src="/welcome/spottr-logo.png"
              alt="Spottr"
              className="w-[min(34vw,560px)] min-w-[220px] h-auto drop-shadow-[0_2px_24px_rgba(0,0,0,0.25)]"
            />
          </h1>
        </div>

        <div className="absolute bottom-[9vh] left-1/2 -translate-x-1/2">
          <DemoButton />
        </div>
      </div>
    </main>
  );
};
