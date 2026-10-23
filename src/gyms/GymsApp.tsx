/**
 * Spottr for Gyms – operator sales demo, served under /gyms.
 * Fictional chain "Iron District Fitness" (Oakland simulated in detail) with deterministic mock data (src/mocks/gym).
 */

import React, { useEffect } from 'react';
import { GymNav } from './GymNav';
import { ToastProvider } from './components/Toast';
import { Overview } from './pages/Overview';
import { Locations } from './pages/Locations';
import { Floor } from './pages/Floor';
import { Members } from './pages/Members';
import { WorldMapPage } from './world/WorldMapPage';
import { NotFoundContent } from '../NotFound';

const PAGES: Record<string, { title: string; component: React.FC }> = {
  '/gyms/overview': { title: 'Overview · Spottr for Gyms', component: Overview },
  '/gyms/locations': { title: 'Locations · Spottr for Gyms', component: Locations },
  '/gyms/floor': { title: 'Floor · Spottr for Gyms', component: Floor },
  '/gyms/world-map': { title: 'Cameras · Spottr for Gyms', component: WorldMapPage },
  '/gyms/members': { title: 'Members · Spottr for Gyms', component: Members },
};

const NOT_FOUND = { title: 'Page not found · Spottr for Gyms', component: NotFoundContent };

export const GymsApp: React.FC<{ pathname: string }> = ({ pathname }) => {
  const route = pathname.replace(/\/+$/, '') || '/gyms';
  const { title, component: Page } = PAGES[route] ?? NOT_FOUND;

  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <ToastProvider>
      <div className="min-h-screen text-ink flex flex-col font-sans">
        <GymNav pathname={route} />
        <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-8">
          <Page />
        </main>
        <footer className="max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-8 text-xs text-ink-2">
          Spottr for Gyms · Iron District Fitness is a fictional gym chain; all figures in this demo are simulated.
        </footer>
      </div>
    </ToastProvider>
  );
};
