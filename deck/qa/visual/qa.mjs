import { chromium } from '/Users/felix_muellergliemann/projects/spottr/deck/scripts/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const root = '/Users/felix_muellergliemann/projects/spottr/deck/';
const url = 'file://' + root + 'site/index.html';
const b = await chromium.launch({ channel: 'chrome' });
const out = {};
for (const [w, h] of [[1920, 1080], [1280, 720]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(url); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const n = await p.locator('.slide').count();
  for (let k = 1; k <= n; k++) {
    await p.goto(url + '#' + k); await p.reload(); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
    await p.screenshot({ path: `${root}qa/visual/${w}/slide-${String(k).padStart(2, '0')}.png` });
  }
  await p.close();
}
// metrics at 1920
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(url); await p.evaluate(() => document.fonts.ready);
const res = await p.evaluate(() => {
  const lum = c => { const [r,g,bb] = c.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v/=255; return v<=.03928? v/12.92 : Math.pow((v+.055)/1.055,2.4); }); return .2126*r+.7152*g+.0722*bb; };
  const slides = [...document.querySelectorAll('.slide')];
  return slides.map((s, i) => {
    s.classList.add('active'); s.style.display = 'flex';
    const sr = s.getBoundingClientRect(); const issues = [];
    if (s.scrollHeight > s.clientHeight + 1 || s.scrollWidth > s.clientWidth + 1) issues.push(`slide scroll ${s.scrollWidth}x${s.scrollHeight}`);
    const small = new Set(), lowc = new Set();
    const tw = document.createTreeWalker(s, NodeFilter.SHOW_TEXT); let t;
    while ((t = tw.nextNode())) {
      const txt = t.textContent.trim(); if (!txt) continue; const e = t.parentElement;
      const cs = getComputedStyle(e); const fs = parseFloat(cs.fontSize);
      const isMeta = e.closest('.src,.todo,.todos,.brand,.pageno,.demo-tag,.cap,.assump,.label,.ax');
      if (fs < 28 && !isMeta) small.add(`${fs}px "${txt.slice(0,30)}"`);
      if (fs < 20) small.add(`TINY ${fs}px "${txt.slice(0,30)}"`);
      const r = document.createRange(); r.selectNodeContents(t); const bb = r.getBoundingClientRect();
      if (bb.right > sr.left+1920-60 || bb.bottom > sr.top+1080-20 || bb.left < sr.left+60) issues.push(`text near edge "${txt.slice(0,30)}" r=${Math.round(bb.right)} b=${Math.round(bb.bottom)} l=${Math.round(bb.left)}`);
      // contrast vs slide bg approx
      let bg = 'rgb(250,250,248)'; for (let x = e; x && x !== s.parentElement; x = x.parentElement) { const c = getComputedStyle(x).backgroundColor; if (c && !c.endsWith(', 0)') && c !== 'transparent') { bg = c; break; } }
      const L1 = lum(cs.color), L2 = lum(bg); const cr = (Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
      if (cr < 4.5) lowc.add(`${cr.toFixed(2)} ${cs.color} on ${bg} "${txt.slice(0,25)}" ${fs}px`);
    }
    s.querySelectorAll('*').forEach(e => { if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible') issues.push('overflow ' + e.className); });
    // overlap: elements outside frame
    s.querySelectorAll('*').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && (r.right > sr.right+1 || r.bottom > sr.bottom+1 || r.left < sr.left-1) && !e.closest('.blob,.wave')) issues.push(`box out of frame ${e.tagName}.${e.className} r=${Math.round(r.right)} b=${Math.round(r.bottom)}`); });
    // overlaps between todos and src / content
    const todos = s.querySelector('.todos')?.getBoundingClientRect(), src = s.querySelector('.src')?.getBoundingClientRect();
    const ov = [];
    if (todos && src && todos.bottom > src.top) ov.push('todos overlap src');
    if (todos) [...s.children].forEach(c => { if (c.matches('.todos,.brand,.pageno,.blob,.wave,.src')) return; [c,...c.querySelectorAll('*')].forEach(d => { if (d.children.length) return; const r = d.getBoundingClientRect(); if (r.width && r.height && r.bottom > todos.top+2 && r.top < todos.bottom-2 && r.right > todos.left && r.left < todos.right && d.textContent.trim()) ov.push('content overlaps todos: ' + d.textContent.trim().slice(0,30)); }); });
    if (src) [...s.children].forEach(c => { if (c.matches('.todos,.brand,.pageno,.blob,.wave,.src')) return; [c,...c.querySelectorAll('*')].forEach(d => { if (d.children.length) return; const r = d.getBoundingClientRect(); if (r.width && r.bottom > src.top+2 && d.textContent.trim() && r.top < src.bottom) ov.push('content overlaps src: ' + d.textContent.trim().slice(0,30)); }); });
    const c = s.cloneNode(true); c.querySelectorAll('.todo,.todos,.src,.brand,.pageno,.demo-tag,svg,.label').forEach(e => e.remove());
    const words = c.textContent.trim().split(/\s+/).length;
    const green = [...s.querySelectorAll('.green,.bar.g,.dot.sp,.demo-tag.real,.blob,.wave')].map(e => e.className.toString() || e.tagName);
    const imgs = [...s.querySelectorAll('img')].map(i => i.getAttribute('src'));
    const tagCount = s.querySelectorAll('.demo-tag').length;
    const sc = s.textContent.includes('FPS') || s.textContent.includes('RTSP ONVIF');
    s.classList.remove('active'); s.style.display = '';
    return { n: i+1, words, issues: [...new Set(issues)].slice(0,8), ov: [...new Set(ov)].slice(0,6), small: [...small].slice(0,8), lowc: [...lowc].slice(0,8), green, imgs, tagCount, fpsLabel: sc };
  });
});
fs.writeFileSync(root + 'qa/visual/metrics.json', JSON.stringify(res, null, 1));
// nav test
const q = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await q.goto(url); const seq = [];
const cur = async () => q.evaluate(() => document.getElementById('counter').textContent);
seq.push(await cur());
await q.keyboard.press('ArrowRight'); seq.push(await cur());
await q.keyboard.press('ArrowRight'); seq.push(await cur());
await q.keyboard.press('ArrowLeft'); seq.push(await cur());
await q.keyboard.press('End'); seq.push(await cur());
await q.keyboard.press('ArrowRight'); seq.push(await cur());
await q.keyboard.press('Home'); seq.push(await cur());
await q.keyboard.press('ArrowLeft'); seq.push(await cur());
console.log('nav', seq.join(' | '));
// PDF re-render
await q.emulateMedia({ media: 'print' });
await q.pdf({ path: root + 'qa/visual/tmp.pdf', width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
const heights = await q.evaluate(() => [...document.querySelectorAll('.slide')].map(s => [Math.round(s.getBoundingClientRect().height), s.scrollHeight]));
console.log('print slide heights', JSON.stringify(heights));
await b.close();
for (const f of ['export/spottr-deck-draft.pdf', 'qa/visual/tmp.pdf']) {
  const pdf = fs.readFileSync(root + f, 'latin1');
  console.log(f, 'pages', (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length, (pdf.match(/\/MediaBox\s*\[[^\]]*\]/) || [])[0]);
}
