// Words per v4 slide. "all" = headline + body + diagram labels, without the top bar, topic pills, status tags,
// TODO chips, source footers and column labels. "core" also drops diagram labels (timeline pills, circle and
// bar labels, name pills, heat map), like the axis labels the v2 benchmark left out.
import { chromium } from 'playwright';
const SKIP = '.meta,.pill,.tag,.todo,.todos,.src,.col-h,.when,.kicker,script';
const LABELS = ',.tl .p,.circles,.ubar,.name,.heat,.callout .v,.map .ax,svg,.stepbar .lvl,.browser,.phone';
const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage();
for (const q of ['', '?cut=short']) {
  await p.goto('file://' + new URL('../v4/index.html', import.meta.url).pathname + q);
  const r = await p.evaluate(([skip, labels]) => [...document.querySelectorAll('.slide:not(.out)')].map((s) => {
    const count = (sel) => {
      const c = s.cloneNode(true);
      c.querySelectorAll(sel).forEach((e) => e.remove());
      return c.textContent.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}$]/u.test(w)).length;
    };
    return [s.getAttribute('data-a') ?? '', s.getAttribute('data-section'), count(skip + labels), count(skip)];
  }), [SKIP, LABELS]);
  console.log(q || 'main', '(core / all)');
  r.forEach(([a, n, core, all], i) => console.log(' ', a || i + 1, n, core, '/', all));
}
await b.close();
