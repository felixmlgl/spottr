import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {usePathname} from './router.tsx';
import './index.css';

// Gym operator demo is only loaded when visiting /gyms
const GymsApp = lazy(() => import('./gyms/GymsApp.tsx').then((m) => ({default: m.GymsApp})));

function Root() {
  const pathname = usePathname();
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
