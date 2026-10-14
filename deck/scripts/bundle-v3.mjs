// Writes deck/export/spottr-deck-v3.html: deck/v3/index.html as one file (CSS inlined, images as data URIs),
// so it opens anywhere. Fonts still load from Google Fonts. Add ?cut=short for the 7-slide cut.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const v3 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../v3');
const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };
let html = fs.readFileSync(path.join(v3, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(v3, 'v3.css'), 'utf8');
html = html.replace('<link rel="stylesheet" href="v3.css">', () => `<style>\n${css}</style>`);
html = html.replace(/src="(?!https?:|data:)([^"]+)"/g, (_, rel) => {
  const file = path.join(v3, rel);
  return `src="data:${types[path.extname(file).toLowerCase()]};base64,${fs.readFileSync(file).toString('base64')}"`;
});
if (/(src|href)="(?!https?:|data:|#)[^"]+\.(png|jpe?g|svg|css)"/.test(html)) throw new Error('local reference left');
const out = path.resolve(v3, '../export/spottr-deck-v3.html');
fs.writeFileSync(out, html);
console.log(out, (fs.statSync(out).size / 1e6).toFixed(2) + ' MB');
