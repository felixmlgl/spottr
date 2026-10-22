/**
 * Company site: the "For gym owners" section below the welcome hero ("/#gyms"). Lazy-loaded by Welcome.
 * One scroll, told as one member's evening: he walks in, trains, sees his workout, gets a plan; the gym sees its floor
 * and notices when he slips; then privacy, price and how a pilot starts. Every chapter uses the same template
 * (landing/Chapter.tsx) and shows the real product in place, so the page only links away at the very end.
 */

import React, { useRef } from 'react';
import { ArrowDown, Cctv, Gift, LayoutDashboard, Mail, PersonStanding, Smartphone } from 'lucide-react';
import { Link } from './router';
import { Logo } from './components/Logo';
import { IconDot, OpenArrow, TILE_TONES } from './components/Tile';
import { FloorStatus } from './gyms/components/FloorNow';
import { MEMBER_PROFILE } from './mocks/memberData';
import { Chapter, ChapterProps, Reveal, scrollToId, TimelineRail, useActiveChapter, useScrollProgress } from './landing/Chapter';
import {
  LiveReplay,
  NextWorkout,
  PilotSteps,
  PoseFrame,
  PricingCard,
  PrivacyList,
  SlippingExample,
  useFelix,
  WorkoutCard,
} from './landing/previews';

const NAME = MEMBER_PROFILE.name;
const CONTACT_EMAIL = 'info@tryspottr.app';
const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Spottr pilot for our gym')}`;

const primaryButton =
  'inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-ink text-white font-semibold hover:bg-accent-deep transition-colors cursor-pointer';
const quietButton =
  'inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-ink font-medium hover:bg-white/60 transition-colors cursor-pointer';

// In-page navigation: each link jumps to the first chapter of its group and lights up while any of them is on screen
const NAV: { label: string; chapters: string[] }[] = [
  { label: 'How it works', chapters: ['walk-in', 'set'] },
  { label: 'Members', chapters: ['logged', 'morning'] },
  { label: 'Gyms', chapters: ['floor', 'slipping'] },
  { label: 'Privacy', chapters: ['privacy'] },
  { label: 'Pricing', chapters: ['pays', 'start'] },
];
const CHAPTER_IDS = NAV.flatMap((n) => n.chapters);

const FACTS: [typeof Cctv, string][] = [
  [Cctv, 'Uses your existing cameras'],
  [PersonStanding, 'Nothing for members to wear'],
  [Gift, 'Free for your members'],
];

/** In-page link: scrolls to the section instead of jumping, and still works as a plain anchor without JS. */
const JumpLink: React.FC<{ to: string; className: string; children: React.ReactNode; current?: boolean }> = ({
  to,
  className,
  children,
  current,
}) => (
  <a
    href={`#${to}`}
    aria-current={current ? 'location' : undefined}
    onClick={(e) => {
      e.preventDefault();
      scrollToId(to);
    }}
    className={className}
  >
    {children}
  </a>
);

/** Sticks to the top once the company section reaches it, so it never covers the video hero. */
const CompanyNav: React.FC<{ onLogoClick: () => void; active: string | null }> = ({ onLogoClick, active }) => (
  <header className="sticky top-0 z-30 px-3 sm:px-4 pt-3">
    <div className="glass max-w-[1100px] mx-auto rounded-full h-14 pl-5 pr-2 flex items-center justify-between gap-4">
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
      <nav aria-label="Sections" className="hidden md:flex items-center gap-0.5">
        {NAV.map((n) => {
          const on = active !== null && n.chapters.includes(active);
          return (
            <JumpLink
              key={n.label}
              to={n.chapters[0]}
              current={on}
              className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                on ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink hover:bg-white/60'
              }`}
            >
              {n.label}
            </JumpLink>
          );
        })}
      </nav>
      <JumpLink
        to="contact"
        className="shrink-0 inline-flex items-center h-10 px-5 rounded-full text-sm font-semibold bg-accent-ink text-white hover:bg-accent-deep transition-colors"
      >
        Request a pilot
      </JumpLink>
    </div>
    {/* Phones have no rail: a thin progress line under the capsule does its job */}
    <div aria-hidden className="lg:hidden max-w-[1100px] mx-auto px-8 mt-1.5">
      <div className="h-0.5 rounded-full bg-line/70">
        <div className="h-full rounded-full bg-accent" style={{ width: 'calc(var(--progress, 0) * 100%)' }} />
      </div>
    </div>
  </header>
);

/** Who it's for and the one-line promise, before the story starts. */
const Intro: React.FC = () => (
  <Reveal className="pt-12 sm:pt-20 flex flex-col items-start">
    <span className="mb-5 px-3 py-1 rounded-full bg-lime text-[13px] font-semibold text-ink">For gyms · Bay Area pilot</span>
    <h1 className="text-5xl sm:text-7xl font-medium tracking-tight text-ink leading-[1] max-w-4xl">
      Your cameras already see every set. Now they count them.
    </h1>
    <ul className="flex flex-wrap gap-3 mt-8">
      {FACTS.map(([icon, label]) => (
        <li key={label} className="glass rounded-full pl-2 pr-5 py-2 flex items-center gap-3">
          <IconDot icon={icon} className="bg-accent/10 text-accent-ink" />
          <span className="text-base font-medium text-ink">{label}</span>
        </li>
      ))}
    </ul>
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-8">
      <JumpLink to="contact" className={primaryButton}>
        Request a pilot
      </JumpLink>
      <JumpLink to="walk-in" className={quietButton}>
        Follow one workout
        <ArrowDown className="w-4 h-4" aria-hidden />
      </JumpLink>
    </div>
  </Reveal>
);

/** The one action, then the two full demos for anyone who wants to click around. */
const Contact: React.FC = () => (
  <section id="contact" className="scroll-mt-28 flex flex-col gap-6">
    <Reveal className="panel relative isolate overflow-hidden p-8 sm:p-12 flex flex-col items-start gap-5">
      {/* Halftone gym floor on the right, fading out behind the text (scripts/halftone.py) */}
      <img
        src="/halftone/texture.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -z-10 right-0 top-1/2 -translate-y-1/2 h-[130%] max-w-none opacity-35 [mask-image:linear-gradient(to_bottom,transparent_55%,black)] sm:[mask-image:linear-gradient(to_right,transparent,black_55%)]"
      />
      <span className="glass rounded-full px-3 py-1 text-sm font-semibold text-ink">Your turn</span>
      <h2 className="text-4xl sm:text-6xl font-medium tracking-tight text-ink leading-[1.05] max-w-2xl">
        See it on your floor.
      </h2>
      <p className="text-lg text-ink-2 max-w-md">Tell us about your gym and the cameras you have. We'll take it from there.</p>
      <a href={MAILTO} className={primaryButton}>
        <Mail className="w-4 h-4" aria-hidden />
        Request a pilot
      </a>
      <p className="text-sm text-ink-2">
        Or write to{' '}
        <a href={MAILTO} className="font-semibold text-accent-ink hover:text-ink">
          {CONTACT_EMAIL}
        </a>
      </p>
    </Reveal>
    <Reveal className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[
        { to: '/demo', icon: Smartphone, label: 'Member app', title: `Be ${NAME} for a minute`, tone: 'lime' as const },
        { to: '/gyms/overview', icon: LayoutDashboard, label: 'Gym dashboard', title: 'Run the demo gym', tone: 'blue' as const },
      ].map((d) => (
        <Link key={d.to} to={d.to} className={`group p-6 flex flex-col min-h-[180px] ${TILE_TONES[d.tone]}`}>
          <span className="flex items-start justify-between text-ink">
            <IconDot icon={d.icon} tone={d.tone} />
            <OpenArrow />
          </span>
          <span className="mt-auto pt-6 text-sm font-medium text-ink-2">{d.label}</span>
          <span className="font-display text-2xl leading-tight text-ink mt-1">{d.title}</span>
        </Link>
      ))}
    </Reveal>
  </section>
);

const Footer: React.FC = () => (
  <footer className="max-w-[1100px] mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-ink-2">
    <Logo className="h-6" />
    <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
      <Link to="/demo" className="hover:text-ink">
        Member demo
      </Link>
      <Link to="/gyms/overview" className="hover:text-ink">
        Gym demo
      </Link>
      <Link to="/gyms/privacy" className="hover:text-ink">
        Privacy
      </Link>
      <Link to="/gyms/pilot" className="hover:text-ink">
        Pilot details
      </Link>
      <a href={MAILTO} className="hover:text-ink">
        {CONTACT_EMAIL}
      </a>
    </nav>
    <p className="text-xs text-ink-3">The demo gym and its data are fictional.</p>
  </footer>
);

export const Company: React.FC<{ onLogoClick: () => void }> = ({ onLogoClick }) => {
  const felix = useFelix();
  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  useScrollProgress(railRef, rootRef);
  const active = useActiveChapter(CHAPTER_IDS);
  const activeIndex = active ? CHAPTER_IDS.indexOf(active) : -1;

  const chapters: Omit<ChapterProps, 'state'>[] = [
    {
      id: 'walk-in',
      time: '6:02 pm',
      source: 'Real footage',
      title: `${NAME} walks in`,
      line: 'No check-in, nothing to wear. The cameras follow his body pose, not his face.',
      visual: <PoseFrame felix={felix} />,
    },
    {
      id: 'set',
      time: '6:05 pm',
      source: 'Real footage',
      title: 'Every rep, counted live',
      line: 'The real clip and the real pipeline output: reps tick up as he squats.',
      visual: <LiveReplay felix={felix} />,
      flip: true,
    },
    {
      id: 'logged',
      time: '6:41 pm',
      source: 'Real footage',
      title: "Logged before he's home",
      line: 'Reps, sets and the muscles he worked land in his app on their own. Nothing to type.',
      link: { to: felix ? `/demo?clip=squat&person=${felix.personId}` : '/demo', label: `Open ${NAME}'s app` },
      visual: <WorkoutCard felix={felix} />,
    },
    {
      id: 'morning',
      time: 'Next morning',
      source: 'Demo data',
      title: 'What to train next',
      line: "His app reads what's recovered and suggests the next workout, so he has a reason to come back.",
      note: 'Earlier workouts in his history are sample data. Recovery uses simplified estimates and is not medical advice.',
      visual: <NextWorkout felix={felix} />,
      flip: true,
    },
    {
      id: 'floor',
      time: 'Meanwhile',
      source: 'Demo data',
      title: 'The gym sees its floor',
      line: 'How full the floor is, and which zone members are queuing for. No sensors on the equipment.',
      note: 'Iron District Fitness is a fictional gym; its numbers come from a simulation of 600 members.',
      link: { to: '/gyms/overview', label: 'View the full dashboard' },
      visual: <FloorStatus />,
    },
    {
      id: 'slipping',
      time: '2 weeks later',
      source: 'Example',
      title: `${NAME} stops showing up`,
      line: 'Visits drop from three a week to none. The dashboard flags it early, and one tap sends a nudge.',
      link: { to: '/gyms/members', label: 'See every slipping member' },
      visual: <SlippingExample />,
      flip: true,
    },
    {
      id: 'privacy',
      time: 'Every visit',
      title: "What the cameras don't do",
      line: "Spottr reads body pose. Here's what that means for your members, limits included.",
      visual: <PrivacyList />,
    },
    {
      id: 'pays',
      time: 'Every month',
      source: 'Pilot pricing',
      title: 'It pays for itself',
      line: 'One price per location, free for your members. Pick your dues to see the break-even.',
      note: "Pilot pricing hasn't been tested with paying gyms yet. Break-even is the price divided by your average monthly dues.",
      link: { to: '/gyms/pilot', label: 'See pilot details' },
      visual: <PricingCard />,
      flip: true,
    },
    {
      id: 'start',
      time: 'Getting started',
      title: 'From first call to rollout',
      line: 'A pilot starts with a call about your floor plan and the cameras you already have.',
      visual: <PilotSteps />,
    },
  ];

  return (
    // Holds --progress for the rail and the phone progress line
    <div ref={rootRef}>
      <CompanyNav onLogoClick={onLogoClick} active={active} />
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <Intro />
        <div ref={railRef} className="relative lg:pl-16 flex flex-col gap-28 sm:gap-40 py-24 sm:py-32">
          <TimelineRail />
          {chapters.map((c, i) => (
            <Chapter key={c.id} {...c} state={i === activeIndex ? 'active' : i < activeIndex ? 'past' : 'next'} />
          ))}
        </div>
        <Contact />
      </div>
      <Footer />
    </div>
  );
};
