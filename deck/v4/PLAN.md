# Spottr deck v4: slide map

V4 is a new deck built on v3 (`deck/v3/`, unchanged) and the team review of 2026-10-13. The research rules from `deck/benchmark/` still apply: every headline must be true without its footer, and every number needs a source in this file, `deck/CLAIMS.md` or the repo.

## 1. The headline ladder

Review: "use headers that are more pushy… the hype goes up all the time; no point where two sentences as a head make the hype go down." So every main headline is one caps statement in the display font (Inter Tight 800), each a step up from the last. Detail goes underneath, never into the headline.

| # | Slide | Headline | Why it is true |
|---|---|---|---|
| 1 | Title | Your gym's cameras, now your training log. | Slogan; what the product is designed to do |
| 2 | Problem | THE CAMERAS ARE ROLLING. NOBODY'S COUNTING. | No universal "every gym" (OC4) |
| 3 | Solution | MEMBERS GET EVERY SET LOGGED. GYMS SEE THEIR FLOOR, HOUR BY HOUR. | Kept from v3 (review liked it) |
| 4 | How it works | NOTHING TO WEAR. NOTHING TO TYPE. NO NEW CAMERAS. | Design of the product; status tag says today = recorded footage, box in development |
| 5 | Progress | 40% OF THE GYMS WE COLD-EMAILED WROTE BACK. | 8 of 20 replied (CLAIMS.md, founder-reported) |
| 6 | Why now | US GYMS JUST HAD THEIR BIGGEST YEAR EVER. | 81M members (all-time high) and 7B visits (above the 2019 peak), HFA, Apr 2026 |
| 7 | Competition | APPS NEED TYPING. MACHINES TRACK ONLY THEMSELVES. | Third sentence cut (review) |
| 8 | Market | A $3.8 BILLION MARKET. | ~210,000 facilities worldwide × $18K a year |
| 9 | Business model | $18K A YEAR PER GYM. 80%+ MARGIN. | Target price (untested) and derived 81–83% margin (cost lines assumed) |
| 10 | Team | FROM HACKATHON TO MULTI-CAMERA TRACKING IN 12 DAYS. | Git: hackathon 27 Sep, world service 9 Oct |
| 11 | Ask | $300K TO GO LIVE IN PAYING GYMS. | The raise and its goal |
| 12 | Closing | Your gym's cameras, now your training log. + QR | Repeat of the title (review) |

Order changed vs v3: Competition now comes before Market, so the deck ends on money (market → margin → team → ask) and keeps climbing.

## 2. Review feedback → what changed

| Review point | V4 |
|---|---|
| Title: too many images, no demo screenshots; logo or one clean image | Slogan + key info left; the dot-matrix logo from tryspottr.app large on a black panel right |
| Problem: catchphrase too wordy | "The cameras are rolling. Nobody's counting." (6 words, was 10) |
| Solution: demo pictures need replacing | Phone with the member app (dip clip, real pipeline output) in front of a browser window with the gym dashboard (demo data) |
| How it works: timeline, slogan and picture compete; stats incorrect | One idea: three big steps (cameras → box → app and dashboard). Floor map moved to the appendix. Status is one honest tag: still recorded footage (confirmed by Felix, 2026-10-14) |
| Progress: "Live demo / floor map" too specific | "Demo launched" and "Multi-camera tracking". Not "live stream coordination": nothing runs on a live stream yet |
| Why now: vision-model framing too niche | Health and gym boom: HFA 81M / 7B visits, Google Trends ("longevity", "strength training"), Rock Health wearables 46%. AI cost (Stanford AI Index) as a supporting line, no hardware named. The Gemini detail moved to appendix A3 |
| Market: scale up, step down, name the SOM | Worldwide $3.8B (TAM) → US $498M (SAM) → California $62M → Bay Area chains $1.9M (SOM) |
| Business model: plate pie chart, cost as a range by gym size | Barbell plate: 81–83% margin, 17–19% cost (one or two boxes). Cost lines in appendix A6 |
| Competition: bring back the v2 map, Spottr on top, keep the "why" | 2×2 map with a one-line reason under each player. VPixel stays in Spottr's quadrant (it also uses existing cameras; hiding it would be the OC3/OC5 mistake again) |
| Ask: fixed $300K; outreach, automation, Mac minis; first paying customer by end of next month | Use of funds in three cards. Timeline rebuilt around a first paying customer by end of November 2026 (Felix, 2026-10-14) |
| QR on a closing page that repeats the title | Slide 12 |
| Appendix intro: linked table of contents | Each entry links to its slide (in the browser and in the PDF) |
| Main slides should match the appendix quality | Same grid, pills, tags and cards on every slide |
| Team: real headshots | Photo slots load `assets/team/felix.jpg`, `martin.jpg`, `gard.jpg`; a placeholder shows until the file exists |

## 3. New numbers and their sources

| Number | Source | Status |
|---|---|---|
| 81M US members in 2025, all-time high, +5.2% | HFA, "2026 US Health & Fitness Consumer Report: Headline Trends", press release 2026-04-09 | verified |
| ~7 billion visits in 2025, above the 2019 peak | same | verified (HFA estimate) |
| 46% of US adults own a wearable (13% in 2015) | Rock Health, 2025 Consumer Adoption Survey, n = 8,000, published 2026-06-01 | verified |
| "longevity" search interest 2026 to date = 3.8× the 2022 average; "strength training" 3.2× | Google Trends, US, web search, weekly, fetched 2026-10-14 (`data/google-trends.json`) | derived from the export; Google changed collection on 2022-01-01, so 2022 is the base |
| AI at GPT-3.5 level got 280× cheaper (Nov 2022 → Oct 2024) | Stanford AI Index 2025 (language models) | verified via secondary coverage; check the report before sending |
| ~210,000 fitness facilities worldwide | IHRSA 2020 Global Report (2019 data): "nearly 210,000" | verified; latest published global total |
| $3.8B TAM | 210,000 × $18,000 | derived; price is the founders' untested target |
| $498M SAM | 55,281 US clubs (HFA) × 50% camera share × $18,000 | derived (CLAIMS.md) |
| California ~6,850 clubs, $62M | California's 2019 share of US clubs (5,123 of 41,370, Statista/IHRSA) × 55,281 × 50% × $18,000 | estimate |
| Bay Area chains $1.9M (SOM) | ~104 camera-suitable chain locations × $18,000 (v1 research) | assumption (CLAIMS.md) |
| Margin 81–83%, cost 17–19% | CLAIMS.md slide 9: 83.1% one box, 81.2% two boxes | derived; cost lines assumed |
| 40% reply rate | 8 of 20 (CLAIMS.md) | founder-reported |

## 4. Before sending

Everything in `deck/v3/PLAN.md` §7 still applies, plus:
- [ ] Headshots in `assets/team/` (felix.jpg, martin.jpg, gard.jpg, square, at least 600 px).
- [ ] Confirm the ask timeline after November (chain #1 fully live, 5–15 paying locations, seed round months) and the use-of-funds split.
- [ ] Check the Stanford AI Index figure in the report itself.
- [ ] Zero yellow chips in the render.
