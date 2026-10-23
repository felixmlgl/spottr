import React from 'react';
import { Link } from '../router';
import { Logo } from '../components/Logo';
import { ChapterLink } from './SiteNav';

export const CONTACT_EMAIL = 'info@tryspottr.app';
export const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Spottr pilot for our gym')}`;

/** Footer of the main website: the landing page and its subpages. */
export const SiteFooter: React.FC = () => (
  <footer className="max-w-[1100px] mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-ink-2">
    <Logo className="h-6" />
    <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
      <Link to="/demo" className="hover:text-ink">
        Member demo
      </Link>
      <Link to="/gyms/overview" className="hover:text-ink">
        Gym demo
      </Link>
      <ChapterLink to="pays" className="hover:text-ink">
        Pricing
      </ChapterLink>
      <ChapterLink to="privacy" className="hover:text-ink">
        Privacy
      </ChapterLink>
      <a href={MAILTO} className="hover:text-ink">
        {CONTACT_EMAIL}
      </a>
    </nav>
    <p className="text-xs text-ink-3">The demo gym and its data are fictional.</p>
  </footer>
);
