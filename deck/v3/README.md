# Spottr pitch deck v3

A new deck, not an edit of v2 (`deck/v2/` is unchanged). Content: v2 + `deck/CLAIMS.md`, corrected with every fix in `deck/benchmark/FIXES.md`. Design: the Smart Dumb-Phone deck (cream / white / black slides, caps statements, topic pills, bordered cards, pill timelines, concentric market circles, unit-price bar, QR close). The slide map with fix IDs is in `PLAN.md`.

- Open: `deck/v3/index.html` (arrow keys or click). `index.html?cut=short` is the 7-slide cut for speedrun and cold sends.
- Export: `cd deck/scripts && npm i && node export-pdf-v3.mjs` → `deck/export/spottr-deck-v3.pdf` (11 slides + appendix, 20 pages), `deck/export/spottr-deck-v3-short.pdf` (7 pages), PNGs in `deck/qa/render-v3/` and `deck/qa/render-v3-short/`.
- Word counts: `node wordcount-v3.mjs`.
- Assets (`assets/`): `replay-dip-end.png` from `node replay-frames-v3.mjs` (recorded dip clip at the end of the set, pipeline keypoints and count, background people pixelated); `qr-demo.svg` from `node qr-v3.mjs`; the two blurred snapshots are the pipeline's own files from `public/demo-data/*/snapshots/`; `member-bodymap.png` and `floor-zones.png` are crops of the v2 screenshots in `deck/site/assets/`.

## Slides

Main: 1 Title · 2 Problem · 3 Solution · 4 How it works · 5 Progress · 6 Why now · 7 Market · 8 Business model · 9 Competition · 10 Team · 11 Ask. Appendix: A1 Privacy · A2 Technology · A3 What we have measured · A4 Market and unit economics · A5 Competitors · A6 Go-to-market · A7 Open questions · A8 Product.

Short cut: Title · Problem · Solution · Progress · Market and model (only in this cut) · Team · Ask.

Core words per main slide (headline + body, without tags, footers, TODO chips and diagram labels): median 32, range 27–47 (v2: median about 56, up to 93). Slides 4, 5, 8, 9 and 10 are still above the 35-word target.

## Status tags

`Real pipeline output` / `Built` (green dot) · `Demo data` (grey) · `Building` (ring) · `Hypothesis` / `Assumed` / `Plan` (amber) · `Founder-reported` (black). Footers carry citations only; anything a reader needs to judge a claim is in a tag.

## Before sending

Yellow `[TODO]` chips mark what only the team can fill. The checklist is `PLAN.md` §7; nothing goes out with a chip left in the render. The biggest one: slide 5 uses the wording CLAIMS.md backs ("one chain is in pilot talks"). With a signed pilot, LOI or corporate email, switch it to the chain's real location count and start date, and move it to position 4.
