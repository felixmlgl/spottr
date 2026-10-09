// Renders deck/site/index.html to deck/export/spottr-deck-draft.pdf and deck/qa/render/slide-NN.png.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'file://' + path.join(root, 'site/index.html');
fs.mkdirSync(path.join(root, 'qa/render'), { recursive: true });
fs.mkdirSync(path.join(root, 'export'), { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(url); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
const n = await p.locator('.slide').count();
for (let k = 1; k <= n; k++) {
  await p.goto(url + '#' + k); await p.reload(); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(root, `qa/render/slide-${String(k).padStart(2, '0')}.png`) });
}
await p.goto(url); await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(400);
await p.pdf({ path: path.join(root, 'export/spottr-deck-draft.pdf'), width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
await b.close();
const pdf = fs.readFileSync(path.join(root, 'export/spottr-deck-draft.pdf'), 'latin1');
const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log('slides', n, 'pdf pages', pages);
