import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage();
await p.goto('file://' + new URL('../site/index.html', import.meta.url).pathname);
const r = await p.evaluate(() => [...document.querySelectorAll('.slide')].map(s => { const c = s.cloneNode(true); c.querySelectorAll('.todo,.todos,.src,.brand,.pageno,.demo-tag,svg,.label,.tag,.ax,.mo').forEach(e => e.remove()); return c.textContent.trim().split(/\s+/).join(' '); }));
r.forEach((t,i)=>console.log(i+1, t.split(' ').length, t.slice(0,400)));
await b.close();
