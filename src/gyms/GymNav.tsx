import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from '../router';

const LINKS: { to: string; label: string; external?: boolean }[] = [
  { to: '/gyms/overview', label: 'Overview' },
  { to: '/gyms/floor', label: 'Floor' },
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
            isActive ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
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
        <Link to="/gyms" className="flex items-baseline gap-1.5 shrink-0">
          <span className="font-logo text-xl tracking-tight text-[#1D1D1F]">spottr</span>
          <span className="text-sm font-medium text-[#6E6E73]">for Gyms</span>
        </Link>

        <nav aria-label="Gym demo" className="hidden lg:flex items-center p-1 bg-[#F5F5F7] rounded-full">
          {renderLinks(false)}
        </nav>

        <Link
          to="/gyms/pilot"
          aria-current={pilotActive ? 'page' : undefined}
          className={`shrink-0 inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            pilotActive ? 'bg-[#1D1D1F] text-white' : 'bg-[#34C759] text-white hover:bg-[#2DB14F]'
          }`}
        >
          Request pilot
        </Link>
      </div>

      {/* Compact: horizontally scrollable pill row */}
      <nav aria-label="Gym demo" className="lg:hidden border-t border-black/[0.04]">
        <div className="max-w-[1100px] mx-auto px-4 py-2 overflow-x-auto">
          <div className="inline-flex items-center p-1 bg-[#F5F5F7] rounded-full">{renderLinks(true)}</div>
        </div>
      </nav>
    </header>
  );
};
