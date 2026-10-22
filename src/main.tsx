import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import {Analytics} from '@vercel/analytics/react';
import App from './App.tsx';
import {Welcome} from './Welcome.tsx';
import {NotFound} from './NotFound.tsx';
import {usePathname} from './router.tsx';
import {RequestDemoHost} from './requestDemo/RequestDemo.tsx';
import './index.css';

// The member demo used to live at "/"; forward old shared links like "/?clip=…&person=…"
const initialParams = new URLSearchParams(window.location.search);
if (window.location.pathname === '/' && (initialParams.has('clip') || initialParams.has('person'))) {
  window.history.replaceState({}, '', `/demo${window.location.search}`);
}
// The gym pitch used to be its own page at "/gyms"; it's now the company section below the welcome hero
if (/^\/gyms\/?$/.test(window.location.pathname)) {
  window.history.replaceState({}, '', `/${window.location.search}#gyms`);
}

// Gym operator demo is only loaded when visiting /gyms
const GymsApp = lazy(() => import('./gyms/GymsApp.tsx').then((m) => ({default: m.GymsApp})));

function Page({pathname}: {pathname: string}) {
  if (pathname === '/') return <Welcome />;
  if (pathname === '/gyms' || pathname.startsWith('/gyms/')) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <GymsApp pathname={pathname} />
      </Suspense>
    );
  }
  if (pathname.replace(/\/+$/, '') === '/demo') return <App />;
  return <NotFound />;
}

function Root() {
  const pathname = usePathname();
  // Where a visit came from, e.g. "?src=deck" on the pitch deck's links and QR code. Only the
  // page view that still has it in the URL is tagged; in-app navigation drops the query.
  const source = new URLSearchParams(window.location.search).get('src')?.replace(/[^\w-]/g, '').slice(0, 32);
  const path = source ? `${pathname}?src=${source}` : pathname;
  return (
    <>
      <Page pathname={pathname} />
      <RequestDemoHost />
      {/* Page views come from our router (pushState + popstate) rather than the script's
          auto-tracking, which only patches pushState and misses back/forward. */}
      <Analytics route={pathname} path={path} />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
