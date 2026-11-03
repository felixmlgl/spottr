/**
 * The join-the-waitlist popup for gym members can be opened from anywhere: call openWaitlist(). WaitlistHost (mounted
 * once in main.tsx) listens and loads the dialog on first use. It also opens on "/#waitlist" ("/waitlist" is forwarded
 * there): filled in from "?gym=…&city=…" (the link members pass on to people from their gym), or acting on
 * "?confirm=…" / "?leave=…" (the links in the confirmation email, see api/join-waitlist.ts).
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

/** A link from the confirmation email: confirm the sign-up, or remove it */
export interface WaitlistLink {
  action: 'confirm' | 'remove';
  token: string;
}

export const openWaitlist = () => {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
};

type Opening = { key: number; prefill?: WaitlistPrefill; link?: WaitlistLink; fromLink?: boolean };

/** What a "#waitlist" link asks for, or null when the page wasn't opened from one. */
const fromLink = (key: number): Opening | null => {
  if (window.location.hash !== '#waitlist') return null;
  const params = new URLSearchParams(window.location.search);
  const confirm = params.get('confirm');
  const leave = params.get('leave');
  return {
    key,
    fromLink: true,
    prefill: { gym: params.get('gym')?.slice(0, 150) ?? '', city: params.get('city')?.slice(0, 100) ?? '' },
    link: confirm ? { action: 'confirm', token: confirm } : leave ? { action: 'remove', token: leave } : undefined,
  };
};

/** Drops the link's "#waitlist" and its parameters, so a reload doesn't open the popup again */
const cleanUrl = () => window.history.replaceState({}, '', window.location.pathname);

export const WaitlistHost: React.FC = () => {
  // A new key per opening, so the form starts fresh every time
  const [request, setRequest] = useState<Opening | null>(() => fromLink(0));

  // The email's token shouldn't stay in the address bar, where it could be copied along with the page: drop it now
  useEffect(() => {
    if (request?.link) cleanUrl();
  }, [request]);

  useEffect(() => {
    const onOpen = () => setRequest({ key: Date.now() });
    const onHash = () => {
      const opening = fromLink(Date.now());
      if (opening) setRequest(opening);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const close = () => {
    if (request?.fromLink) cleanUrl();
    setRequest(null);
  };

  if (!request) return null;
  return (
    <Suspense fallback={null}>
      <WaitlistDialog key={request.key} prefill={request.prefill} link={request.link} onClose={close} />
    </Suspense>
  );
};
