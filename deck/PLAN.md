# Spottr deck: PLAN (first draft)

Audience: YC reviewers (Winter 2027 deadline 2026-11-02, 8 pm PT; `06_funding.md §2.2`) and a16z partners. Raise: about $300k. Language: English. Binding inputs: `BRIEF.md`, `00_summary.md` (wins over single files), `qa_report.md`.

Source format below: `file §section`. Section numbers were checked against the real headings. `00_summary.md` is cited by its section numbers 1-4. `[A]` marks an assumption that must be labelled as such on the slide. Slide copy limit: 35 words per slide, headline included. Source labels, captions and the "Demo data" tag don't count.

---

## (a) Narrative arc

1. Gyms lose about a third of their members a year, and engaged members stay longer, but nobody sees what members actually do on the floor.
2. Strength training is booming, operators are healthy, and one AI call per set is now cheap enough to run on every set.
3. Spottr is built to turn a gym's existing cameras into an automatic workout log with no rule per exercise, and it blurs everyone except the lifter before anything leaves the building.
4. A working technical core exists (built in days, tested on recorded clips and a synthetic suite). It has not yet run on a live gym camera, and there are no pilots, LOIs or revenue.
5. $300k gets three full-time founders to real gym cameras and 5-15 pilots. These answer the three open questions: does it work live, will gyms pay, and does it move retention?

---

## (b) Slide outline (13 slides)

Global rules: 16:9, one idea per slide. Green `#34C759` appears at most once per slide. Every number gets `data-src` and a line in `CLAIMS.md`. Each source shown here must also appear in `CLAIMS.md` with status `verified` or `assumption`. Never show the crowd clip, any frame from `public/videosCorrect/crowd.mp4`, or the fake "29.8 FPS | RTSP ONVIF" label (`VideoOverlay.tsx:172`, a dead component).

### Slide 1. Title
- **Headline:** "Spottr turns the cameras a gym already has into an automatic workout log."
- **Support:** "Automatic workout tracking from existing gym cameras." / "Pre-seed, 2026" / `[TODO: presenter names, contact email, and which submission this is (YC W27 application vs a16z pitch)]`
- **Numbers:** none.
- **Visual:** Spottr logo (`public/welcome/spottr-logo-v2.svg`), large type, one thin green waveform line. No footage.
- **Placeholders:** `[TODO: confirm the a16z program the teammate is in (speedrun SR007/SR008 vs event pitch) and date — 06_funding.md §3.2]`. Keep this off the slide face if the deck stays generic, but note it in the slide notes.

### Slide 2. Problem
- **Headline:** "Gyms lose about a third of their members every year, and engaged members stay far longer."
- **Support (3 big numbers):** "66.4% average annual retention" / "Engaged members stay 23 months, others 16" / "Visits per member: 2.1 a week in 2019, 1.5 in 2024"
- **Numbers and sources:**
  - 66.4% retention (HFA 2025 Benchmarking, 175 operators, data year 2024): `02_problem_customer.md §1a`; also `00_summary.md §1.1`.
  - 23 vs 16 months (Les Mills, 2.6M member journeys, 2025-07-28): `02_problem_customer.md §1a`.
  - 2.1 to 1.5 visits/week: `03_market.md §1.2`.
- **Visual:** three large typographic numbers on white, hairline dividers, source line in small grey type ("HFA 2025; Les Mills 2025"). The 23-vs-16 pair carries the one green accent.
- **Placeholders:** `[TODO: one real quote or objection from a gym owner we spoke to — none documented; 02_problem_customer.md §6a]`.
- **Notes for the speaker (not on slide):** HFA 2026 reports a "decade-low churn" in 2025 (`02_problem_customer.md §1a`). So say "structurally high", never "crisis". Owners rank attracting members first (55.5%) and retention only 16.8% (Gymdesk 2024, skewed to small gyms). Do not use "50% quit in 6 months" (untraceable).

### Slide 3. Why now
- **Headline:** "Strength training is booming, gyms are healthy, and AI labelling now costs a fraction of a cent per set."
- **Support:** "81M US members in 2025, a record" / "Free weights: fastest-growing equipment category since 2021" / "Operators: median revenue +10.7%, EBITDA 22.1%" / "AI label per set: about $0.001-0.005 (estimate)"
- **Numbers and sources:**
  - 81M members (+5.2%): `03_market.md §1.2`.
  - Free weights fastest-growing since 2021: `03_market.md §4.5`.
  - Median revenue growth +10.7%, EBITDA 22.1% (2025, HFA Global Report 2026): `03_market.md §1.3`; also `§4.4`.
  - $0.0008 (3.1 Flash-Lite) to $0.0046 (3.6-3.8 Flash from 2027) per call: `03_market.md §4.2`. Tag **[A]**: token counts are not yet measured (`qa_report.md §5`). Show as "about $0.001-0.005 per set, estimate".
- **Visual:** the number "81M" huge, a thin growth line behind it, three small supporting stats beneath. No stock imagery.
- **Placeholders:** `[TODO: share of mid-tier gyms with IP cameras covering the weight floor and RTSP access — not found in any source (03_market.md §6 gap 4); add only after the first site visits]`.
- **Not used here:** "costs keep falling" or "hardware got cheaper" (both false in 2026; `03_market.md §4.1-4.2`).

### Slide 4. Solution
- **Headline:** "Spottr is built to log every set from a gym's existing cameras, with nothing for members to wear or type."
- **Support:** "Members: sets, reps, recovery map and replay, logged automatically." / "Gyms: floor usage and engagement view (simulated today)." / "The gym pays; members use it."
- **Numbers:** none.
- **Sources:** `context.md §What Spottr is`; `01_product.md §7`.
- **Visual:** two-column typographic layout, "For members" and "For gyms", with one small rounded card of the `/demo` Today tab on the left and `/gyms/overview` on the right, both captioned "Demo data".
- **Placeholders:** `[TODO: how a person on camera is linked to a member account (check-in, app QR, re-ID) — unresolved; 00_summary.md §4 Q10]`. Show this as a small bracketed line under the right column, not hidden.

### Slide 5. How it works
- **Headline:** "Pose tracking counts reps without a rule per exercise, and the cloud sees one blurred image per set."
- **Support (3-step strip):** "1 Pose and tracking" / "2 Rep counting from joint motion" / "3 One blurred snapshot labels the exercise (Gemini)". Footer: "Today: bystanders pixelated, faces blurred in snapshots. Target: processing on a Mac mini in the gym. Not deployed yet."
- **Numbers:** none needed. Optionally "26 exercises, 17 synthetic tests" is on slide 7.
- **Sources:** pipeline stages `01_product.md §2`; "label never changes the count" `01_product.md §3`; blur rules `01_product.md §2` (Privacy mechanisms); target architecture and gaps `01_product.md §4` and `src/gyms/pages/Privacy.tsx` ("In development" list).
- **Visual:** simple horizontal three-step diagram, with the real blurred 3-frame strip `docs/media/example-2-gemini-input.jpg` as the step-3 image (lifter face pixelated, bystanders blurred). Caption: "Real pipeline output". Inspect the image by eye before use.
- **Placeholders:** none. Privacy copy must follow the Privacy page's "Available today / In development" split exactly.
- **Banned phrasing:** "no biometrics", "compliant", "raw video never leaves the gym" as a present fact.

### Slide 6. Product
- **Headline:** "The replay already shows real pipeline output: skeleton overlay, rep counter and pixelated bystanders."
- **Support:** two captions only. Left: "Real: replay of recorded clips (squat x5, dips x10)". Right: "Simulated: operator dashboard and most member tabs".
- **Numbers and sources:** squat x5, dip x10: `01_product.md §3` (maturity) and `01_product.md §1`; real vs mock split: `01_product.md §4` (maturity table) and `00_summary.md §2` row 11.
- **Visual:** left, a screenshot of `/demo` Replay modal on the Squat or Dips clip, paused mid-rep, raw overlay mode, rep counter visible, bystanders pixelated. Right, a screenshot of `/gyms/overview` with the "Demo data" badge. Add the caption "Demo data" under the right card. A thin hairline joins both.
- **Visual risk:** the replay shows the lifter unblurred, and there is no consent record for the clip footage (`01_product.md §7`, media assets). Fallback if unresolved: crop the screenshot so the lifter's face is not visible, or show skeleton-only with the video layer off.
- **Placeholders:** `[TODO: confirm the lifters in squat.mp4 and dip.mp4 are team members or have consented before showing replay frames]`.
- **Do not show:** the crowd clip, the Request Pilot form as evidence, the Members "Send nudge" button as a feature.

### Slide 7. Where we are (traction, honest)
- **Headline:** "We built a working technical core in days; it has run on recorded clips and a test suite, not yet on a live gym camera."
- **Support (Built / Not yet):**
  - Built: "Pipeline built in a 3-hour hackathon sprint (2026-09-27)" / "17 of 17 synthetic tests pass" / "5 squats and 10 dips counted; 0 false sets on a crowd clip" / "13-14 fps, one stream" / "Gym outreach started".
  - Not yet: "Live cameras, pilots, LOIs, revenue."
- **Numbers and sources:**
  - 3-hour sprint, Berkeley x Google DeepMind Hackathon, 2026-09-27: `context.md §Stage and traction`.
  - 17/17: `01_product.md §1` (re-run 2026-10-05); also `qa_report.md §6` (repo checks).
  - 5 squats, 10 dips, 0 sets on crowd clip: `01_product.md §3` and `00_summary.md §1.3`. The ground truth for squat is stated by the team, not in the repo.
  - 13-14 fps (13.4 / 14.2 / 13.9): `01_product.md §3`.
  - "Outreach started", "positive conversations" (anecdotal): `context.md §Stage and traction`.
- **Visual:** two-column checklist, "Built" and "Not yet", plain type. "17/17" carries the green accent.
- **Placeholders:** `[TODO: number of gyms contacted, replies, and any camera setup seen — 00_summary.md §4 Q7-8]`; `[TODO: named VCs or ex-YC founders who gave positive feedback, only with their permission — 00_summary.md §4 Q6]`.
- **Do not claim:** "works", "accurate", "tested in gyms", "5/5 accuracy" as a benchmark (3 clips and 1 stated ground truth is not a benchmark), "27 people in frame" (the number counts track IDs, which include fragments; `01_product.md §6`), "21.8 fps", "16/16".

### Slide 8. Market (bottom-up, honest)
- **Headline:** "Our first wedge is about 6,400 US gyms, roughly $30M a year, before any expansion."
- **Support (funnel):** "55,281 US commercial clubs, 42,524 outside the top 10" / "About 6,400 camera-suitable mid-tier targets, about $30.5M ARR (assumptions)" / "California about $4.2M, Bay Area about $0.8M" / "Year-5 base case: about 116 gyms, about $0.56M ARR"
- **Numbers and sources:**
  - 55,281 clubs, top-10 12,757, 42,524 remainder: `03_market.md §1.4` and `§3.3` (Steps 1).
  - 6,379 gyms, $30.5M at $399/month: `03_market.md §3.3` (Step 5 and 6). Tag **[A]**: 30% target share, 50% camera suitability and $399 price are assumptions.
  - California 877 gyms, $4.2M; Bay Area 170 gyms, $0.81M: `03_market.md §3.3` (Step 5 and 6). Bay Area share is a population proxy **[A]**.
  - Year-5 base SOM 116 gyms, $0.56M: `03_market.md §3.4` **[A]**.
- **Visual:** simple descending funnel in type and thin horizontal bars. The label "Estimate; assumptions in notes" is visible. No TAM bubble. Do not show the top-down $244M illustration (`03_market.md §3.6`, not independent).
- **Placeholders:** `[TODO: venture-scale story beyond mid-tier gyms (chains, B2C freemium, other segments, equipment-utilisation data, international). Not sized in the research; founders to choose — 00_summary.md §4 Q14]`. Show this as a visible bracket line on the slide.
- **Notes:** the first segment is the one under structural pressure (K-shaped market; `03_market.md §5`). Do not claim a "$46B market" or use vendor report totals (`03_market.md §2`).

### Slide 9. Business model and unit economics
- **Headline:** "Gyms pay $299-499 a month per location with hardware included, which keeps a 44.6% gross margin in our central case."
- **Support:** "Break-even: keep 5.8-9.3 members a year (about 2.3 retention points at 400 members)" / "Per gym, one box: $399 revenue, $221 costs, $178 gross profit a month" / "Hardware $1,489 up front, carried by Spottr". Footer: "Illustrative. Pricing is unsettled; no customer has paid."
- **Numbers and sources:**
  - $299 / $499 tiers, blended $399, 12-month term: `05_business_model.md §3` **[A]** (hypothesis, not validated).
  - Break-even 5.8-9.3 members, 2.3 points: `05_business_model.md §3` (Break-even arithmetic). Retention effect unproven.
  - $221.0 COGS, $178.0 GP, 44.6%: `05_business_model.md §4.2` (Monthly cost of goods table, central: Flash 2027 price, 1 box) **[A]**.
  - $1,489 hardware per gym (one box): `05_business_model.md §2.4`.
  - 400-member ICP gym **[A]**: `05_business_model.md §3`.
- **Visual:** one clean line equation, "$399 - $221 = $178 a month", with 44.6% in green. Under it, a small hairline box: "Assumes 400-member gym, one Mac mini, Gemini Flash at the 2027 price."
- **Recommendation (flag for orchestrator):** add a footnote "two boxes per gym: 37%" (`05_business_model.md §4.2`, 37.4%). The brief says 44.6% central-case only, and the brief wins on the slide face. But the research itself says the typical gym likely needs two boxes (`05_business_model.md §2.4`), and an investor who does the math will find it. Put 37.4% in the speaker notes at minimum.
- **Placeholders:** `[TODO: confirm pricing model with founders — per-location tiers $299/$499, hardware included, 60-day pilot to LOI — 00_summary.md §4 Q15]`.
- **Do not use:** 61.7% (withdrawn), 64.9% as headline (needs Flash-Lite pinned in code), "4-6 cameras per Mac mini", LTV:CAC figures (every input is an assumption).

### Slide 10. Competition and white space
- **Headline:** "Incumbents auto-log only on their own machines, and members auto-log only by wearing something."
- **Support (2x2 positioning, names only):**
  - Their machines: EGYM, Technogym.
  - On the member: Motra, WHOOP, Apple Watch.
  - Typing: Hevy, Strong.
  - Own cameras: Exersight (early, Germany, 2025).
  - Operator analytics only: GroeFit.
  - Existing cameras, any equipment: Spottr (target, unproven).
- **Numbers and sources:**
  - EGYM inside a $7.5B combined group: `04_competition.md §2` (announced 2026-01-15, closed 2026-03-31).
  - Exersight installs its own cameras; one development gym; funding small: `04_competition.md §1` (A1).
  - GroeFit $129 / $389 / $999 per month: `04_competition.md §1` (A3). Verified on vendor page (`qa_report.md §3`, m5).
  - Wearables need a device on the member; manual apps need typing: `04_competition.md §4`; App Store reviews `02_problem_customer.md §6b`.
  - Matrix: `04_competition.md §6` and the "plausibly differentiated" list in `§8`.
- **Visual:** 2x2 in thin lines. X axis: "Needs new hardware" to "Uses what the gym has". Y axis: "Member-side" to "Gym-side". Names as small type dots. Spottr dot is green and labelled "target". No logos copied from competitor sites.
- **Placeholders:** none. If space allows add: `[TODO: add one line on why EGYM/ABC/Mindbody won't build this first — 04_competition.md §7 point 9 is [ANNAHME] only]`.
- **Notes:** say plainly that incumbents could add camera tracking in 2-4 years **[A]**, and that Catapult paid US$18M upfront (plus up to US$10M earn-out) for Perch in June 2025 (`04_competition.md §1` A2; primary release unverified, `00_summary.md §3.5`). A "Spotr" voice-logging app exists (`04_competition.md §4`): a name-confusion risk, flag to founders.
- **Banned:** "no competition", "first", "only" claims.

### Slide 11. Team
- **Headline:** "Three founders, all full-time, with business, entrepreneurship and robotics backgrounds."
- **Support (three cards):**
  - **Felix Müller-Gliemann.** BSc Business Administration (LMU Munich), exchange at UC Berkeley (Haas). Previously Founders Associate at an AI-native M&A/finance startup. Owns frontend, sales, fundraising, investor relations.
  - **Martin.** MSc Entrepreneurship. `[TODO: Martin's role and title — repo shows him as author of the vision backend; confirm — context.md §Team]`
  - **Gard.** MSc Robotics. Works on the vision pipeline per the team. `[TODO: Gard's role and what he has built — repo shows one commit; check gardlae/Berkeley-x-DeepMind — context.md §Team]`
- **Numbers:** none. Roles sourced from `context.md §Team (all three full-time)`; commit facts `01_product.md §8` (notes only, not on slide).
- **Visual:** three plain cards with name, school line, one role line. No photos until supplied. Open items are shown in brackets, not hidden.
- **Placeholders:** `[TODO: full names for Martin and Gard]`, `[TODO: CEO / CTO titles]`, `[TODO: US work/visa status for full-time work — 00_summary.md §4 Q5]`, `[TODO: incorporation plan and timing; not yet incorporated]`, `[TODO: advisors or references willing to be named — 00_summary.md §4 Q6]`, `[TODO: photos]`.
- **Do not state:** that Martin or Gard "owns" the pipeline, any title, or a "CTO". The split is open.

### Slide 12. Ask, use of funds, 12-month milestones
- **Headline:** "We are raising $300k so three founders can work full-time in the US and take Spottr onto real gym cameras."
- **Support:** "Use of funds: team runway, on-site hardware, pilot rollout, product development `[TODO: % split]`" / "Hardware for 5-15 pilots: about $7k-36k (estimate)" / "12 months: real-camera test and benchmark, 5-15 pilots `[TODO: dates]`" / "Next: seed round once pilots show retention impact"
- **Numbers and sources:**
  - $300k, use-of-funds categories: `context.md §Deck audience and goal`.
  - 5-15 pilots in year 1 **[A]**; SOM path needs a seed round after pilots: `03_market.md §3.4` (Funding implication).
  - Hardware $7k-36k is derived, not sourced: 5 x $1,489 = $7,445 and 15 x $2,388 = $35,820 (`05_business_model.md §2.4`). Label "estimate".
  - Milestone content (all plan, not fact): multi-stream benchmark 1/3/5 streams `05_business_model.md §6` (gap 2) and `00_summary.md §4 Q11`; pilot design (60 days, install ours, LOI on accuracy criterion, 50 hand-labelled sets) `05_business_model.md §5` **[A: design, not a benchmark]**; pin Flash-Lite, log `usage_metadata` `05_business_model.md §4.2` ("What to change in code").
- **Visual:** a thin 12-month horizontal timeline with four milestone dots: "Mac mini benchmark", "First real-camera install", "5-15 pilots", "Accuracy and retention read-out". Dates are `[TODO]`. The green accent is the "$300k".
- **Placeholders:** `[TODO: instrument and cap (SAFE? post-money cap?) — 06_funding.md §4.2-4.4]`, `[TODO: how $300k relates to YC's $500k / the a16z program (separate round, bridge, or the YC "what we need" figure) — 00_summary.md §4 Q1-2]`, `[TODO: use-of-funds percentages]`, `[TODO: milestone dates]`, `[TODO: incorporation timing]`.
- **Notes (not on slide):** $300k is small but typical (the $250-499k band has a median cap of about $12M, which would sell about 2.5%; `06_funding.md §4.2`, Carta primary page unverified). A low-cap SAFE before YC can reprice YC's MFN piece (`06_funding.md §4.4`). Do not name a valuation until founders decide.

### Slide 13. What we must prove
- **Headline:** "Three things stand between us and a business: it must work live, gyms must pay, and tracking must keep members."
- **Support (three columns):** "Works on real gym cameras: first test and benchmark in the first months." / "Gyms pay: 60-day pilot that converts to a paid LOI on an accuracy criterion." / "Retention: no evidence yet; pilots measure it." Footer: "Legal review of member linking and consent before any privacy claim."
- **Numbers and sources:** the three objections `00_summary.md §2` (rows 1-3); no retention evidence found `03_market.md §4.6` and `02_problem_customer.md §8`; pilot structure `05_business_model.md §5` **[A: design]**; legal `02_problem_customer.md §7` and `03_market.md §4.8`.
- **Visual:** three plain columns, thin dividers, one line each. No icons. The retention column carries the green accent (the central hypothesis).
- **Placeholders:** `[TODO: success thresholds the founders will commit to (accuracy %, active-member share, pilot-to-paid conversion) — 05_business_model.md §5 leaves "X" open]`.

---

## (c) The 5 weakest points an investor will attack

| # | Attack | Addressed on | How the deck answers |
|---|---|---|---|
| 1 | "Has this ever run on a real gym camera? Do the cameras even exist and point at the weights?" (`00_summary.md §2` rows 1, 6) | Slide 7 (says "not yet"), slide 12 (first milestone), slide 13 | Say it plainly, make the first 12-month milestone a real-camera test and multi-stream benchmark, and show the 50% camera-suitability factor in the SAM as an assumption. |
| 2 | "Do gyms want this and will they pay? Zero pilots, LOIs or owner quotes." (rows 2, 11, `02_problem_customer.md §6a`) | Slides 7, 9, 13 | Honest "Not yet" list, pricing marked unsettled, pilot design with a paid-LOI trigger; TODO for outreach numbers and one owner quote. |
| 3 | "Does tracking improve retention at all?" (row 3; no evidence found) | Slides 2, 9, 13 | Show the Les Mills engagement link as context, show break-even in members retained, and name retention as the hypothesis the pilots test. |
| 4 | "Isn't this tiny? Your segment is the one being squeezed." (rows 4, 5; `03_market.md §3.3`, `§5`) | Slide 8 (and 13 via the venture-scale TODO) | Show about $30M US SAM, about $0.8M Bay Area and year-5 base about $0.56M up front; show the venture-scale story as an explicit TODO instead of inventing a TAM. |
| 5 | "Thin margins, another hardware company, privacy and BIPA." (rows 7, 8, 9; `05_business_model.md §4.2`, `02_problem_customer.md §7`) | Slides 5, 9, 13 | 44.6% central case with one-box footnote, hardware carried by Spottr and shown as cost, privacy stated only as true today (target architecture labelled), legal review in the milestone list. |

Close runners-up (notes only): why EGYM/ABC/Mindbody won't build it (slide 10 notes; `00_summary.md §2` row 10); who built what in the team (slide 11 TODOs; row 12); how much of the demo is real (slide 6 captions; row 11).

---

## (d) Excluded / banned list

| Left out | Why |
|---|---|
| README numbers: 21.8 fps, 16/16 tests, "Raspberry Pi as edge box" | Wrong. Repo shows 13-14 fps and 17/17; plan is Mac mini (`00_summary.md §3.1`). |
| 61.7% gross margin; 64.9% as a headline | 61.7% withdrawn. 64.9% needs Flash-Lite pinned in code first. Only the 44.6% central case is shown (`05_business_model.md §4.2`). |
| "4-6 cameras per Mac mini" | Replaced by 2-3 (`05_business_model.md §2.2`). Two-box case lives in notes. |
| "No biometrics", "GDPR/BIPA/CCPA compliant", "raw video never leaves the gym" as present fact | Unverified legal status; on-site processing is the target, not deployed (`03_market.md §4.8`, `01_product.md §2`). The Privacy page's "No face recognition" (no face-ID code today) may be paraphrased as "no face-recognition code in the pipeline today", but not as a legal claim. |
| Pilots, LOIs, customers, revenue, "inbound requests" | None exist. The Request Pilot form doesn't submit (`01_product.md §4`). |
| "No competition", "first", "only" | Exersight, Perch, GroeFit, wearables and incumbents exist (`04_competition.md §7`, `§8`). |
| Crowd clip and any frame from it; fake FPS/RTSP label; identifiable members | No consent record (`01_product.md §7`); dead component draws a false label (`01_product.md §4`). |
| "27 people in frame", "5/5 accuracy" as a benchmark | The 27 counts track IDs with fragments; 5/5 rests on one stated manual count with no ground-truth file (`01_product.md §3`, `§6`). |
| Vendor TAM totals, the top-down $244M, "$46B market" | Low quality, not independent (`03_market.md §2`, `§3.6`). |
| "Costs keep falling" and cheaper-hardware "why now" | Hardware and Flash prices rose in 2026 (`03_market.md §4.1-4.2`). |
| Camera prevalence ("most gyms already have cameras") | No source; the key validation gap (`03_market.md §6` gap 4). |
| "50% of new members quit in 6 months", "59% stay longer when they track" | Untraceable vendor claims (`02_problem_customer.md §1a`, `§1b`). |
| Retention-improvement claims, LTV/LTV:CAC, CAC payback figures | No evidence; every input is an assumption (`05_business_model.md §4.2`). Payback range 8-27 months goes to notes only. |
| Valuation, cap, dilution, "pre-seed median" figures | Instrument undecided; Carta page unverified (`06_funding.md §4`). Notes only. |
| YC/a16z "fit" claims (RFS match, a16z thesis) | No RFS item mentions gyms; a16z fitness views unverified (`06_funding.md §2.3`, `§3.1`). |
| Perch/Catapult deal value on a slide | Primary release unverified (`00_summary.md §3.5`); notes only. |
| Funding rounds of Tonal/Peloton etc. | Context for the Q&A, not for the deck. |
| Individual roles/titles for Martin and Gard, CEO/CTO | Open (`context.md §Team`). |
| Live-recap and Today/Progress/Workouts numbers as evidence | Mock data; the deployed recap is a template (`01_product.md §2`, `§4`). |

---

## Open items the deck depends on (collected TODO placeholders)

Exact text to appear on slides:
1. `[TODO: presenter names, contact email, and which submission this is (YC W27 application vs a16z pitch)]` (S1)
2. `[TODO: one real quote or objection from a gym owner we spoke to]` (S2)
3. `[TODO: share of mid-tier gyms with IP cameras covering the weight floor and RTSP access]` (S3, notes)
4. `[TODO: how a person on camera is linked to a member account (check-in, app QR, re-ID)]` (S4)
5. `[TODO: confirm the lifters in squat.mp4 and dip.mp4 are team members or have consented before showing replay frames]` (S6)
6. `[TODO: number of gyms contacted, replies, and any camera setup seen]` and `[TODO: named VCs or ex-YC founders who gave positive feedback, only with permission]` (S7)
7. `[TODO: venture-scale story beyond mid-tier gyms]` (S8)
8. `[TODO: confirm pricing model with founders]` (S9)
9. `[TODO: Martin's role and title]`, `[TODO: Gard's role and what he has built]`, `[TODO: full names]`, `[TODO: CEO / CTO titles]`, `[TODO: US work/visa status]`, `[TODO: incorporation plan and timing]`, `[TODO: advisors or references]`, `[TODO: photos]` (S11)
10. `[TODO: instrument and cap]`, `[TODO: how $300k relates to YC's $500k / a16z program]`, `[TODO: use-of-funds percentages]`, `[TODO: milestone dates]` (S12)
11. `[TODO: success thresholds the founders will commit to]` (S13)
12. `[TODO: confirm which a16z program the teammate is in]` (S1 notes)

## Research contradictions found and how this plan resolves them

- **App route:** `01_product.md §7` says the member app lives at `/`; `CLAUDE.md` says `/demo` (old links forward). Plan uses `/demo`.
- **"5/5 squats" and "27 people":** `00_summary.md §1.3` states both as proof; `01_product.md §3` and `§6` say the ground truth is only stated and the 27 includes fragmented IDs. Plan says "5 squats and 10 dips counted" and drops the 27.
- **Camera count vs margin:** `05_business_model.md §2.4` says two boxes are the likely case, but the brief mandates 44.6% (one box, central). Plan shows 44.6% with a "one box" label and recommends a 37% two-box footnote.
- **Churn framing:** 66.4% retention (data 2024) vs HFA's "decade-low churn" for 2025 (`02_problem_customer.md §1a`). Plan says "structurally high" and avoids "crisis".
- **Owner pain:** retention is only 16.8% of owners' stated top concern (`02_problem_customer.md §1a`). Plan frames retention as a cost, not as the top pain.
- **Perch deal:** US$18M upfront vs $15M vs total up to $28M (`04_competition.md §1` A2). Plan keeps it in notes only.
- **Gemini cost:** model ambiguous (`gemini-flash-latest` default vs Flash-Lite used for demo data) and token counts unmeasured (`03_market.md §3.5`). Plan labels the per-set AI cost as an estimate and shows the central margin on Flash at the 2027 price.
- **Name clash:** a voice-first logging app called "Spotr" exists (`04_competition.md §4`). Flagged to founders; not on slides.
