# Spottr pitch deck v4

New deck built on v3 (`deck/v3/`, unchanged) and the team review of 2026-10-13. Every main headline is one caps statement, and each one climbs from the last. `PLAN.md` has the headline ladder, how each review point was handled, and a source for every new number.

- Open: `deck/v4/index.html` (arrow keys or click; the appendix contents page links to each appendix slide). `?cut=short` = 7-slide cut.
- One file to send: `deck/export/spottr-deck-v4.html` (`node bundle-v4.mjs`).
- PDFs: `cd deck/scripts && npm i && node export-pdf-v4.mjs` → `deck/export/spottr-deck-v4.pdf` (12 slides + appendix, 24 pages; appendix links work in the PDF) and `spottr-deck-v4-short.pdf` (7 pages).
- App screens: `node screens-v4.mjs` with `npm run dev` running (phone screens from `/demo?clip=dip&person=1`, dashboard from `/gyms/overview`).
- Google Trends data behind the Why now charts: `data/google-trends.json` (US, weekly, fetched 2026-10-14).

## Headshots

Put square photos (600 px or more) at `assets/team/felix.jpg`, `martin.jpg` and `gard.jpg`. The team slide shows them automatically; until then it shows a placeholder. Re-run the export and the bundle afterwards.

## Slides

Main: 1 Title · 2 Problem · 3 Solution · 4 How it works · 5 Progress · 6 Why now · 7 Competition · 8 Market · 9 Business model · 10 Team · 11 Ask · 12 Closing (QR). Appendix: A1 Privacy · A2 Technology · A3 Exercise labels · A4 What we have measured · A5 Multi-camera tracking · A6 Market math · A7 Unit economics · A8 Competitors · A9 Go-to-market · A10 Open questions · A11 Product.

## Before sending

`PLAN.md` §4 plus the open items from `deck/v3/PLAN.md` §7. Nothing goes out with a yellow `[TODO]` chip in the render.
