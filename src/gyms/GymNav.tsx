import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from '../router';
import { Logo } from '../components/Logo';
import { openRequestDemo } from '../requestDemo/RequestDemo';

const LINKS: { to: string; label: string; external?: boolean }[] = [
  { to: '/gyms/overview', label: 'Overview' },
  { to: '/gyms/locations', label: 'Locations' },
  { to: '/gyms/floor', label: 'Floor' },
  { to: '/gyms/world-map', label: 'Cameras' },
  { to: '/gyms/members', label: 'Members' },
  { to: '/demo', label: 'Member app', external: true },
  { to: '/gyms/privacy', label: 'Privacy' },
  { to: '/gyms/pilot', label: 'Pricing' },
];

export const GymNav: React.FC<{ pathname: string }> = ({ pathname }) => {
  const renderLinks = (compact: boolean) =>
    LINKS.map((link) => {
      const isActive = pathname === link.to;
      return (
        <Link
          key={link.to}
          to={link.to}
          aria-current={isActive ? 'page' : undefined}
          className={`${compact ? 'px-3.5' : 'px-4'} py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap inline-flex items-center gap-0.5 ${
            isActive ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink hover:bg-white/60'
          }`}
        >
          {link.label}
          {link.external && <ArrowUpRight className="w-3.5 h-3.5 stroke-[1.75]" aria-hidden />}
        </Link>
      );
    });

  return (
    <header className="sticky top-0 z-30 px-3 sm:px-4 pt-3">
      {/* Floating glass capsule */}
      <div className="glass max-w-[1100px] mx-auto rounded-full h-14 pl-5 pr-2 flex items-center justify-between gap-4">
        <Link to="/#gyms" className="flex items-center gap-2 shrink-0">
          <Logo />
          <span className="text-sm font-medium text-ink-2">for Gyms</span>
        </Link>

        <nav aria-label="Gym demo" className="hidden xl:flex items-center gap-0.5">
          {renderLinks(false)}
        </nav>

        <button
          type="button"
          onClick={() => openRequestDemo()}
          className="shrink-0 inline-flex items-center h-10 px-5 rounded-full text-sm font-semibold bg-accent-ink text-white hover:bg-accent-deep transition-colors cursor-pointer"
        >
          Request a demo
        </button>
      </div>

      {/* Compact: horizontally scrollable pill row */}
      {/* The scroll mask sits inside the glass: a mask on an ancestor would stop the glass blurring the page behind */}
      <nav aria-label="Gym demo" className="xl:hidden glass max-w-[1100px] mx-auto mt-2 p-1 rounded-full">
        <div className="flex items-center overflow-x-auto [mask-image:linear-gradient(to_right,black_88%,transparent)]">
          {renderLinks(true)}
        </div>
      </nav>
    </header>
  );
};
