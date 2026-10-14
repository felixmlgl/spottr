# 00 · Inventory of Spottr deck v2

Source: `deck/v2/index.html` (copy), `deck/qa/render-v2/slide-NN.png` (visuals), in the worktree `.claude/worktrees/pitch-deck-v2-224a3a` (branch `claude/pitch-deck-v2-224a3a`). Copy below is verbatim from the HTML. 15 main slides + 1 appendix divider + 7 appendix slides = 23 pages in the PDF.

**Word count** = two numbers. *Core* = headline, subtitle, body and stats, excluding the small kicker label above the headline, source footers, TODO chips, "Demo data" tags, axis labels and status pills. *All* = everything visible on the slide except the page number and the "Spottr" brand mark. Counted with a script on the HTML; nested elements make it approximate (±5). For reference, the v1 plan (`deck/PLAN.md`) set a 35-word limit per slide, headline included.

**Visual style (all slides):** 1920×1080, off-white background (slide 2 is dark), Inter-style sans serif, black headline at ~64px, grey body copy, one green `#34C759` accent per slide, small uppercase grey kicker label above every headline, grey source footer at the bottom. Yellow dashed TODO chips are visible in the render on slides 1, 9, 10, 12, 13, 14, A1, A5 (and `$TBD` chips on 11; A3 has "to source" / "Open" status pills instead).

---

## Main deck

### 1 · Title
- **Kicker:** none. Wordmark "spottr" (serif, black).
- **Headline (h1):** "Automatic workout tracking from existing gym cameras."
- **Body:** "Felix Müller-Gliemann, Martin, Gard · Co-founders" / "info@tryspottr.app · tryspottr.app"
- **TODO chip:** "[TODO: full names of Martin and Gard]"
- **Numbers:** none. No round, stage, date or "pre-seed" marker.
- **Visual:** wordmark, very large two-line headline, faint green blob bottom right.
- **Words:** core 16 / all 23
- **Job:** say what Spottr is in one sentence and who is presenting.

### 2 · Hook
- **Kicker:** none (dark slide).
- **Headline:** "Every gym already films every workout." + (grey) "Not a single rep gets counted."
- **Body / numbers / source:** none.
- **Visual:** white and grey type on near-black, nothing else.
- **Words:** 12 / 12
- **Job:** make the insight stick: the cameras are already there, the data is wasted.

### 3 · Product summary
- **Kicker:** "Spottr in one line"
- **Headline:** "Your gym's cameras, now your training log."
- **Subtitle:** "Spottr turns the cameras a gym already has into automatic workout tracking. Members get every set and rep logged without lifting a finger. Gyms finally see how their floor is used."
- **Pills:** "Nothing to wear" · "Nothing to type" · "No new cameras"
- **Numbers:** none. **Visual:** type only, three pill chips, green blob. No product image.
- **Words:** 50 / 54
- **Job:** the product in one line plus the two-sided value.

### 4 · Opportunity
- **Kicker:** "Opportunity"
- **Headline:** "Fitness is at a record high, and people pay to track their training."
- **Stats:** "81M" — "US gym members in 2025, a record (+5.2%)"; "$1.1B" — "Whoop bookings run rate, +103% in 2025, 2.5M+ members"; "€1.02B" — "Technogym revenue 2025, +13%"
- **Body:** "Longevity made strength training mainstream. The tools to track it are still built for enthusiasts: wearables, apps, manual logs."
- **Source footer:** "HFA US membership release (Apr 2026). Whoop Series G announcement (Mar 2026): $575M at $10.1B valuation; bookings figure is company-reported. Technogym FY2025 results (19 Mar 2026), IFRS."
- **Visual:** three big numbers in columns, green underline under 81M, lower half of slide empty.
- **Words:** 56 / 84
- **Job:** show demand: lots of gym-goers, and people already pay to track training.

### 5 · Problem
- **Kicker:** "Problem · two sides, one blind spot"
- **Headline:** "Members won't log their workouts. Gyms can't see their floor."
- **Left card — "Members" / "Tracking is tedious.":** "Nobody wants a notebook or notes app between sets" · "Logging breaks the flow of every workout" · "Wearables track strain, not sets and reps"
- **Right card — "Gyms" / "They're flying blind.":** "No granular data on how the floor is used" · "Zones, peak times, popular equipment: all guesswork" · "Members drift away unseen: average retention is 66.4%"
- **Source footer:** "Retention: HFA 2025 Benchmarking (175 operators, data year 2024). Member-side points are founder observations, not a survey."
- **Numbers:** 66.4% (only number on the slide, inside a bullet).
- **Visual:** two white cards with bullets; bottom third empty.
- **Words:** 65 / 89
- **Job:** establish a painful two-sided problem.

### 6 · Why now
- **Kicker:** "Why now"
- **Headline:** "Computer vision just became cheap enough to watch every set."
- **2×2 points:**
  - "Vision at scale is newly affordable" — "Lightweight models like Gemini Flash label a set for a fraction of a cent (est. $0.001–0.005)."
  - "We're first to use it" — "The technology exists today, and the cost per capability keeps falling."
  - "Longevity is exploding, but complicated" — "Spottr makes training data effortless: walk in, train, it's logged."
  - "AI as a service, end to end" — "Fully autonomous. No user input, no gym staff, no setup per exercise."
- **Quote line:** "In 10–15 years, this will be the norm in every gym." (in quotation marks, no attribution)
- **Source footer:** "Per-set cost is our estimate from list prices (token counts not yet measured). Cost per fixed AI capability falls ~10x a year (a16z "LLMflation", language models); Gemini Flash list prices step up on 2027-01-01, so our own cost line is not guaranteed to fall."
- **Visual:** text-only 2×2 grid, quote in large type, bottom third empty.
- **Words:** 93 / 139 (densest main slide)
- **Job:** explain why this is possible now and not five years ago.

### 7 · Solution
- **Kicker:** "Solution · the gym pays, members use it"
- **Headline:** "Members get every set logged. Gyms get their floor, hour by hour."
- **Left column — "For members: every rep, counted":** three replay frames of one squat with green skeleton overlay. Tag: "Real pipeline output". Visible in the render: the overlay label at top left of frame 1 reads "#2 squat x0" (counter shows 0), and the frames are low-resolution.
- **Right column — "For gyms: floor heat map":** 5 green zone tiles (Squat racks 100%, Machines 68%, Cardio 43%, Benches 56%, Dumbbells 56% at 6pm), time slider, "quiet → full" legend. Tag: "Demo data". Animates 6am→close in the browser; PDF shows 6pm.
- **Source footer:** "Left: recorded squat clip, 5 reps counted, cropped to the lifter (consent confirmed). Right: Monday occupancy of the simulated demo gym (/gyms), animated 6am to close. Gym dashboards are simulated today."
- **Words:** 25 / 69
- **Job:** show the product for both sides.

### 8 · How it works
- **Kicker:** "How it works · no gym IT project"
- **Headline:** "Plug in one box. Use the cameras already on the walls."
- **Steps:** "1 We plug in our box" — "A small Spottr computer joins the gym's network. We install it." / "2 It connects to existing cameras" — "No new cameras, no wiring, no work for the gym's IT." / "3 Data flows automatically" — "Members see workouts in the app. The gym sees its dashboard."
- **Visual:** screenshot of the two-camera world map (room outline, two camera fields of view, dots "Person 05", "Person 42", "Person 119", ghost "Person 131"). Tag: "Real output: two cameras, one floor map".
- **Source footer:** "Right: world-service output from two recorded cameras in one room, each person kept as one anonymous identity across both views. The edge box and live camera ingestion are in development; today's pipeline runs on recorded footage."
- **Words:** 60 / 111
- **Job:** remove the "install is hard" objection.

### 9 · Traction
- **Kicker:** "Traction"
- **Headline:** "In our first week of outreach, a San Francisco gym chain signed on."
- **Big number:** "8" — "gyms onboarding from **November 1**, a 9th opening soon"
- **Timeline:** "Start — Met at a Berkeley hackathon" → "Build — Built the product end to end" → "Week 1 of outreach — SF chain onboarding all locations" → "Now — Outreach ongoing. Operators reach out to us to connect and help."
- **TODO chips:** "[TODO: chain name or logo, if the chain agrees]", "[TODO: investor quote from Howard (partner, Series A–C fund), once Howard approves]"
- **Source footer:** "Founder-reported. Onboarding starts 1 Nov 2026 across the chain's 8 locations; the 9th is the chain's own expansion."
- **Numbers:** 8 gyms, Nov 1, 9th. No dates for start/build, no users, no revenue, no pilot terms.
- **Words:** 58 / 98
- **Job:** prove someone wants it.

### 10 · Market size
- **Kicker:** "Market size"
- **Headline:** "A $2.2B market, even if only half of all gyms have cameras."
- **Ladder:** "$1.9M — Bay Area — where our traction is: chains, camera-suitable"; "$498M — United States — 55,281 clubs × 50% × $18K/yr"; "$2.2B — Global TAM — gyms worldwide × 50% × $18K/yr"
- **Adjacent markets:** "Whoop $10.1B valuation — wearable, Series G, Mar 2026"; "Technogym €1.02B revenue — connected equipment, FY2025"; "EGYM $1.2B+ valuation — smart machines, Series G, Sep 2024"
- **Tag:** "$1,500 per location per month · only 50% of gyms assumed to have usable cameras"
- **TODO chip:** "[TODO: source the global gym count; $2.2B at 50% implies ~245K gyms worldwide]"
- **Source footer:** "US clubs: HFA. Bay Area: ~104 camera-suitable chain locations (v1 research, assumed). The 50% camera share is a deliberately conservative assumption, not measured. Bar heights not to scale. Derivation in appendix A3."
- **Visual:** three bars (not to scale), adjacent-market list on the right.
- **Words:** 79 / 126
- **Job:** show the market is big enough for a venture outcome.
- **Arithmetic check:** 55,281 × 0.5 × $18,000 = $497.5M ✓. 104 × $18,000 = $1.87M ✓. $2.2B ÷ (0.5 × $18,000) = 244K gyms (unsourced). US chain SAM ($70M) appears only in A3, not on this slide.

### 11 · Business model
- **Kicker:** "Business model · two revenue streams"
- **Headline:** "Gyms subscribe per location. Members start free and upgrade."
- **Left card — "Gyms · B2B subscription" / "Fixed monthly fee per location, tiered by size":** tiers "Small <3K visits/mo $TBD", "Medium 3–5K visits/mo $TBD", "Large 5K+ visits/mo $TBD"; "Average target **~$1,500 per location per month**, hardware included."
- **Right card — "Members · freemium" / "Free automatic logging, paid AI coaching":** "Free: every set and rep, logged" · "Premium: AI personal trainer built on your own workout history" · "Next: PRs and social, leaderboards, rewards"
- **Callouts:** "CAC ≈ $0 — The gym is our member acquisition channel." / "Defensible — No one else holds this depth of personal exercise data."
- **Source footer:** "Model sense-checked with a partner at a Series A–C fund. Tier boundaries and prices are placeholders until validated against gym size data; no customer has paid yet."
- **Numbers:** ~$1,500/location/month; tier prices TBD; no margin (v1's 83.1% gross margin is gone), no premium price.
- **Words:** 92 / 128
- **Job:** show how Spottr makes money.

### 12 · Competition
- **Kicker:** "Competition"
- **Headline:** "Everyone else needs new hardware or manual input. We need neither."
- **2×2:** y-axis "Manual · Automatic", x-axis "Own hardware / wearable" → "Existing infrastructure". Top-left: "EGYM, Technogym", "German camera-hardware startup"; mid-left: "Whoop"; bottom-right: "Hevy, Gravit"; top-right: "Spottr" (green).
- **Right list:** "Machine-based — EGYM, Technogym: tracking only on their own machines"; "Wearable — Whoop: on the wrist, a different market"; "Manual apps — Hevy, Gravit: type every set by hand"; "Direct — One German startup, own camera hardware: hard to scale"
- **TODO chip:** "[TODO: name the German competitor]"
- **Source footer:** "Positions are our reading, not measured. Details in appendix A4."
- **Words:** 56 / 81
- **Job:** show Spottr is differentiated.

### 13 · Team
- **Kicker:** "Team"
- **Headline:** "Three full-time co-founders from Berkeley: business, venture building and robotics."
- **People:** "Felix Müller-Gliemann — Co-founder — Business, LMU Munich and Berkeley. Previously Founders Associate at an AI-native M&A startup." / "Martin — Co-founder — MSc Entrepreneurship" / "Gard — Co-founder — MSc Robotics"
- **Visual:** large yellow placeholder box "[TODO: real group photo of the team, not separate LinkedIn headshots]".
- **TODO chip:** "[TODO: full names; final titles (CEO/CTO/CPO) once aligned with Gal; add Gal if Gal joins]"
- **Words:** 46 / 62
- **Job:** show this team can build and sell it.

### 14 · The ask
- **Kicker:** "The ask"
- **Headline:** "What we need from [Program] to go from one chain to the US." ([Program] is a yellow placeholder chip)
- **Columns:** "Connections — Intros to gym chains and operators beyond the Bay Area." / "Resources — Compute credits, hardware for new sites, privacy and legal counsel." / "Network — Investors for our pre-seed and founders who scaled B2B2C."
- **Tag:** "Raising a $300k pre-seed"
- **TODO chip:** "[TODO: tailor all three columns to exactly what this program offers]"
- **Numbers:** $300k. No use of funds, runway, milestones or timeline (v1 had 12 months, 5–15 pilots).
- **Words:** 48 / 62
- **Job:** state what we want.

### 15 · Closing
- **Headline (h1):** "Automatic workout tracking from existing gym cameras." (repeats slide 1)
- **Body:** "info@tryspottr.app · tryspottr.app" / "Felix Müller-Gliemann, Martin, Gard"
- **Words:** 14 / 14
- **Job:** leave the one-liner and contact on screen.

---

## Appendix

### Divider (page 16)
- "Appendix" + TOC: A1 Privacy and data security · A2 Technology and architecture · A3 Market size derivation · A4 Competitor landscape · A5 Go-to-market · A6 Roadmap and open questions · A7 Product gallery. Words 27 / 28.

### A1 · Privacy and data security
- **Headline:** "We track body pose, not faces. Here is what the build does today."
- **Available today (green "Today" pills):** "No face recognition. Sets and reps come from body keypoints over time." / "Bystanders pixelated head to toe in the member replay." / "Blurred snapshots only: Gemini gets one small image per set, lifter's face pixelated, others fully pixelated." / "Operators see aggregates: counts, trends, zones; no photos or video." / "AI recaps from text (exercise names, reps), not video."
- **In development ("Building" pills):** "All processing on the Spottr box; goal: raw video never leaves the gym" / "Member opt-in and opt-out" / "Retention windows with automatic deletion" / "Self-serve export and deletion"
- **Known limits:** "Blur only covers people the pose model detects; the replay blurs while drawing, the file itself is not blurred."
- **TODO:** "[TODO: GDPR / CCPA framework and consent flow, after legal review]"
- **Footer:** "Mirrors the /gyms/privacy page ("Available today" vs "In development"), which only lists what the current build does."
- **Words:** 120 / 163. **Job:** answer the privacy objection honestly.
- **Live check:** `src/gyms/pages/Privacy.tsx` lists the same "Available today" items. The AI recap goes through the dev-only `/api/recap` route (`vite.config.ts`); on Vercel (tryspottr.app) the app falls back to a local, non-AI recap (`src/services/summary.ts`).

### A2 · Technology and architecture
- **Headline:** "From camera stream to logged set, with no per-exercise rules."
- **Pipeline:** "Existing cameras — Gym IP cameras; recorded footage today" → "Pose + tracking — YOLO26 pose, BoT-SORT person tracks [Built]" → "Rep counting — From joint motion; the label never changes the count [Built]" → "Exercise label — One blurred snapshot per set to Gemini Flash [Built]" → "Shared floor map — Multi-camera calibration, sync, one ID per person [Built]"
- **Runs on:** "Python vision pipeline · FastAPI world service · React/TypeScript member app and gym dashboard"
- **Target deployment:** "On-site edge box (Mac mini class) per gym; only blurred snapshots and workout data leave the building [In development]"
- **Footer:** "Tested on recorded clips: 5 squats and 10 dips counted, 0 false sets on a crowd clip, 13–14 fps (team-stated, 3 clips; not a benchmark)."
- **Words:** 96 / 132. **Job:** show technical depth and what is built vs. not.

### A3 · Market size derivation
- **Headline:** "Locations × camera share × price, with conservative inputs."
- **Table:** Bay Area ~208 chain locations (implied) → ~104 (50%) × $18,000 = $1.9M (v1 research, vendor counts, assumed) / US chains (SAM) 7,825 → ~3,900 → $70M (vendor counts ±5%) / US all clubs 55,281 → ~27,600 → $498M (HFA) / Global (TAM) ~245K implied → ~122K → $2.2B ("to source")
- **Camera share:** "50% is assumed, not measured. 30–70% moves US chain SAM to $42–99M. [Open] share of gyms with IP cameras on the weight floor."
- **Vision cost per set:** "~$0.001–0.005 per Gemini Flash call (estimate from list prices); token counts not yet measured."
- **Footer:** "Price: $1,500 per location per month (founder target, untested). v1 also reported US + Europe (122,796 clubs) at $2.2B without a camera haircut; keep one definition per deck."
- **Words:** 103 / 139. **Job:** back the market number.

### A4 · Competitor landscape
- **Headline:** "Manual vs automatic, own hardware vs existing infrastructure."
- **Table (Player | What it is | Tracking | Hardware | Why we're different):** EGYM | Smart strength machines, corporate wellness | Automatic, own machines only | Proprietary | Covers the whole floor, incl. free weights / Technogym | Connected equipment | Automatic, own machines only | Proprietary | No equipment replacement / Whoop | Wrist wearable | Mostly automatic, strain-based | Wearable | Nothing to wear; sets and reps / Hevy, Gravit | Workout logging apps | Manual | Phone | Zero input / German startup | Camera-based tracking | Automatic | Own cameras | No install of new cameras / Spottr | Gym cameras to workout log | Automatic | Existing cameras + one box | —
- **Footer:** "Our reading of public product information. Incumbents could add camera tracking; our edge is the existing-camera install and the member data it builds up."
- **Words:** 92 / 120. **Job:** detailed competitive differentiation.
- **Note:** CLAIMS.md (v1 slide 10) also listed Exersight (own cameras) and GroeFit (occupancy/churn analytics); both are missing from v2.

### A5 · Go-to-market
- **Headline:** "Chains first, Bay Area first, then the US, then global."
- **Timeline:** "Now — SF chain, 8 locations — Onboarding from 1 Nov; prove it live" → "Next — Bay Area chains — Referrals and case study from chain #1" → "Then — US chains — One contract, many locations" → "Later — Global — Same box, same cameras"
- **Channels:** "Gym channel — Direct founder outreach to chain operators; inbound from operators who heard about us." / "Member channel — Every partner gym brings its members in free. Premium converts from there."
- **TODO:** "[TODO: sales cycle length, pilot-to-paid terms, onboarding playbook per location]"
- **Words:** 75 / 88. **Job:** show a credible path from one chain to many.

### A6 · Roadmap and open questions
- **Headline:** "Next: link people to members, then make training social."
- **Open: who is who:** "Linking a person on camera to a member account. Options:" QR code check-in at the door / Refit ID / Face recognition at entry and exit points "(needs legal review; today we do no face recognition)"
- **Member features:** AI personal trainer (premium) / PRs and social / Leaderboards / Rewards / Matching
- **Gym features:** Live floor heat map, 6am to midnight / Equipment popularity and idle machines / Churn signals
- **Footer:** "Roadmap, not commitments. The identity-linking choice decides what goes on the privacy page; locker-room cameras were raised as an option and need legal review before any use."
- **Words:** 106 / 142. **Job:** be honest about the biggest open problem and show where the product goes.

### A7 · Product gallery
- **Kicker only, no headline:** "A7 · Product gallery"
- **Four screenshots, each tagged "demo data":** Member app (Today card: "Quads · Glutes", recap "Great effort! You crushed 5 clean reps…", body map) / Gym insights ("What Spottr noticed this week": "Squat racks are at 94% capacity Mon–Thu 5–7pm", "43 members have gone quiet in the last two months", "Pec deck and Hip abduction sit unused 80% of peak hours") / Peak hours chart / Zone overview.
- **Footer:** "Live demo: tryspottr.app/demo (members) and tryspottr.app/gyms (operators)."
- **Words:** 0 / 31. **Job:** show the breadth of the product UI.

---

## Cross-deck observations (facts only)

- The traction story on slide 9 / A5 ("signed on", "8 gyms onboarding from November 1") is not in `deck/CLAIMS.md`. CLAIMS.md (round 3, keyed to v1 slide numbers) records: "20 gyms cold-emailed, 8 replied; 1 large chain in pilot talks (corporate; location GM positive); no pilot agreed, no LOI, no revenue". CLAIMS.md was not updated for v2. The v2 README says the chain story came from the pitch-deck meeting.
- CLAIMS.md records the hackathon as a "3-hour hackathon sprint, 2026-09-27, no placement". Slide 9 says "Met at a Berkeley hackathon" and "Built the product end to end".
- CLAIMS.md says the market headline "leads with" the US chain SAM (~$70M camera-suitable). v2 leads with a $2.2B global TAM.
- New v2 numbers not in CLAIMS.md: Whoop $1.1B bookings / +103% / 2.5M+ members, Technogym €1.02B +13%, EGYM $1.2B+ valuation, $498M US, $2.2B global at 50%, "8 gyms", "a 9th".
- v1 numbers dropped in v2: 83.1% gross margin, $399 anchor / 3.8x, engaged members stay 23 vs 16 months, visits per member 2.1→1.5, 17/17 synthetic tests, 12-month plan and 5–15 pilot milestones, hardware cost per pilot.
- Slide count: 15 main + 8 appendix pages. Main-slide core word counts: median ~56, max 93 (slide 6); 11 of 15 main slides exceed the v1 plan's 35-word limit on core copy alone.
- Slides with no image or product visual: 1, 2, 3, 4, 5, 6, 9, 11, 13 (placeholder), 14, 15. Product visuals appear on 7 and 8 only (plus A7).
- Live today (repo `main`): member app `/demo` replays recorded clips with real pipeline output; `/gyms` is a seeded simulation of a fictional gym; `/gyms/world-map` shows a static export of two recorded cameras. No live camera ingestion, no edge box, no customer data.
