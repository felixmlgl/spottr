/**
 * The request-a-demo popup can be opened from anywhere: call openRequestDemo(), optionally with the gym size the
 * visitor already picked. RequestDemoHost (mounted once in main.tsx) listens and loads the dialog on first use.
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import type { TierId } from '../gyms/pricing';

const OPEN_EVENT = 'spottr:request-demo';

const RequestDemoDialog = lazy(() => import('./RequestDemoDialog').then((m) => ({ default: m.RequestDemoDialog })));

export const openRequestDemo = (tier?: TierId) => {
  window.dispatchEvent(new CustomEvent<TierId | undefined>(OPEN_EVENT, { detail: tier }));
};

export const RequestDemoHost: React.FC = () => {
  // A new key per opening, so the form starts fresh every time
  const [request, setRequest] = useState<{ key: number; tier?: TierId } | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => setRequest({ key: Date.now(), tier: (e as CustomEvent<TierId | undefined>).detail });
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  if (!request) return null;
  return (
    <Suspense fallback={null}>
      <RequestDemoDialog key={request.key} initialTier={request.tier} onClose={() => setRequest(null)} />
    </Suspense>
  );
};
