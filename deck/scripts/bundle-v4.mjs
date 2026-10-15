// Writes deck/export/spottr-deck-v4.html: deck/v4/index.html as one file (CSS inlined, images as data URIs),
// so it opens anywhere. Missing team headshots stay as placeholders. Fonts still load from Google Fonts. Add ?cut=short for the 7-slide cut.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../v4');
const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(dir, 'v4.css'), 'utf8');
html = html.replace('<link rel="stylesheet" href="v4.css">', () => `<style>\n${css}</style>`);
html = html.replace(/src="(?!https?:|data:)([^"]+)"/g, (m, rel) => {
  const file = path.join(dir, rel);
  if (!fs.existsSync(file)) { console.log('not found, left as is (placeholder shows):', rel); return m; }
  return `src="data:${types[path.extname(file).toLowerCase()]};base64,${fs.readFileSync(file).toString('base64')}"`;
});
if (/href="(?!https?:|data:|#)[^"]+\.css"/.test(html)) throw new Error('stylesheet not inlined');
const out = path.resolve(dir, '../export/spottr-deck-v4.html');
fs.writeFileSync(out, html);
console.log(out, (fs.statSync(out).size / 1e6).toFixed(2) + ' MB');
