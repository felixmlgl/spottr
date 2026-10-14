// Renders end-of-set replay frames for deck v3 into deck/v3/assets (fixes the "x0" frame in v2).
// Frame = recorded clip at time t + the pipeline's own keypoints (public/demo-data/<clip>/overlay.json, nearest frame)
// + the rep count from session.json at t. Crops are tight to the lifter. People the pose model did not detect
// (so no box to check) are pixelated by hand via `pixelate`, like the replay pixelates detected bystanders.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.resolve(here, '../../public');
const out = path.resolve(here, '../v3/assets');
fs.mkdirSync(out, { recursive: true });

// crop = [x0, y0, x1, y1] in video pixels; checked against every other track's box at t (see guard below).
// pixelate = regions in video pixels with background people the tracker missed (checked by eye on the render).
const SHOTS = [
  { clip: 'dip', person: 1, t: 34.2, crop: [300, 120, 720, 640], pixelate: [[330, 300, 456, 430], [676, 330, 720, 410]], name: 'replay-dip-end.png' },
];

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });

for (const s of SHOTS) {
  const session = JSON.parse(fs.readFileSync(path.join(pub, 'demo-data', s.clip, 'session.json'), 'utf8'));
  const overlay = JSON.parse(fs.readFileSync(path.join(pub, 'demo-data', s.clip, 'overlay.json'), 'utf8'));
  const person = session.people.find((q) => q.id === s.person);
  const frame = overlay.frames.reduce((a, f) => (Math.abs(f.t - s.t) < Math.abs(a.t - s.t) ? f : a));
  const set = person.sets.find((x) => x.start_s - 0.3 <= s.t && s.t <= x.end_s + 1.5);
  const reps = set.rep_times_s.filter((rt) => rt <= s.t).length;
  const [x0, y0, x1, y1] = s.crop;

  // Guard: no other person's box may reach into the crop.
  for (const row of frame.p) {
    if (person.track_ids.includes(row[0])) continue;
    const [bx0, by0, bx1, by1] = row.slice(1, 5);
    if (bx0 < x1 && bx1 > x0 && by0 < y1 && by1 > y0) throw new Error(`${s.clip}: track ${row[0]} is inside the crop`);
  }
  const lifter = frame.p.find((row) => person.track_ids.includes(row[0]));
  const kp = [];
  for (let k = 0; k < 17; k++) kp.push([lifter[5 + 2 * k], lifter[6 + 2 * k]]);

  const w = x1 - x0, h = y1 - y0;
  const video = 'file://' + path.join(pub, 'videosCorrect', session.video);
  const bones = overlay.edges
    .filter(([a, c]) => kp[a][0] >= 0 && kp[c][0] >= 0)
    .map(([a, c]) => `<line x1="${kp[a][0]}" y1="${kp[a][1]}" x2="${kp[c][0]}" y2="${kp[c][1]}"/>`).join('');
  const dots = kp.filter(([x]) => x >= 0).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5"/>`).join('');
  const label = set.exercise.charAt(0).toUpperCase() + set.exercise.slice(1).replace('_', ' ');

  // A file:// page, so the file:// video is allowed to load.
  const page = path.join(os.tmpdir(), 'spottr-replay-frame.html');
  fs.writeFileSync(page, `<!doctype html><html><body style="margin:0;background:#000">
    <div id="box" style="position:relative;width:${w}px;height:${h}px;overflow:hidden">
      <video id="v" src="${video}" muted preload="auto" style="position:absolute;left:${-x0}px;top:${-y0}px;width:${session.width}px;height:${session.height}px"></video>
      <svg viewBox="${x0} ${y0} ${w} ${h}" style="position:absolute;inset:0;width:100%;height:100%">
        <g stroke="#34c759" stroke-width="5" stroke-linecap="round">${bones}</g>
        <g fill="#fff" stroke="#34c759" stroke-width="2.5">${dots}</g>
      </svg>
      <div style="position:absolute;left:18px;top:18px;font:600 22px/1 -apple-system,Helvetica,Arial,sans-serif;color:#000;background:#fff;border-radius:999px;padding:9px 16px 9px 12px;display:flex;gap:9px;align-items:center">
        <span style="width:12px;height:12px;border-radius:50%;background:#34c759;display:inline-block"></span>${label} · ${reps} reps
      </div>
    </div></body></html>`);
  await p.goto('file://' + page);
  await p.evaluate(async ({ t, regions, x0, y0 }) => {
    const v = document.getElementById('v');
    if (v.readyState < 1) await new Promise((r, e) => { v.addEventListener('loadedmetadata', r, { once: true }); v.addEventListener('error', () => e(new Error('video failed to load')), { once: true }); });
    v.currentTime = t;
    await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
    for (const [rx0, ry0, rx1, ry1] of regions) {
      const c = document.createElement('canvas');
      c.width = Math.ceil((rx1 - rx0) / 9); c.height = Math.ceil((ry1 - ry0) / 9);
      c.style.cssText = `position:absolute;left:${rx0 - x0}px;top:${ry0 - y0}px;width:${rx1 - rx0}px;height:${ry1 - ry0}px;image-rendering:pixelated`;
      c.getContext('2d').drawImage(v, rx0, ry0, rx1 - rx0, ry1 - ry0, 0, 0, c.width, c.height);
      document.getElementById('box').insertBefore(c, document.querySelector('svg'));
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, { t: s.t, regions: s.pixelate || [], x0, y0 });
  await p.locator('#box').screenshot({ path: path.join(out, s.name) });
  console.log(s.name, `${label} · ${reps} reps`, 'frame t', frame.t);
}
await b.close();
