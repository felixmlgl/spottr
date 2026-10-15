// Renders deck/v4/index.html to deck/export/spottr-deck-v4.pdf (main + appendix) and spottr-deck-v4-short.pdf
// (7-slide cut, ?cut=short), plus PNGs in deck/qa/render-v4/ and deck/qa/render-v4-short/.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'file://' + path.join(root, 'v4/index.html');
fs.mkdirSync(path.join(root, 'export'), { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
for (const [query, renders, pdf] of [['', 'qa/render-v4', 'spottr-deck-v4.pdf'], ['?cut=short', 'qa/render-v4-short', 'spottr-deck-v4-short.pdf']]) {
  const url = base + query;
  const dir = path.join(root, renders);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  await p.goto(url); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  const n = await p.locator('.slide:not(.out)').count();
  for (let k = 1; k <= n; k++) {
    await p.goto(url + '#' + k); await p.reload(); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(dir, `slide-${String(k).padStart(2, '0')}.png`) });
  }
  await p.goto(url); await p.evaluate(() => document.fonts.ready); await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(400);
  const out = path.join(root, 'export', pdf);
  await p.pdf({ path: out, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
  await p.emulateMedia({ media: 'screen' });
  const pages = (fs.readFileSync(out, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(pdf, 'slides', n, 'pdf pages', pages);
}
await b.close();
