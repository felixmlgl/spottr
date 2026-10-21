import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from '../router';
import { Logo } from '../components/Logo';

const LINKS: { to: string; label: string; external?: boolean }[] = [
  { to: '/gyms/overview', label: 'Overview' },
  { to: '/gyms/locations', label: 'Locations' },
  { to: '/gyms/floor', label: 'Floor' },
  { to: '/gyms/world-map', label: 'Cameras' },
  { to: '/gyms/members', label: 'Members' },
  { to: '/demo', label: 'Member app', external: true },
  { to: '/gyms/privacy', label: 'Privacy' },
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
          className={`${compact ? 'px-3.5' : 'px-4'} py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap inline-flex items-center gap-0.5 ${
            isActive ? 'bg-white text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {link.label}
          {link.external && <ArrowUpRight className="w-3.5 h-3.5 stroke-[1.75]" aria-hidden />}
        </Link>
      );
    });

  const pilotActive = pathname === '/gyms/pilot';

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.04]">
      <div className="max-w-[1100px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/gyms" className="flex items-center gap-2 shrink-0">
          <Logo />
          <span className="text-sm font-medium text-ink-2">for Gyms</span>
        </Link>

        <nav aria-label="Gym demo" className="hidden xl:flex items-center p-1 bg-surface rounded-full">
          {renderLinks(false)}
        </nav>

        <Link
          to="/gyms/pilot"
          aria-current={pilotActive ? 'page' : undefined}
          className={`shrink-0 inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            pilotActive ? 'bg-ink text-white' : 'bg-accent-ink text-white hover:bg-accent-deep'
          }`}
        >
          Request pilot
        </Link>
      </div>

      {/* Compact: horizontally scrollable pill row */}
      <nav aria-label="Gym demo" className="xl:hidden border-t border-black/[0.04]">
        <div className="max-w-[1100px] mx-auto px-4 py-2 overflow-x-auto [mask-image:linear-gradient(to_right,black_88%,transparent)]">
          <div className="inline-flex items-center p-1 bg-surface rounded-full">{renderLinks(true)}</div>
        </div>
      </nav>
    </header>
  );
};
