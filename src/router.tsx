/**
 * Minimal client-side router (pathname + History API).
 * Used to split the member app ("/") from the gym operator demo ("/gyms/*").
 */

import React, { useEffect, useState } from 'react';

const NAVIGATE_EVENT = 'spottr:navigate';

export function navigate(to: string) {
  if (to === window.location.pathname) return;
  window.history.pushState({}, '', to);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
  window.scrollTo(0, 0);
}

export function usePathname(): string {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const update = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', update);
    window.addEventListener(NAVIGATE_EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(NAVIGATE_EVENT, update);
    };
  }, []);

  return pathname;
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
}

export const Link: React.FC<LinkProps> = ({ to, onClick, children, ...rest }) => (
  <a
    href={to}
    onClick={(e) => {
      onClick?.(e);
      // Let the browser handle new-tab / modified clicks
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      e.preventDefault();
      navigate(to);
    }}
    {...rest}
  >
    {children}
  </a>
);
