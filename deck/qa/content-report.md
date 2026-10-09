# Content QA report, final state (round 3, after commit b325a72)

## Verdict

The deck is content-clean for a first draft. All issues from rounds 1 and 2 are fixed, including N1-N3 from round 2. The re-audit of the changed slides (4, 5, 6, 9, 12) and CLAIMS.md found no new problems.

Open counts: critical 0, medium 0, minor 0. One optional polish note is listed below.

## Round-2 items (N1-N3)

| # | severity | slide | status |
|---|---|---|---|
| N1 | minor | 9 | FIXED. The tiles read "$399 tier, two boxes" and "$299 tier, Flash, one box". The footer states "hardware amortised over 36 months (assumption)". |
| N2 | minor | CLAIMS.md | FIXED. The slide 6 row now says one squat clip with 5 squats and points to slide 7 for dips. The two-box row names the $399 tier and the amortisation assumption. The screenshot note is rewritten and consistent. |
| N3 | minor | 9 | FIXED. The $221/$178 line, the 54.2% figure and the 5.8-9.3 break-even each carry a data-src (05 §4.2, §3). |

## Changed slides, re-audit

| slide | change | result |
|---|---|---|
| 4 | The gym-dashboard panel was removed. The member screenshot is larger and carries a "Demo data" tag. Text reads "The gym pays; members use it." | OK. The footer still says the operator dashboard is simulated. The member-linking TODO remains. |
| 5 | Added the rep-counter chip and the "Set 1 · 5 squat · 0:25" chip. | OK. The chip matches public/demo-data/squat/session.json: set starts at 25.2 s, 5 reps, squat. The headline "tested on squats and dips only" remains. The footer keeps the "undetected people are not blurred" caveat. |
| 6 | The hero is now a three-frame lifter-only sequence. The text reads "Recorded clip; 5 squats counted (team-stated)." | OK. The face is pixelated. No bystanders appear. The consent TODO stays. The "Real pipeline output" tag stays. |
| 9 | Tile labels and footer updated as above. | OK. 44.6%, 37.4%, 27.1% and 54.2% match 05 §4.2. $1,489-2,388 matches 05 §2.4. |
| 12 | The "Plan, not commitments" tag moved below the timeline. | OK. It is still visible. The timeline dates carry TODOs. |

Optional polish (not an issue): "0:25" in the slide 5 chip is the set's start time in the clip, not its duration. This is fine as the app UI shows it, but may be misread. If asked, say "set starts at 0:25".

## Standing checks

- Banned items absent: 21.8 fps, 16/16, 61.7%, 4-6 cameras per Mac mini, "no biometrics", compliance claims, pilots, LOIs, revenue, customers, "no competition".
- Privacy matches the code: the replay pixelates detected bystanders, undetected people are not blurred (stated), one blurred composite per set goes to Gemini, on-site processing is the target (not deployed), and the pipeline has run only on recorded clips.
- Traction: 3-hour sprint, no placement, 17/17 synthetic tests, 5 squats and 10 dips (team-stated), outreach started. Not yet: live cameras, pilots, LOIs, revenue.
- Assumptions are labelled visibly: "Estimate, not data" (slide 8), "Illustrative; no customer has paid" (slide 9), "Plan, not commitments" (slide 12), "(est.)" (slide 3).
- Required TODOs are visible: presenter and submission; owner quote; camera share; member linking; lifter consent; gyms contacted and VC names; venture-scale story; pricing; Martin/Gard split with CEO/CTO; visa; incorporation; instrument and cap; a16z/YC relation; use of funds; success thresholds; Exersight differentiation.
- Team slide states only confirmed roles.
- Every cited file and section exists, and the numbers match the research.
- Footer numbers on slides 7, 8, 9, 12 and 13 now carry data-src.
- CLAIMS.md matches the slides.
