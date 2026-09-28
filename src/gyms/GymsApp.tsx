/**
 * Spottr for Gyms – operator sales demo, served under /gyms.
 * Fictional gym "Iron District Fitness, Oakland" with deterministic mock data (src/mocks/gym).
 */

import React, { useEffect } from 'react';
import { GymNav } from './GymNav';
import { ToastProvider } from './components/Toast';
import { Landing } from './pages/Landing';
import { Overview } from './pages/Overview';
import { Floor } from './pages/Floor';
import { Members } from './pages/Members';
import { Privacy } from './pages/Privacy';
import { RequestPilot } from './pages/RequestPilot';

const PAGES: Record<string, { title: string; component: React.FC }> = {
  '/gyms': { title: 'Spottr for Gyms', component: Landing },
  '/gyms/overview': { title: 'Overview · Spottr for Gyms', component: Overview },
  '/gyms/floor': { title: 'Floor · Spottr for Gyms', component: Floor },
  '/gyms/members': { title: 'Members · Spottr for Gyms', component: Members },
  '/gyms/privacy': { title: 'Privacy · Spottr for Gyms', component: Privacy },
  '/gyms/pilot': { title: 'Request a pilot · Spottr for Gyms', component: RequestPilot },
};

export const GymsApp: React.FC<{ pathname: string }> = ({ pathname }) => {
  const normalized = pathname.replace(/\/+$/, '') || '/gyms';
  const route = PAGES[normalized] ? normalized : '/gyms';
  const { title, component: Page } = PAGES[route];

  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-white text-[#1D1D1F] flex flex-col font-sans">
        <GymNav pathname={route} />
        <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-8">
          <Page />
        </main>
        <footer className="max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-8 text-xs text-[#6E6E73] border-t border-black/[0.04]">
          Spottr for Gyms · Iron District Fitness is a fictional gym; all figures in this demo are simulated.
        </footer>
      </div>
    </ToastProvider>
  );
};
