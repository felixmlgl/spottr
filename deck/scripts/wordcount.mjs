import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage();
await p.goto('file://' + new URL('../site/index.html', import.meta.url).pathname);
console.log(await p.evaluate(() => [...document.querySelectorAll('.slide')].map(s => { const c = s.cloneNode(true); c.querySelectorAll('.todo,.todos,.src,.brand,.pageno,.demo-tag,svg,.label').forEach(e => e.remove()); return c.textContent.trim().split(/\s+/).length; })));
await b.close();
