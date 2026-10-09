// Captures demo/gyms screens into deck/site/assets. Requires `npm run dev` on port 3000.
import { chromium } from 'playwright';
const out = new URL('../site/assets/', import.meta.url).pathname;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:3000/demo?clip=squat&person=2'); await p.waitForTimeout(1500);
const m = p.getByText('As a gym-goer'); if (await m.count()) { await m.click(); await p.waitForTimeout(1500); }
// Main tab: crop below header (header avatar shows a face thumbnail)
// slide 4: right half of the Today card (muscle map), no header avatar
await p.screenshot({ path: out + 'demo-main.png', clip: { x: 724, y: 268, width: 522, height: 460 } });
await p.getByText('Watch how we counted').click(); await p.waitForTimeout(2000);
await p.getByText(/Set 1 · 5 squat/).click(); await p.waitForTimeout(1000);
await p.getByRole('button', { name: 'Play' }).click(); await p.waitForTimeout(3500);
await p.getByRole('button', { name: 'Pause' }).click().catch(() => {});
await p.waitForTimeout(500);
// video area only (no page footer text, no header)
await p.screenshot({ path: '/tmp/demo-replay-raw.png', clip: { x: 244, y: 178, width: 952, height: 524 } });
await p.goto('http://localhost:3000/gyms/overview'); await p.waitForTimeout(2500);
// slide 4: first two KPI tiles + the full weekly-visits chart
await p.screenshot({ path: out + 'gyms-overview.png', clip: { x: 194, y: 245, width: 520, height: 164 } });
await b.close();
