// Crops the styled-overlay replay frames in /tmp/fr tightly to the lifter (no other gym members, no badge) and builds
// demo-lifter-seq.png (3 frames, no gaps), demo-lifter.png (single frame) and demo-repchip.png.
import { chromium } from 'playwright';
import fs from 'node:fs';
const out = new URL('../site/assets/', import.meta.url).pathname;
const rd = (i, pre = 'r') => 'data:image/png;base64,' + fs.readFileSync(`/tmp/fr/${pre}${String(i).padStart(2, '0')}.png`).toString('base64');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
const res = await p.evaluate(async ([a, c, d, e]) => {
  const load = async s => { const i = new Image(); i.src = s; await i.decode(); return i; };
  const [x0, y0, x1, y1] = [0.578, 0.107, 0.698, 0.345];
  const crop = (img, ctx, dx, dw, dh) => ctx.drawImage(img, img.width * x0, img.height * y0, img.width * (x1 - x0), img.height * (y1 - y0), dx, 0, dw, dh);
  const imgs = await Promise.all([a, c, d].map(load));
  const w = Math.round(imgs[0].width * (x1 - x0)), h = Math.round(imgs[0].height * (y1 - y0));
  const seq = document.createElement('canvas'); seq.width = w * 3; seq.height = h; const sx = seq.getContext('2d'); sx.imageSmoothingQuality = 'high';
  imgs.forEach((im, i) => crop(im, sx, i * w, w, h));
  const one = document.createElement('canvas'); one.width = w; one.height = h; const ox = one.getContext('2d'); crop(imgs[1], ox, 0, w, h);
  // rep badge above the lifter (styled overlay), no other members in this band
  const ri = await load(e); const rc = document.createElement('canvas'); rc.width = Math.round(ri.width * 0.165); rc.height = Math.round(ri.height * 0.08);
  rc.getContext('2d').drawImage(ri, ri.width * 0.59, ri.height * 0.035, rc.width, rc.height, 0, 0, rc.width, rc.height);
  return [seq.toDataURL('image/png'), one.toDataURL('image/png'), rc.toDataURL('image/png')];
}, [rd(4), rd(6), rd(14), rd(9, 's')]);
['demo-lifter-seq.png', 'demo-lifter.png', 'demo-repchip.png'].forEach((n, i) => fs.writeFileSync(out + n, Buffer.from(res[i].split(',')[1], 'base64')));
await b.close();
