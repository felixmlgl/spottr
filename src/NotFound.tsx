/**
 * 404 page for any path that isn't "/", "/demo" or a known "/gyms/*" page.
 * Vercel rewrites every path to index.html, so unknown URLs land here instead of a server 404.
 */

import React, { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from './router';
import { Logo } from './components/Logo';

const DESTINATIONS = [
  { to: '/demo', label: 'Member app demo', body: 'See a workout the gym camera logged.' },
  { to: '/gyms', label: 'Spottr for Gyms', body: 'The operator dashboard for a simulated demo gym.' },
];

/** The page body, also shown inside the gym demo's layout for unknown /gyms/* paths. */
export const NotFoundContent: React.FC = () => {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Page not found · Spottr';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="flex flex-col gap-8 py-10 max-w-xl">
      <div>
        <p className="text-sm font-medium text-[#6E6E73]">404</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1D1D1F] mt-1">Page not found</h1>
        <p className="text-base text-[#6E6E73] mt-2">This link doesn't lead anywhere. Try one of these instead.</p>
      </div>
      <div className="bg-[#F5F5F7] rounded-[24px] divide-y divide-black/[0.05] overflow-hidden">
        {DESTINATIONS.map((d) => (
          <Link key={d.to} to={d.to} className="p-5 flex items-center justify-between gap-4 hover:bg-black/[0.02]">
            <div>
              <p className="text-sm font-semibold text-[#1D1D1F]">{d.label}</p>
              <p className="text-xs text-[#6E6E73] mt-0.5">{d.body}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#6E6E73] shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export const NotFound: React.FC = () => (
  <div className="min-h-screen bg-white text-[#1D1D1F]">
    <header className="max-w-[1100px] mx-auto px-4 sm:px-6 h-16 flex items-center">
      <Link to="/" aria-label="Spottr home">
        <Logo />
      </Link>
    </header>
    <main className="max-w-[1100px] mx-auto px-4 sm:px-6">
      <NotFoundContent />
    </main>
  </div>
);
