import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * One clock for the whole page (shared timeline, seconds). Videos follow it: small drift is corrected by
 * nudging their playback rate, large drift by seeking, so both camera cards and the map stay in step.
 */
export function usePlayback(from: number, to: number) {
  const [t, setT] = useState(from);
  const [playing, setPlaying] = useState(false);
  const tRef = useRef(from);
  const last = useRef<number | null>(null);

  useEffect(() => {
    tRef.current = from;
    setT(from);
    setPlaying(false);
  }, [from, to]);

  useEffect(() => {
    if (!playing) {
      last.current = null;
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      if (last.current !== null) {
        let next = tRef.current + (now - last.current) / 1000;
        if (next >= to) next = from; // loop the segment
        tRef.current = next;
        setT(next);
      }
      last.current = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, from, to]);

  const seek = useCallback(
    (value: number) => {
      const v = Math.max(from, Math.min(to, value));
      tRef.current = v;
      setT(v);
    },
    [from, to],
  );

  return { t, playing, setPlaying, seek };
}

/** Keep a <video> element on the shared clock. `startsAt` is the shared time of the video's first frame. */
export function useVideoSync(video: HTMLVideoElement | null, t: number, playing: boolean, startsAt: number) {
  useEffect(() => {
    if (!video || video.readyState < 1) return;
    const target = t - startsAt;
    if (target < 0 || (video.duration && target > video.duration)) return;
    const drift = video.currentTime - target;
    if (!playing) {
      if (Math.abs(drift) > 0.04) video.currentTime = target;
      if (!video.paused) video.pause();
      video.playbackRate = 1;
      return;
    }
    if (Math.abs(drift) > 0.5) {
      video.currentTime = target;
    } else {
      video.playbackRate = Math.max(0.9, Math.min(1.1, 1 - drift * 0.8));
    }
    if (video.paused) void video.play().catch(() => undefined);
  }, [video, t, playing, startsAt]);
}
