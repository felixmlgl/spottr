/**
 * Top bar of the main website, the same on the landing page and its subpages ("/pricing", "/privacy").
 * Every section link leads to its chapter on the landing page; the chapters link on to the subpages ("Learn more").
 */

import React from 'react';
import { Link, navigate } from '../router';
import { Logo } from '../components/Logo';
import { scrollToId } from '../landing/Chapter';
import { openRequestDemo } from '../requestDemo/RequestDemo';

// Each link jumps to the first chapter of its group and lights up while any of them is on screen
export const NAV: { label: string; chapters: string[] }[] = [
  { label: 'How it works', chapters: ['walk-in', 'set'] },
  { label: 'Members', chapters: ['logged', 'morning'] },
  { label: 'Gyms', chapters: ['floor', 'slipping'] },
  { label: 'Privacy', chapters: ['privacy'] },
  { label: 'Pricing', chapters: ['pays', 'start'] },
];
export const CHAPTER_IDS = NAV.flatMap((n) => n.chapters);

/** Link to a landing-page chapter: scrolls there on the landing page, opens the landing page at it from elsewhere. */
export const ChapterLink: React.FC<{ to: string; className: string; children: React.ReactNode; current?: boolean }> = ({
  to,
  className,
  children,
  current,
}) => (
  <a
    href={`/#${to}`}
    aria-current={current ? 'location' : undefined}
    onClick={(e) => {
      // Let the browser handle new-tab / modified clicks
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (window.location.pathname === '/') scrollToId(to);
      else navigate(`/#${to}`);
    }}
    className={className}
  >
    {children}
  </a>
);

/**
 * `active` is the label to highlight. On the landing page, `onLogoClick` scrolls back to the top and `progress`
 * draws the phone progress line; on a subpage the logo links home.
 */
export const SiteNav: React.FC<{ active: string | null; progress?: number; onLogoClick?: () => void }> = ({
  active,
  progress,
  onLogoClick,
}) => (
  <header className="sticky top-0 z-30 px-3 sm:px-4 pt-3">
    <div className="glass max-w-[1100px] mx-auto rounded-full h-14 pl-5 pr-2 flex items-center justify-between gap-4">
      {onLogoClick ? (
        <a
          href="/"
          aria-label="Spottr, back to top"
          onClick={(e) => {
            e.preventDefault();
            onLogoClick();
          }}
          className="shrink-0"
        >
          <Logo />
        </a>
      ) : (
        <Link to="/" aria-label="Spottr, home" className="shrink-0">
          <Logo />
        </Link>
      )}
      <nav aria-label="Sections" className="hidden md:flex items-center gap-0.5">
        {NAV.map((n) => {
          const on = n.label === active;
          return (
            <ChapterLink
              key={n.label}
              to={n.chapters[0]}
              current={on}
              className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                on ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink hover:bg-white/60'
              }`}
            >
              {n.label}
            </ChapterLink>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => openRequestDemo()}
        className="shrink-0 inline-flex items-center h-10 px-5 rounded-full text-sm font-semibold bg-accent-ink text-white hover:bg-accent-deep transition-colors cursor-pointer"
      >
        Request a demo
      </button>
    </div>
    {progress !== undefined && (
      // Phones have no rail: a thin progress line under the capsule does its job
      <div aria-hidden className="lg:hidden max-w-[1100px] mx-auto px-8 mt-1.5">
        <div className="h-0.5 rounded-full bg-line/70">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    )}
  </header>
);
