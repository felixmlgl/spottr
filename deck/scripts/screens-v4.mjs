// Captures the app screens used in deck v4 into deck/v4/assets. Requires `npm run dev` (port 3000).
// Member app: phone viewport on the recorded dip clip (pipeline output). Gym dashboard: the simulated demo gym.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../v4/assets');
const base = 'http://localhost:3000';
const b = await chromium.launch({ channel: 'chrome' });

const phone = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await phone.goto(`${base}/demo?clip=dip&person=1`); await phone.waitForTimeout(3500);
await phone.screenshot({ path: path.join(out, 'app-today.png') });

// Replay ("Watch how we counted"), seeked with the player's own slider to just after the 10th rep (33.8 s)
await phone.getByText('Watch how we counted').first().click(); await phone.waitForTimeout(2500);
await phone.locator('input[type=range]').first().fill('34.2');
await phone.waitForTimeout(1500);
await phone.screenshot({ path: path.join(out, 'app-replay.png') });

const desk = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await desk.goto(`${base}/gyms/overview`); await desk.waitForTimeout(3000);
await desk.screenshot({ path: path.join(out, 'gym-overview.png') });
await b.close();
console.log('ok');
