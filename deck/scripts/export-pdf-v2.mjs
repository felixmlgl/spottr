// Renders deck/v2/index.html to deck/export/spottr-deck-v2.pdf and deck/qa/render-v2/slide-NN.png.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'file://' + path.join(root, 'v2/index.html');
const renders = path.join(root, 'qa/render-v2');
fs.mkdirSync(renders, { recursive: true });
fs.mkdirSync(path.join(root, 'export'), { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(url); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
const n = await p.locator('.slide').count();
for (let k = 1; k <= n; k++) {
  await p.goto(url + '#' + k); await p.reload(); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(renders, `slide-${String(k).padStart(2, '0')}.png`) });
}
await p.goto(url); await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(400);
const out = path.join(root, 'export/spottr-deck-v2.pdf');
await p.pdf({ path: out, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
await b.close();
const pages = (fs.readFileSync(out, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log('slides', n, 'pdf pages', pages);
