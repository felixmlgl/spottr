/**
 * The landing page's building blocks: one chapter template (time, source label, headline, one sentence, one visual),
 * the scroll-linked timeline rail, and the hooks that know which chapter is on screen.
 */

import React, { useEffect, useRef, useState } from 'react';
import { InfoTip } from '../components/Disclosure';
import { Link } from '../router';

/** Where a chapter's numbers come from. Shown on every chapter so real footage and demo data never blur together. */
export type Source = 'Real footage' | 'Stock photo' | 'Test scene' | 'Demo data' | 'Example' | 'Pilot pricing';

const SOURCE_STYLE: Record<Source, string> = {
  'Real footage': 'bg-lime text-ink',
  'Stock photo': 'bg-white/80 text-ink-2 ring-1 ring-black/[0.06]',
  'Test scene': 'bg-white/80 text-ink-2 ring-1 ring-black/[0.06]',
  'Demo data': 'bg-white/80 text-ink-2 ring-1 ring-black/[0.06]',
  Example: 'bg-white/80 text-ink-2 ring-1 ring-black/[0.06]',
  'Pilot pricing': 'bg-white/80 text-ink-2 ring-1 ring-black/[0.06]',
};

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const scrollToId = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

/** Fades its children up the first time they scroll into view (skipped with reduced motion). */
export const Reveal: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out ${
        shown ? 'opacity-100 translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-6'
      } ${className}`}
    >
      {children}
    </div>
  );
};

/** The chapter whose top part is in the middle band of the viewport. */
export function useActiveChapter(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(',');
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    key.split(',').forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [key]);
  return active;
}

/** How far the viewport's middle has travelled through an element, 0..1. */
export function useScrollProgress(ref: React.RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setProgress(Math.min(1, Math.max(0, (window.innerHeight / 2 - r.top) / r.height)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ref]);
  return progress;
}

/** Vertical line beside the chapters (desktop): a faint track with a blue fill that follows the scroll. */
export const TimelineRail: React.FC<{ progress: number }> = ({ progress }) => (
  <div aria-hidden className="hidden lg:block absolute left-6 top-2 bottom-2 w-0.5 rounded-full bg-line">
    <div className="w-full rounded-full bg-accent" style={{ height: `${progress * 100}%` }} />
  </div>
);

export interface ChapterProps {
  id: string;
  time: string;
  source?: Source;
  title: string;
  line: string;
  /** Fine print about the data, behind an ⓘ next to the source label */
  note?: React.ReactNode;
  /** Only where a full page adds something the chapter can't show */
  link?: { to: string; label: string };
  visual: React.ReactNode;
  /** Visual on the left (desktop), so chapters alternate sides */
  flip?: boolean;
  /** 'active' = on screen, 'past' = scrolled by, for the rail dot */
  state: 'active' | 'past' | 'next';
}

/** One step of the story: time and source, a short headline, one sentence, one visual, optional link onward. */
export const Chapter: React.FC<ChapterProps> = ({ id, time, source, title, line, note, link, visual, flip, state }) => (
  <section id={id} className="relative scroll-mt-28 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
    <span
      aria-hidden
      className={`hidden lg:block absolute -left-[47px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-[#F5F6FA] transition-colors duration-300 ${
        state === 'next' ? 'bg-white shadow-[inset_0_0_0_1.5px_var(--color-line)]' : 'bg-accent'
      } ${state === 'active' ? 'scale-125' : ''}`}
    />
    <Reveal className={`flex flex-col items-start ${flip ? 'lg:order-2' : ''}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="glass rounded-full px-3 py-1 text-sm font-semibold text-ink tabular-nums">{time}</span>
        {source && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SOURCE_STYLE[source]}`}>{source}</span>}
        {note && <InfoTip label="About this data">{note}</InfoTip>}
      </div>
      <h2 className="text-4xl sm:text-5xl font-medium tracking-tight text-ink leading-[1.05] mt-4">{title}</h2>
      <p className="text-lg text-ink-2 leading-relaxed mt-4 max-w-md">{line}</p>
      {link && (
        <Link to={link.to} className="mt-5 text-base font-semibold text-accent-ink hover:text-ink">
          {link.label} ›
        </Link>
      )}
    </Reveal>
    <Reveal className="min-w-0">{visual}</Reveal>
  </section>
);
