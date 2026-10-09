// Pixelates the lifter's head region in the replay screenshot (no documented consent for the footage).
import { chromium } from 'playwright';
import fs from 'node:fs';
const f = new URL('../site/assets/demo-replay-raw.png', import.meta.url).pathname;
const o = new URL('../site/assets/demo-replay.png', import.meta.url).pathname;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
const data = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const res = await p.evaluate(async ([src, box]) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const [bx, by, bw, bh, cell] = box;
  for (let yy = by; yy < by + bh; yy += cell) for (let xx = bx; xx < bx + bw; xx += cell) {
    const d = x.getImageData(xx + cell / 2, yy + cell / 2, 1, 1).data;
    x.fillStyle = `rgb(${d[0]},${d[1]},${d[2]})`; x.fillRect(xx, yy, cell, cell);
  }
  return c.toDataURL('image/png');
}, [data, [1190, 92, 72, 60, 12]]);
fs.writeFileSync(o, Buffer.from(res.split(',')[1], 'base64'));
await b.close();
