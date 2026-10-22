/**
 * Company site: the "For gym owners" section below the welcome hero ("/#gyms"). Lazy-loaded by Welcome.
 * Built to be read at a glance: one line per idea, and every tile opens the part of the demo with the detail.
 */

import React from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Cctv,
  Cpu,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  LucideIcon,
  ShieldCheck,
  Smartphone,
  UserMinus,
} from 'lucide-react';
import { Link } from './router';
import { Logo } from './components/Logo';
import { IconDot, OpenArrow, TILE_TONES, TileTone } from './components/Tile';
import { breakEvenMembers, DEFAULT_DUES, formatUsd, PRICE_PER_LOCATION_MONTH } from './gyms/pricing';
import { SessionPlayer } from './components/SessionPlayer';
import { useClipData } from './hooks/useClipData';
import { defaultPersonId } from './services/memberSession';

const BENEFITS: { label: string; title: string; to: string; icon: LucideIcon; tone: TileTone }[] = [
  { label: 'Retention', title: "See who's drifting away", to: '/gyms/members', icon: UserMinus, tone: 'blue' },
  { label: 'Floor', title: 'Know which racks are full', to: '/gyms/floor', icon: LayoutGrid, tone: 'glass' },
  { label: 'Members', title: 'Every set logged for them', to: '/demo', icon: Smartphone, tone: 'lime' },
  { label: 'Privacy', title: 'No face recognition', to: '/gyms/privacy', icon: ShieldCheck, tone: 'glass' },
];

const STEPS: [LucideIcon, string][] = [
  [Cctv, 'Your cameras'],
  [Cpu, 'Spottr box'],
  [LayoutDashboard, 'Dashboard + app'],
];

const primaryButton =
  'inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-ink text-white font-semibold hover:bg-accent-deep transition-colors';

/** The real squat clip and pipeline output, the same footage members see under "How we counted". */
const LiveReplay: React.FC = () => {
  const data = useClipData('squat');
  const personId = data ? defaultPersonId(data.session) : null;
  return (
    <figure className="panel p-3 sm:p-4 flex flex-col gap-3">
      {data && personId ? (
        <SessionPlayer data={data} personId={personId} defaultOverlayMode="styled" repSound={false} />
      ) : (
        <div className="aspect-video bg-night flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-white/60" />
        </div>
      )}
      <figcaption className="hud-label">Real gym clip. Everyone else is pixelated.</figcaption>
    </figure>
  );
};

/** One benefit, one line. The whole tile opens the demo page that shows it in detail. */
const BenefitTile: React.FC<(typeof BENEFITS)[number]> = ({ label, title, to, icon, tone }) => (
  <Link to={to} className={`group p-4 sm:p-6 flex flex-col min-h-[180px] sm:min-h-[210px] ${TILE_TONES[tone]}`}>
    <span className="flex items-start justify-between text-ink">
      <IconDot icon={icon} tone={tone} />
      <OpenArrow />
    </span>
    <span className="mt-auto pt-6 text-sm font-medium text-ink-2">{label}</span>
    <span className="font-display text-xl sm:text-2xl leading-tight text-ink mt-1">{title}</span>
  </Link>
);

const DEMO_LINKS = [
  { to: '/gyms/overview', label: 'Gym dashboard' },
  { to: '/demo', label: 'Member app' },
];

/** Sticks to the top once the company section reaches it, so it never covers the video hero. */
const CompanyNav: React.FC<{ onLogoClick: () => void }> = ({ onLogoClick }) => (
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
      <nav aria-label="Demos" className="flex items-center gap-1 sm:gap-2">
        {DEMO_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="hidden sm:inline-flex items-center gap-0.5 px-3.5 py-2 rounded-full text-sm font-medium text-ink-2 hover:text-ink hover:bg-white/60 transition-colors"
          >
            {link.label}
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[1.75]" aria-hidden />
          </Link>
        ))}
        <Link
          to="/gyms/pilot"
          className="inline-flex items-center h-10 px-5 rounded-full text-sm font-semibold bg-accent-ink text-white hover:bg-accent-deep transition-colors"
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
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 flex flex-col gap-24 pb-16">
      {/* Hero */}
      <section className="pt-10 sm:pt-14 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
        <div className="flex flex-col items-start">
          <span className="mb-5 px-3 py-1 rounded-full bg-lime text-[13px] font-semibold text-ink">For gyms · Bay Area pilot</span>
          <h2 className="text-5xl sm:text-7xl font-medium tracking-tight text-ink leading-[1]">
            Your cameras already see every set. Now they count them.
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-8">
            <Link to="/gyms/overview" className={primaryButton}>
              See the dashboard
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

      {/* What you get: one line each, every tile opens the detail */}
      <section className="flex flex-col gap-6">
        <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-ink">What you get</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {BENEFITS.map((b) => (
            <BenefitTile key={b.to} {...b} />
          ))}
        </div>
      </section>

      {/* How it works: three icons, nothing to install on the equipment */}
      <section className="flex flex-col gap-6">
        <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-ink">How it works</h2>
        <ol className="flex flex-col sm:flex-row sm:items-center gap-3">
          {STEPS.map(([Icon, label], i) => (
            <React.Fragment key={label}>
              <li className="glass rounded-full pl-2 pr-5 py-2 flex items-center gap-3 self-start sm:self-auto">
                <IconDot icon={Icon} className="bg-accent/10 text-accent-ink" />
                <span className="text-base font-medium text-ink">{label}</span>
              </li>
              {i < STEPS.length - 1 && (
                <li aria-hidden className="hidden sm:block flex-1 h-2 rounded-full hatch min-w-6" />
              )}
            </React.Fragment>
          ))}
        </ol>
      </section>

      {/* Pricing at a glance; the full breakdown lives on the pilot page */}
      <section className="panel p-6 sm:p-10 flex flex-col gap-8">
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex flex-col-reverse">
            <dt className="text-sm text-ink-2 mt-2">per location / month</dt>
            <dd className="num text-5xl text-ink">{formatUsd(PRICE_PER_LOCATION_MONTH)}</dd>
          </div>
          <div className="flex flex-col-reverse">
            <dt className="text-sm text-ink-2 mt-2">for your members</dt>
            <dd className="num text-5xl text-ink">Free</dd>
          </div>
          <div className="flex flex-col-reverse">
            <dt className="text-sm text-ink-2 mt-2">retained members a month pay for it</dt>
            <dd className="num text-5xl text-ink">
              <span className="marker">{breakEvenMembers(DEFAULT_DUES)}</span>
            </dd>
          </div>
        </dl>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Link to="/gyms/pilot" className={primaryButton}>
            Request a pilot
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/gyms/pilot"
            className="inline-flex items-center gap-1 px-5 py-3 rounded-full text-ink font-medium hover:bg-white/60 transition-colors"
          >
            How the pilot works
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <p className="text-xs text-ink-3 -mt-14">
        Pilot pricing. Break-even assumes {formatUsd(DEFAULT_DUES)} average monthly dues. The demo gym is fictional and its data simulated.
      </p>
    </div>
  </>
);
