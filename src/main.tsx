import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import {Analytics} from '@vercel/analytics/react';
import App from './App.tsx';
import {Welcome} from './Welcome.tsx';
import {usePathname} from './router.tsx';
import './index.css';

// The member demo used to live at "/"; forward old shared links like "/?clip=…&person=…"
if (window.location.pathname === '/' && window.location.search) {
  window.history.replaceState({}, '', `/demo${window.location.search}`);
}

// Gym operator demo is only loaded when visiting /gyms
const GymsApp = lazy(() => import('./gyms/GymsApp.tsx').then((m) => ({default: m.GymsApp})));

function Root() {
  const pathname = usePathname();
  if (pathname === '/') return <Welcome />;
  const isGyms = pathname === '/gyms' || pathname.startsWith('/gyms/');
  return (
    <>
      {isGyms ? (
        <Suspense fallback={<div className="min-h-screen bg-white" />}>
          <GymsApp pathname={pathname} />
        </Suspense>
      ) : (
        <App />
      )}
      {/* Page views come from our router (pushState + popstate) rather than the script's
          auto-tracking, which only patches pushState and misses back/forward. */}
      <Analytics route={pathname} path={pathname} />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
