// Captures demo/gyms screens into deck/site/assets. Requires `npm run dev` on port 3000.
// Raw replay frames are first written to /tmp/fr (they show other gym members) and then cropped to the lifter by crop-lifter.mjs.
import { chromium } from 'playwright';
import fs from 'node:fs';
fs.mkdirSync('/tmp/fr', { recursive: true });
const out = new URL('../site/assets/', import.meta.url).pathname;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:3000/demo?clip=squat&person=2'); await p.waitForTimeout(1500);
const m = p.getByText('As a gym-goer'); if (await m.count()) { await m.click(); await p.waitForTimeout(1500); }
// slide 4: the Today card (muscle map + recap), no header avatar
await p.screenshot({ path: out + 'demo-main.png', clip: { x: 194, y: 266, width: 1052, height: 464 } });
for (const [mode, prefix] of [['Styled', 's'], ['Raw', 'r']]) {
  await p.goto('http://localhost:3000/demo?clip=squat&person=2'); await p.waitForTimeout(1500);
  const m2 = p.getByText('As a gym-goer'); if (await m2.count()) { await m2.click(); await p.waitForTimeout(1500); }
  await p.getByText('Watch how we counted').click(); await p.waitForTimeout(2000);
  await p.getByText('Details').click(); await p.getByText(mode, { exact: true }).click(); await p.mouse.click(5, 5);
  await p.getByText(/Set 1 · 5 squat/).click(); await p.waitForTimeout(800);
  const box = await p.locator('canvas').first().boundingBox();
  await p.getByRole('button', { name: 'Play' }).click();
  for (let i = 0; i < 16; i++) { await p.waitForTimeout(200); await p.screenshot({ path: `/tmp/fr/${prefix}${String(i).padStart(2, '0')}.png`, clip: box }); }
  await p.getByRole('button', { name: 'Pause' }).click().catch(() => {});
  if (prefix === 's') await p.screenshot({ path: out + 'demo-setchip.png', clip: { x: 392, y: 754, width: 172, height: 40 } });
}
// slide 4: gym floor / zone overview (mock data)
await p.goto('http://localhost:3000/gyms/floor'); await p.waitForTimeout(3000);
await p.screenshot({ path: out + 'gyms-floor.png', clip: { x: 223, y: 410, width: 638, height: 395 } });
await b.close();
