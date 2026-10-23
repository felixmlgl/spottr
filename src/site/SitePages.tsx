/**
 * Subpages of the main website ("/pricing", "/privacy"), with the landing page's top bar and footer.
 * The landing page's chapters link here ("Learn more"). Lazy-loaded by main.tsx.
 */

import React, { useEffect } from 'react';
import { SiteFooter } from './SiteFooter';
import { SiteNav } from './SiteNav';
import { Pricing } from './Pricing';
import { Privacy } from './Privacy';

/** `nav` is the top-bar entry this page belongs to. */
const SITE_PAGES: Record<string, { nav: string; title: string; component: React.FC }> = {
  '/pricing': { nav: 'Pricing', title: 'Pricing · Spottr', component: Pricing },
  '/privacy': { nav: 'Privacy', title: 'Privacy · Spottr', component: Privacy },
};

export const SitePages: React.FC<{ pathname: string }> = ({ pathname }) => {
  const { nav, title, component: Page } = SITE_PAGES[pathname];

  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <div className="min-h-screen text-ink flex flex-col font-sans">
      <SiteNav active={nav} />
      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-8">
        <Page />
      </main>
      <SiteFooter />
    </div>
  );
};
