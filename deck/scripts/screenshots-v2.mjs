// Captures the extra v2 deck screens (gym overview cards, world map) into deck/site/assets. Requires `npm run dev` on port 3000.
// The world map is captured without the camera frames, so no gym member is in the image.
import { chromium } from 'playwright';
const out = new URL('../site/assets/', import.meta.url).pathname;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

// Smallest ancestor card around a heading text.
const card = (text) => p.getByText(text, { exact: true }).first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]');

await p.goto('http://localhost:3000/gyms/overview'); await p.waitForTimeout(2500);
await card('Peak hours').screenshot({ path: out + 'gyms-peak-hours.png' });
await card('What Spottr noticed this week').screenshot({ path: out + 'gyms-insights.png' });

await p.goto('http://localhost:3000/gyms/world-map'); await p.waitForTimeout(3000);
const map = p.locator('svg[aria-label^="Bird\'s-eye map"]').first();
await map.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
await map.screenshot({ path: out + 'world-map.png' });
await b.close();
console.log('ok');
