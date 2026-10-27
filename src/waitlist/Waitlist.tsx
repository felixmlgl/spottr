/**
 * The join-the-waitlist popup for gym members can be opened from anywhere: call openWaitlist(). WaitlistHost (mounted
 * once in main.tsx) listens and loads the dialog on first use. It also opens on "/#waitlist" ("/waitlist" is forwarded
 * there), filled in from "?gym=…&city=…": the link members pass on to people from their gym.
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';

const OPEN_EVENT = 'spottr:waitlist';

/** The waitlist section of the privacy page ("/privacy#member-waitlist"). Not "#waitlist": that opens the popup */
export const PRIVACY_ANCHOR = 'member-waitlist';

const WaitlistDialog = lazy(() => import('./WaitlistDialog').then((m) => ({ default: m.WaitlistDialog })));

export interface WaitlistPrefill {
  gym: string;
  city: string;
}

export const openWaitlist = () => {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
};

/** The prefill from a "#waitlist" link, or null when the page wasn't opened from one. */
const fromLink = (): WaitlistPrefill | null => {
  if (window.location.hash !== '#waitlist') return null;
  const params = new URLSearchParams(window.location.search);
  return { gym: params.get('gym')?.slice(0, 150) ?? '', city: params.get('city')?.slice(0, 100) ?? '' };
};

type Opening = { key: number; prefill?: WaitlistPrefill; fromLink?: boolean };

export const WaitlistHost: React.FC = () => {
  // A new key per opening, so the form starts fresh every time
  const [request, setRequest] = useState<Opening | null>(() => {
    const prefill = fromLink();
    return prefill && { key: 0, prefill, fromLink: true };
  });

  useEffect(() => {
    const onOpen = () => setRequest({ key: Date.now() });
    const onHash = () => {
      const prefill = fromLink();
      if (prefill) setRequest({ key: Date.now(), prefill, fromLink: true });
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const close = () => {
    // Drop the link's "#waitlist" and prefill, so a reload doesn't open the popup again
    if (request?.fromLink) window.history.replaceState({}, '', window.location.pathname);
    setRequest(null);
  };

  if (!request) return null;
  return (
    <Suspense fallback={null}>
      <WaitlistDialog key={request.key} prefill={request.prefill} onClose={close} />
    </Suspense>
  );
};
