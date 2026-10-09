// Builds the lifter images from raw replay frames in /tmp/fr (raw frames show other members and are never stored in the repo).
// Crops tightly to the lifter (no other members, no label above the head) and pixelates the head region.
import { chromium } from 'playwright';
import fs from 'node:fs';
const out = new URL('../site/assets/', import.meta.url).pathname;
const frames = [1, 3, 5].map(i => 'data:image/png;base64,' + fs.readFileSync(`/tmp/fr/f${String(i).padStart(2, '0')}.png`).toString('base64'));
const rep = 'data:image/png;base64,' + fs.readFileSync('/tmp/fr/f05.png').toString('base64');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
const res = await p.evaluate(async ([frames, rep]) => {
  const CX = 1100, CY = 102, CW = 226, CH = 248, S = 2;
  const crops = [];
  for (const src of frames) {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const [bx, by, bw, bh, cell] = [1148, 102, 132, 66, 8];
    for (let yy = by; yy < by + bh; yy += cell) for (let xx = bx; xx < bx + bw; xx += cell) {
      const d = x.getImageData(xx + cell / 2, yy + cell / 2, 1, 1).data;
      x.fillStyle = `rgb(${d[0]},${d[1]},${d[2]})`; x.fillRect(xx, yy, cell, cell);
    }
    crops.push(c);
  }
  const gap = 24;
  const seq = document.createElement('canvas'); seq.width = (CW * 3 + gap * 2) * S; seq.height = CH * S;
  const sx = seq.getContext('2d'); sx.imageSmoothingQuality = 'high'; sx.fillStyle = '#fff'; sx.fillRect(0, 0, seq.width, seq.height);
  crops.forEach((c, i) => sx.drawImage(c, CX, CY, CW, CH, i * (CW + gap) * S, 0, CW * S, CH * S));
  const one = document.createElement('canvas'); one.width = CW * S; one.height = CH * S;
  const ox = one.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(crops[2], CX, CY, CW, CH, 0, 0, CW * S, CH * S);
  const ri = new Image(); ri.src = rep; await ri.decode();
  const rc = document.createElement('canvas'); rc.width = 150; rc.height = 90; rc.getContext('2d').drawImage(ri, 1740, 940, 150, 90, 0, 0, 150, 90);
  return [seq.toDataURL('image/png'), one.toDataURL('image/png'), rc.toDataURL('image/png')];
}, [frames, rep]);
['demo-lifter-seq.png', 'demo-lifter.png', 'demo-repchip.png'].forEach((n, i) => fs.writeFileSync(out + n, Buffer.from(res[i].split(',')[1], 'base64')));
await b.close();
