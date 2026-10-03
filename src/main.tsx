import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
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
  if (!isGyms) return <App />;
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <GymsApp pathname={pathname} />
    </Suspense>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
