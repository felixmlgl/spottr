# Spottr deck v3: slide map

V3 is a new deck, built from v2 (`deck/v2/`, kept unchanged) and the benchmark in `deck/benchmark/`. Design follows the Smart Dumb-Phone (SDP) deck. Only the look comes from SDP; every fact comes from our own files.

Fix IDs (OC1, NS7, …) refer to `deck/benchmark/FIXES.md`. Rule IDs (R##) refer to `deck/benchmark/01_yc_guidance.md`. Every number must be in `deck/CLAIMS.md` or traceable to the repo.

## 1. What changed vs v2, in one paragraph

From 15 + 8 pages down to 11 main slides + appendix, plus a 7-slide cut for speedrun and cold sends (NS1, YA1). Each headline is a takeaway and stays true without its footer (R26, OC8). Status shows as visible tags ("Real pipeline output", "Demo data", "Building", "Hypothesis", "Plan"), and footers keep only citations. Traction uses only what CLAIMS.md backs (OC1). "First", "neither", "end to end", "CAC ≈ $0", "defensible", the unattributed quote and the anonymous fund-partner footer are all gone (OC2–OC12, HC6). The market leads with the bottom-up US chain number (NU1). The price is labelled as a hypothesis (NU2), with break-even math (NU3) and illustrative unit economics (NU4). VPixel and Exersight are named (HC4). The ask has an amount, 12 months and dated milestones (NS7). The replay frame is re-rendered at the end of the set, with the full count visible (DE2), and a product image is on the title slide (DE7). Placeholders the team must fill stay visible as yellow `[TODO]` chips; the pre-send checklist (section 5) must be empty before anything goes out.

## 2. Design system (from the SDP deck)

| Element | SDP | Spottr v3 |
|---|---|---|
| Backgrounds | Warm cream, white, pure black, alternating | Same: cream `#F0ECE1`, white, black `#000` |
| Headlines | Huge condensed grotesk in caps on statement slides; sentence-case grotesk under a pill elsewhere | Inter Tight 800 in caps for statements (title, problem, progress, ask); Space Grotesk sentence headlines under a topic pill on content slides |
| Topic label | Rounded cream/white pill ("Product summary", "The Solution") | Same pill, topic only; the takeaway is the headline next to it |
| Top bar | "SDP-001" left, section name right | "Spottr · Pre-seed" left, section + page number right |
| Cards | White card, thin black border, offset cream card behind | Same; used for visuals, competitors, team, QR |
| Name tags | Black pill, white text | Same: competitor and founder names |
| Imagery | Product photo collages, soft shadows | Real replay frames, blurred AI snapshots, app and dashboard screens, each with a status tag |
| Market | Concentric TAM/SAM/SOM circles | Concentric circles in the Spottr green ramp |
| Business model | Stacked unit-price bar with callout lines | Same: target price split into cost lines and gross margin |
| Timeline | Pills on a line, ticks with labels above/below | Progress dates and ask milestones |
| Closing | QR card | QR to tryspottr.app/demo on the ask slide |
| Accent | Lime (one chart), else black/white | Spottr green `#34C759`, one use per slide |

What we don't copy from SDP: a "TRACTION SO FAR" divider followed by personas instead of traction, topic-only headlines, the three full-year cash-flow tables.

Copy budget: ≤ 35 core words per main slide (headline + body, without tags, footers, TODO chips), most under 25 (R84, DE1).

## 3. Main deck (11 slides)

Order: Title → Problem → Solution → How it works → Progress → Why now → Market → Business model → Competition → Team → Ask. This is the FIXES §3 skeleton with its fallback: while the chain status (OC1) is unconfirmed in writing, progress sits after How it works. Once OC1 is confirmed, swap slides 4 and 5 (R31, NS2).

### 1 · Title (cream)
- **Big:** Spottr wordmark.
- **One-liner (NS3, R17, R20):** "Spottr turns the cameras a gym already has into automatic workout logs for members and floor data for the gym."
- **Small:** three founders · info@tryspottr.app · pill "Live demo: tryspottr.app/demo" (YA3). Date "October 2026".
- **Visual (DE7):** 2×2 collage, right half, like SDP's cover: re-rendered dip frame at the end of the set ("Dip · 10 reps", real pipeline output), squat frame ("Squat · 5 reps", real), member body map (demo data), floor zones (demo data). Every tile carries its tag.
- **TODO:** full names of Martin and Gard.

### 2 · Problem (black)
- **Headline, giant caps (OC4):** "Gym cameras already film the floor. Nobody counts the reps."
- **Two short facts:** Members: "Nobody types between sets." [tag: founder observation] · Gyms: "No data on how the floor is used, and a third of members leave each year." (66.4% retention, HFA 2025 Benchmarking, data year 2024; NU9)
- **TODO (HC1):** one verbatim, approved operator quote.
- **Footer:** HFA source; member side = founder observations.

### 3 · Solution (white)
- **Pill:** "Solution · the gym pays, members use it"
- **Headline:** "Members get every set logged. Gyms see their floor, hour by hour."
- **Visual:** large end-of-set replay frame (real pipeline output, DE2) + member app card (demo data) + floor heat map at 6pm (demo data).
- **Privacy line (NS10):** "Body pose, not faces. Detected bystanders are pixelated in the replay."
- **Footer:** recorded clips, consent confirmed (CLAIMS slide 6); gym dashboards simulated today.

### 4 · How it works (cream)
- **Pill:** "How it works"
- **Headline (OC8):** "Designed to plug in: one box and the cameras a gym already has."
- **Flow (SDP timeline pills), each with a status tag (OC8, OC9):** Gym cameras [designed for; tested on recorded clips] → Spottr box [Building] → Pose counts reps, no rule per exercise [Built; tested on squats and dips] → One blurred snapshot names the lift [Built] → App + gym dashboard [Built; gym side demo data].
- **Visual (OC15, DE5):** the real two-camera floor map, tag "Real output: two recorded phone cameras, one shared map (test room, not a gym)".
- **Footer:** live camera ingestion and the box are in development; today's pipeline runs on recorded footage.

### 5 · Progress (black)
- **Pill:** "Progress"
- **Headline, giant caps (OC1 variant b):** "8 of 20 gyms replied. One chain is in pilot talks."
- **Funnel:** 20 emailed → 8 replied → 1 multi-location SF chain in pilot talks (location GM positive, corporate sign-off pending). Tag: founder-reported.
- **Dated timeline (HC3, R52; dates from git history):** 27 Sep: hackathon, reps counted from pose · 28 Sep–6 Oct: app and gym demo live · 9 Oct: two cameras, one map · so far: 20 gyms emailed.
- **TODO (OC1):** if a signed pilot, LOI or corporate email exists: headline becomes "An [N]-location San Francisco chain starts a pilot with us on [date]." and the chain's logo goes here (with permission). Then move this slide to position 4.

### 6 · Why now (white)
- **Pill:** "Why now"
- **Headline (NS5, NS6):** "A vision model now names the exercise from one blurred image per set."
- **Visual:** two real inputs and outputs: blurred squat composite → "squat · smith machine", blurred dip composite → "dip · bodyweight" (session.json, Gemini Flash-Lite, confidence 0.95).
- **Line:** "So one pipeline covers every lift. No rule written per exercise." Tag: tested on squats and dips.
- **Footer:** est. $0.001–0.005 per set at list prices, token counts not yet measured (NU7); 13–14 fps team-stated, not a benchmark. No "first", no "cheap" (OC3, NS5).

### 7 · Market (white)
- **Pill:** "Market"
- **Headline (NU1, R58, R60):** "US gym chains alone: about $70M a year at our target price."
- **Visual (SDP circles):** outer "All US clubs · 55,281 · $498M"; middle "US chains · 7,825 locations · $70M"; inner "Start: Bay Area chains" (no number, NU8).
- **Tags:** "Camera share 50%, assumed (30–70%: $42–99M)" · "Price $18K/location/year, hypothesis".
- **No global ring** until the global gym count has a source (NU1). No adjacent-market valuations (NS4).

### 8 · Business model (cream)
- **Pill:** "Business model"
- **Headline:** "Gyms pay per location. Members use it free."
- **Visual (SDP stacked bar, NU4):** target price $1,500 per location per month [Hypothesis, NU2] split into ~$1,247 gross margin (83%) and ~$253 cost to serve (17%; the cost lines are in A4). Tag: "Illustrative: price untested, costs assumed".
- **Break-even (NU3):** "Pays for itself if a location keeps [N] members it would have lost." TODO: dues from the chain or a public price list.
- **Members (OC7):** "Free logging. Paid AI coach later." [Hypothesis]

### 9 · Competition (cream)
- **Pill:** "Competition"
- **Headline (OC3, OC5, HC4):** "Apps need typing. Machines track only themselves. Camera tracking has no proven leader yet."
- **SDP staggered cards, black name pills (R68, DE6):** Logging apps (Hevy, Gravit): "Members type every set." · Smart machines (EGYM, Technogym): "Track only their own machines." · Camera trackers (VPixel, Exersight): "VPixel: existing cameras since 2019, no named gyms. Exersight: its own cameras." · Spottr (green): "Existing cameras + one box. Sets and reps for members, floor data for the gym."
- **TODO (HC4):** our verified difference vs VPixel; confirm Exersight is the "German startup".

### 10 · Team (black)
- **Pill:** "Team"
- **Headline (HC2, OC11):** "Three full-time co-founders who built the product themselves."
- **Visual:** group photo in a camera-feed frame (placeholder until the real photo exists).
- **Cards (black name pills):** Felix Müller-Gliemann: business (LMU Munich, exchange at UC Berkeley Haas), ex-Founders Associate at an AI-native M&A startup; built the two-camera floor map. Martin [surname]: MSc Entrepreneurship; built the vision pipeline and member app. Gard [surname]: MSc Robotics; [what Gard built]. Who built what is from git history.
- **TODO:** surnames, final titles (CEO/CTO/CPO), institutions, how long the founders have known each other, Gal, LinkedIn links (YA2).

### 11 · Ask (cream)
- **Pill:** "The ask"
- **Headline, caps (NS7, R76):** "$300K pre-seed for 12 months."
- **Sub:** "To go live on real gym cameras, run 5–15 pilot locations and convert the first to paid."
- **Timeline (SDP pills), tag "Plan, not commitments":** Oct 2026 close → Jan 2027 multi-camera benchmark on the box → Apr 2027 first live install → Jul 2027 5–15 pilots → Oct 2027 accuracy and retention read-out, first paid LOI → seed round. (v1 plan months, CLAIMS slide 12.)
- **Use:** founder runway · pilot hardware (about $7–36K for 5–15 pilots) · product.
- **QR card (YA3):** tryspottr.app/demo + info@tryspottr.app.
- **TODO:** confirm months (the meeting notes say the chain onboards from 1 Nov); use-of-funds split; instrument and cap; program-specific asks.

## 4. Appendix (black divider "Appendix", no table of contents, NS9)

| # | Headline (takeaway, HC5) | Content |
|---|---|---|
| A1 | We track body pose, not faces. Here is what the build does today. | v2 A1, with OC13's recap wording ("Recaps generated from text, never video") |
| A2 | From camera stream to logged set, with no per-exercise rules. | Pipeline with Built/Building tags. "Tested on" (recorded gym clips; two phones in a lounge) split from "Designed for" (gym IP cameras, on-site box) (OC15) |
| A3 | What we have measured so far, and what we haven't. | Floor map IDF1 0.949, 0 false merges, recall 0.70, 21% needs confirmation, 11 ID switches (held-out 60 s, 10 people, lounge, phones, single reviewer); rep counts on 3 clips; synthetic tests; open: rep-count eval (NU6) |
| A4 | Locations × camera share × price. Price and camera share are assumptions. | Market table without the global row (OC10, NU1); cost lines behind the 83% (NU4); price comparators (Mindbody $79, Glofox, Flock, Density) (NU2) |
| A5 | Automatic trackers bring their own hardware or show no named gyms. Spottr is designed for the cameras a gym already owns. | Competitor table incl. VPixel, Exersight, GroeFit, Whoop (HC4, HC5) |
| A6 | Chains first: one contract, many locations. | GTM ladder, chain status as in CLAIMS (OC1) |
| A7 | Three things to prove next: it works live, a chain pays, members stay. | v1's "must prove" + identity linking options + roadmap |
| A8 | The product today, in demo data. | Gallery (v2 A7), live links |

## 5. 7-slide cut (`?cut=short`, own PDF)

Title · Problem · Solution · Progress · Market + business model (one combined slide) · Team · Ask. For speedrun (≤ 7 slides, traction first, R03, R106) and cold sends. Shared slides are the same HTML sections as the main deck.

## 6. YC two-sentence description (email test, R20; YA1)

"Spottr turns the cameras a gym already has into automatic workout logs: members get every set and rep recorded without typing, and the gym sees how its floor is used. The gym pays per location; members use it free."

## 7. Pre-send checklist (all from FIXES §4)

- [ ] Chain: real location count, written status (pilot agreement, LOI or corporate email), paid or unpaid, start date; permission to name it (OC1). Then flip slide 5 to variant (a) and move it to position 4.
- [ ] Team: surnames, titles, institutions, who built what, how long known, photo, LinkedIn; Gal (HC2, OC11, YA2).
- [ ] One verbatim, approved operator quote (HC1).
- [ ] Dues and member count for break-even (NU3); the chain's reaction to $1,500 (NU2).
- [ ] Our verified difference vs VPixel; Exersight confirmed (HC4).
- [ ] Milestone months, use-of-funds split, instrument and cap (NS7).
- [ ] Howard's quote: named and approved, or dropped (HC6). Not on the progress slide in place of customer evidence.
- [ ] Measured Gemini cost per set (NU7); rep-count eval (NU6).
- [ ] CLAIMS.md updated to v3 slide numbers (OC14).
- [ ] Zero yellow chips left in the render.
