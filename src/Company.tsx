/**
 * Company site: the "For gym owners" section below the welcome hero ("/#gyms"). Lazy-loaded by Welcome.
 */

import React from 'react';
import { ArrowRight, ArrowUpRight, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from './router';
import { Logo } from './components/Logo';
import { BreakEvenCard, PilotStepsCard, PriceCard } from './gyms/components/BusinessCards';
import { SessionPlayer } from './components/SessionPlayer';
import { useClipData } from './hooks/useClipData';
import { defaultPersonId } from './services/memberSession';

const FOR_GYM = [
  ['Retention', 'See who is drifting away weeks before they cancel, and reach out while it still matters.'],
  ['Floor use', 'Know which racks members queue for and which machines sit idle, hour by hour.'],
] as const;

const FOR_MEMBERS = [
  ['Every set logged', 'Sets, reps and exercises show up in the member app on their own. No wearables, no typing.'],
  ['Free for members', 'The member app is part of your plan, so it reads as a perk of your gym.'],
] as const;

const PIPELINE = ['Your existing cameras', 'Spottr box on your network', 'Dashboard + member app'];

const primaryButton =
  'inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-ink text-white font-semibold hover:bg-accent-deep transition-colors';

/** The real squat clip and pipeline output, the same footage members see under "How we counted". */
const LiveReplay: React.FC = () => {
  const data = useClipData('squat');
  const personId = data ? defaultPersonId(data.session) : null;
  return (
    <figure className="viewfinder p-3 sm:p-4 flex flex-col gap-3">
      {data && personId ? (
        <SessionPlayer data={data} personId={personId} defaultOverlayMode="styled" repSound={false} />
      ) : (
        <div className="aspect-video bg-night flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-white/60" />
        </div>
      )}
      <figcaption className="hud-label">
        Real gym clip, real pipeline output. Everyone but the member being followed is pixelated.
      </figcaption>
    </figure>
  );
};

const ValueList: React.FC<{ label: string; items: readonly (readonly [string, string])[] }> = ({ label, items }) => (
  <div className="flex flex-col gap-4">
    <span className="hud-label">{label}</span>
    <dl className="flex flex-col gap-4">
      {items.map(([title, body]) => (
        <div key={title} className="border-t border-line pt-3">
          <dt className="font-display text-lg font-bold tracking-tight text-ink">{title}</dt>
          <dd className="text-sm text-ink-2 mt-1 leading-relaxed">{body}</dd>
        </div>
      ))}
    </dl>
  </div>
);

const DEMO_LINKS = [
  { to: '/gyms/overview', label: 'Gym dashboard' },
  { to: '/demo', label: 'Member app' },
];

/** Sticks to the top once the company section reaches it, so it never covers the video hero. */
const CompanyNav: React.FC<{ onLogoClick: () => void }> = ({ onLogoClick }) => (
  <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.04]">
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
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
      <nav aria-label="Demos" className="flex items-center gap-1 sm:gap-2">
        {DEMO_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="hidden sm:inline-flex items-center gap-0.5 px-3 py-1.5 rounded-full text-sm font-medium text-ink-2 hover:text-ink transition-colors"
          >
            {link.label}
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[1.75]" aria-hidden />
          </Link>
        ))}
        <Link
          to="/gyms/pilot"
          className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-accent-ink text-white hover:bg-accent-deep transition-colors"
        >
          Request pilot
        </Link>
      </nav>
    </div>
  </header>
);

export const Company: React.FC<{ onLogoClick: () => void }> = ({ onLogoClick }) => (
  <>
    <CompanyNav onLogoClick={onLogoClick} />
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 flex flex-col gap-20 pb-16">
      {/* Hero */}
      <section className="pt-10 sm:pt-14 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
        <div className="flex flex-col items-start">
          <span className="hud-label text-accent-ink mb-4">Spottr for gyms. Bay Area pilot.</span>
          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-ink leading-[1.02]">
            Your cameras already see every set. Now they count them too.
          </h2>
          <p className="text-lg text-ink-2 mt-5 max-w-xl">
            Spottr logs every set and rep for your members, and shows you how your floor is used and who is drifting
            away.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-8">
            <Link to="/gyms/overview" className={primaryButton}>
              See the gym dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/gyms/pilot"
              className="inline-flex items-center gap-1 px-5 py-3 rounded-full text-ink font-medium hover:bg-surface transition-colors"
            >
              Request a pilot
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <LiveReplay />
      </section>

      {/* What you get, and how it gets there */}
      <section className="flex flex-col gap-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <ValueList label="For your gym" items={FOR_GYM} />
          <ValueList label="For your members" items={FOR_MEMBERS} />
        </div>
        <ol className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 font-mono text-[13px] text-ink">
          {PIPELINE.map((step, i) => (
            <React.Fragment key={step}>
              <li className="px-3 py-2 rounded-sm bg-surface">{step}</li>
              {i < PIPELINE.length - 1 && (
                <li aria-hidden className="text-ink-3 px-1 rotate-90 sm:rotate-0 self-start sm:self-auto">
                  →
                </li>
              )}
            </React.Fragment>
          ))}
        </ol>
        <p className="text-xs text-ink-2 -mt-6">
          No sensors on the equipment and nothing for members to wear. The operator demo is Iron District Fitness,
          Oakland: a fictional gym with simulated data.
        </p>
      </section>

      {/* Business model */}
      <section className="flex flex-col gap-8">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">Pilot & pricing</h2>
          <p className="text-base text-ink-2 mt-2">One price per location. Free for your members.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <PilotStepsCard />
          <PriceCard />
          <BreakEvenCard />
        </div>
        <div>
          <Link to="/gyms/pilot" className={primaryButton}>
            Request a pilot
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  </>
);
