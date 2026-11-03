/**
 * "/demos": the link we send people so they pick a side straight away. Most arrive here without having seen the
 * landing page, so it says what Spottr is and shows a live peek of each interface. Lazy-loaded by main.tsx.
 */

import React, { useEffect } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from '../router';
import { Logo } from '../components/Logo';
import { FloorStatus } from '../gyms/components/FloorNow';
import { useFelix, WorkoutCard } from '../landing/previews';
import { openRequestDemo } from '../requestDemo/RequestDemo';
import { openWaitlist } from '../waitlist/Waitlist';

const Choice: React.FC<{ to: string; wash: string; label: string; title: string; text: string; cta: string; preview: React.ReactNode }> = ({
  to,
  wash,
  label,
  title,
  text,
  cta,
  preview,
}) => (
  <Link to={to} className="group panel overflow-hidden flex flex-col transition-shadow hover:shadow-[0_24px_60px_-24px_rgb(42_92_219/0.45)]">
    {/* A peek at the real interface, cut off at the bottom. Inert: the whole card is the link. */}
    <div className={`relative h-40 sm:h-72 overflow-hidden px-5 sm:px-10 pt-5 sm:pt-8 ${wash}`}>
      <div inert className="[&>*]:!bg-white transition-transform duration-300 group-hover:-translate-y-2 motion-reduce:transition-none">
        {preview}
      </div>
    </div>
    <div className="p-5 sm:p-8 flex flex-col gap-2 flex-1">
      <span className="text-sm font-medium text-ink-2">{label}</span>
      <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-ink">{title}</h2>
      <p className="text-base text-ink-2 max-w-md">{text}</p>
      <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-base font-semibold text-accent-ink">
        {cta}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden />
      </span>
    </div>
  </Link>
);

export const Demos: React.FC = () => {
  const felix = useFelix();

  useEffect(() => {
    const previous = document.title;
    document.title = 'Try the demo · Spottr';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans text-ink">
      <header className="max-w-[1100px] w-full mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        <Link to="/" aria-label="Spottr, home">
          <Logo />
        </Link>
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink">
          What is Spottr?
          <ArrowUpRight className="w-4 h-4" aria-hidden />
        </Link>
      </header>

      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 pt-2 sm:pt-8 pb-16 flex flex-col gap-8 sm:gap-12">
        <div className="flex flex-col items-center text-center gap-4">
          <span className="hidden sm:inline glass rounded-full px-3 py-1 text-sm font-semibold text-ink">Interactive demo</span>
          <h1 className="font-display text-[34px] sm:text-6xl font-medium tracking-tight leading-[1.05] max-w-3xl text-balance">
            Which side of the gym are you on?
          </h1>
          <p className="text-base sm:text-lg text-ink-2 max-w-xl">
            Spottr turns the cameras a gym already has into automatic workout tracking. Nothing to wear, nothing to type.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Choice
            to="/demo"
            wash="bg-lime bg-[radial-gradient(90%_80%_at_100%_0%,#EEFFCC,transparent_70%)]"
            label="I train at a gym"
            title="The member app"
            text="See a real workout the cameras logged on their own: reps, sets, the muscles worked and what to train next."
            cta="Open the member app"
            preview={<WorkoutCard felix={felix} />}
          />
          <Choice
            to="/gyms/overview"
            wash="bg-[radial-gradient(90%_80%_at_100%_0%,#6B95FF,transparent_70%),linear-gradient(160deg,#2A5CDB,#1F49B5)]"
            label="I run a gym"
            title="The gym dashboard"
            text="See how full the floor is, which zones members queue for, and which regulars are about to stop coming."
            cta="Open the dashboard"
            preview={<FloorStatus />}
          />
        </div>

        <p className="text-center text-sm text-ink-2">
          Want Spottr for real?{' '}
          <button type="button" onClick={() => openRequestDemo()} className="font-semibold text-accent-ink hover:text-ink cursor-pointer">
            Request a demo for your gym
          </button>{' '}
          or{' '}
          <button type="button" onClick={openWaitlist} className="font-semibold text-accent-ink hover:text-ink cursor-pointer">
            ask for it at yours
          </button>
          .
        </p>
      </main>

      <p className="pb-8 text-center text-xs text-ink-3">The demo gym and its data are fictional.</p>
    </div>
  );
};
