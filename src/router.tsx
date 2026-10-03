/**
 * Minimal client-side router (pathname + History API).
 * Used to split the member app ("/") from the gym operator demo ("/gyms/*").
 */

import React, { useEffect, useState } from 'react';

const NAVIGATE_EVENT = 'spottr:navigate';

export function navigate(to: string, { replace = false }: { replace?: boolean } = {}) {
  if (to === window.location.pathname + window.location.search) return;
  if (replace) {
    window.history.replaceState({}, '', to);
    window.dispatchEvent(new Event(NAVIGATE_EVENT));
    return;
  }
  window.history.pushState({}, '', to);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
  window.scrollTo(0, 0);
}

function useLocationValue<T>(read: () => T): T {
  const [value, setValue] = useState(read);

  useEffect(() => {
    const update = () => setValue(read);
    window.addEventListener('popstate', update);
    window.addEventListener(NAVIGATE_EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(NAVIGATE_EVENT, update);
    };
  }, []);

  return value;
}

export function usePathname(): string {
  return useLocationValue(() => window.location.pathname);
}

/** Current query string; re-renders on navigate() and back/forward. */
export function useSearch(): string {
  return useLocationValue(() => window.location.search);
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
