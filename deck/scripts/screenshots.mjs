// Captures demo/gyms screens into deck/site/assets. Requires `npm run dev` on port 3000.
import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('/tmp/fr', { recursive: true });
const out = new URL('../site/assets/', import.meta.url).pathname;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:3000/demo?clip=squat&person=2'); await p.waitForTimeout(1500);
const m = p.getByText('As a gym-goer'); if (await m.count()) { await m.click(); await p.waitForTimeout(1500); }
// Main tab: crop below header (header avatar shows a face thumbnail)
// slide 4: the Today card (muscle map + recap), no header avatar
await p.screenshot({ path: out + 'demo-main.png', clip: { x: 194, y: 266, width: 1052, height: 464 } });
await p.getByText('Watch how we counted').click(); await p.waitForTimeout(2000);
await p.getByText(/Set 1 · 5 squat/).click(); await p.waitForTimeout(800);
await p.getByRole('button', { name: 'Play' }).click();
// raw replay frames (they show other members, so they only go to /tmp, never into the repo)
for (let i = 0; i < 14; i++) {
  await p.waitForTimeout(250);
  await p.screenshot({ path: `/tmp/fr/f${String(i).padStart(2, '0')}.png`, clip: { x: 244, y: 178, width: 952, height: 524 } });
}
await p.getByRole('button', { name: 'Pause' }).click().catch(() => {});
// set summary chip row (page UI, no people)
await p.screenshot({ path: out + 'demo-setchip.png', clip: { x: 336, y: 756, width: 220, height: 38 } });
await b.close();
