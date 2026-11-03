/**
 * Company site: the "For gym owners" section below the welcome hero ("/#gyms"). Lazy-loaded by Welcome.
 * One scroll, told as one member's evening: he walks in, trains, sees his workout, gets a plan; the gym sees its floor
 * and notices when he slips; then privacy, price and how a pilot starts. Every chapter uses the same template
 * (landing/Chapter.tsx) and shows the real product in place, so the page only links away at the very end.
 */

import React, { useEffect, useRef } from 'react';
import { ArrowDown, Cctv, Gift, LayoutDashboard, PersonStanding, Smartphone } from 'lucide-react';
import { Link } from './router';
import { openRequestDemo } from './requestDemo/RequestDemo';
import { openWaitlist } from './waitlist/Waitlist';
import { CONTACT_EMAIL, MAILTO, SiteFooter } from './site/SiteFooter';
import { CHAPTER_IDS, ChapterLink, NAV, SiteNav } from './site/SiteNav';
import { IconDot, OpenArrow, TILE_TONES } from './components/Tile';
import { FloorStatus } from './gyms/components/FloorNow';
import { MEMBER_PROFILE } from './mocks/memberData';
import { Chapter, ChapterProps, Reveal, TimelineRail, useActiveChapter, useScrollProgress } from './landing/Chapter';
import {
  NextWorkout,
  PilotSteps,
  PricingCard,
  PrivacyList,
  SlippingExample,
  TwoCameras,
  useFelix,
  WalkInPhoto,
  WorkoutCard,
} from './landing/previews';

const NAME = MEMBER_PROFILE.name;

const primaryButton =
  'inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-ink text-white font-semibold hover:bg-accent-deep transition-colors cursor-pointer';
const quietButton =
  'inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-ink font-medium hover:bg-white/60 transition-colors cursor-pointer';

const FACTS: [typeof Cctv, string][] = [
  [Cctv, 'Uses your existing cameras'],
  [PersonStanding, 'Nothing for members to wear'],
  [Gift, 'Free for your members'],
];

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
      <button type="button" onClick={() => openRequestDemo()} className={primaryButton}>
        Request a demo
      </button>
      <ChapterLink to="walk-in" className={quietButton}>
        Follow one workout
        <ArrowDown className="w-4 h-4" aria-hidden />
      </ChapterLink>
    </div>
  </Reveal>
);

/** The one action, the members' way to ask for Spottr at their gym, then the two full demos for anyone who wants to click around. */
const Contact: React.FC = () => (
  <section id="contact" className="scroll-mt-28 flex flex-col gap-6">
    <Reveal className="panel relative isolate overflow-hidden p-8 sm:p-12 flex flex-col items-start gap-5">
      {/* A calm glow of logo blue and lime on the right, clear of the text */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_95%_at_100%_0%,rgb(77_128_255/0.2),transparent_70%),radial-gradient(45%_80%_at_95%_100%,rgb(199_255_106/0.35),transparent_70%)]"
      />
      <span className="glass rounded-full px-3 py-1 text-sm font-semibold text-ink">Your turn</span>
      <h2 className="text-4xl sm:text-6xl font-medium tracking-tight text-ink leading-[1.05] max-w-2xl">
        See it on your floor.
      </h2>
      <p className="text-lg text-ink-2 max-w-md">Tell us about your gym and the cameras you have. We'll take it from there.</p>
      <button type="button" onClick={() => openRequestDemo()} className={primaryButton}>
        Request a demo
      </button>
      <p className="text-sm text-ink-2">
        Or write to{' '}
        <a href={MAILTO} className="font-semibold text-accent-ink hover:text-ink">
          {CONTACT_EMAIL}
        </a>
      </p>
    </Reveal>
    {/* Members can't buy Spottr, but they can ask for it: their sign-ups are the list we bring to their gym */}
    <Reveal className="panel p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
      <div className="flex-1 flex flex-col items-start gap-3">
        <span className="px-3 py-1 rounded-full bg-lime text-[13px] font-semibold text-ink">For members</span>
        <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-ink leading-[1.1]">Want Spottr at your gym?</h2>
        <p className="text-lg text-ink-2 max-w-lg">
          Join the waitlist for the gym you train at. Once enough of its members ask, we take the list to them.
        </p>
      </div>
      <button type="button" onClick={openWaitlist} className={`${primaryButton} shrink-0 self-start sm:self-auto`}>
        Join the waitlist
      </button>
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

export const Company: React.FC<{ onLogoClick: () => void }> = ({ onLogoClick }) => {
  const felix = useFelix();
  const railRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(railRef);
  const active = useActiveChapter(CHAPTER_IDS);
  const activeIndex = active ? CHAPTER_IDS.indexOf(active) : -1;

  // Links from other pages ("/#pays") land on their chapter. Once more after a moment: the clip data and fonts
  // arriving can still shift the chapters above it.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!CHAPTER_IDS.includes(id)) return;
    const land = () => document.getElementById(id)?.scrollIntoView();
    land();
    const timer = window.setTimeout(land, 600);
    return () => window.clearTimeout(timer);
  }, []);

  const chapters: Omit<ChapterProps, 'state'>[] = [
    {
      id: 'walk-in',
      time: '6:02 pm',
      source: 'Stock photo',
      title: `${NAME} walks in`,
      line: 'No check-in, nothing to wear. The cameras follow his body pose, not his face.',
      visual: <WalkInPhoto />,
    },
    {
      id: 'set',
      time: '6:05 pm',
      source: 'Test scene',
      title: 'Two cameras, one person',
      line: 'Most gym floors are covered by more than one camera. Spottr matches every view of a member to one person, so nobody is counted twice.',
      note: "A generated test scene: one room filmed from two corners. The boxes, labels and matches are the real output of Spottr's multi-camera tracking.",
      visual: <TwoCameras />,
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
      link: { to: '/privacy', label: 'Learn more about privacy' },
      visual: <PrivacyList />,
    },
    {
      id: 'pays',
      time: 'Every month',
      source: 'Pilot pricing',
      title: 'It pays for itself',
      line: 'Priced by the size of your gym, free for your members. Pick yours to see the price and the break-even.',
      note: "Pilot pricing hasn't been tested with paying gyms yet. Break-even is the price divided by typical monthly dues for that size.",
      link: { to: '/pricing', label: 'Learn more about pricing' },
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
    <>
      <SiteNav onLogoClick={onLogoClick} active={NAV.find((n) => active !== null && n.chapters.includes(active))?.label ?? null} progress={progress} />
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <Intro />
        <div ref={railRef} className="relative lg:pl-16 flex flex-col gap-28 sm:gap-40 py-24 sm:py-32">
          <TimelineRail progress={progress} />
          {chapters.map((c, i) => (
            <Chapter key={c.id} {...c} state={i === activeIndex ? 'active' : i < activeIndex ? 'past' : 'next'} />
          ))}
        </div>
        <Contact />
      </div>
      <SiteFooter />
    </>
  );
};
