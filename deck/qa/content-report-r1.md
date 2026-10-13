# Content QA report: Spottr deck draft (deck/site/index.html, deck/CLAIMS.md)

## Verdict

No critical issues. The deck is largely honest: banned items are absent (grep for 21.8, 16/16, 61.7, 4-6 cameras, "no biometrics", "no competition" returns nothing). It states plainly that there are no pilots, LOIs or revenue, and that the work is on recorded clips only. Required [TODO]s are visible, except that the Martin/Gard split is not flagged as open. The main risks are headlines that are stronger than their footnotes: slide 9 (margin), slide 8 (market), slide 10 (competition), slide 5 (exercise-agnostic) and slide 7 (tests). A skeptical partner would read these as spin, even though each is sourced. Fix the 8 medium items before sending.

Counts: critical 0, medium 8, minor 9.

## Issues

| # | severity | slide | exact text | problem | fix |
|---|---|---|---|---|---|
| 1 | medium | 9 | "Gyms pay $299-499 a month per location with hardware included, which keeps a 44.6% gross margin in our central case." | 44.6% is the $399, one-box, Flash-2027 case only (05 §4.2). At $299 on Flash it is 27.1% (the $299 tier only works on Flash-Lite). With two boxes, the research's "likely case" (05 §2.4), it is 37.4%. The headline implies 44.6% across the whole price range. | "...about 45% gross margin at $399 with one box (about 37% with two, the likely case until benchmarked)." |
| 2 | medium | 9 | "Hardware $1,489, carried by Spottr" | 05 §2.4 says to use $2,388 (two boxes) as the likely case until a multi-stream benchmark exists. The deck shows only the lean number big and the two-box margin in small print. | Show "$1,489-2,388" and label the one-box number as the lean case. |
| 3 | medium | 8 | "Our first wedge is about 6,400 US gyms, roughly $30M a year, before any expansion." and row label "camera-suitable gyms, ARR" | The headline states the number as fact. It rests entirely on placeholders: 30% target share and 50% camera suitability (03 §3.3, "no data exists"). "Camera-suitable" implies this was checked. The "Estimate" tag sits at the bottom, small. Also 55,281 is 2023 data. | Headline "We estimate about 6,400 target gyms, roughly $30M a year"; put "Estimate: assumes 30% share, 50% camera coverage (unverified)" next to the number; label the row "assumed camera-suitable". |
| 4 | medium | 10 | "Incumbents auto-log only on their own machines, and members auto-log only by wearing something." | Overgeneralises. Exersight (camera-based auto-logging, ~70% overlap per 04 §A1/§1) and Perch also auto-log via cameras. The closest competitor is only a dot, not called out. OpenVector (YC S2026, "any existing camera") is unchecked in 04 §9. The 2x2 puts Spottr alone in the best quadrant while "unproven". | Reword: "Incumbents auto-log only on their own machines, wearables need a device on the member, and the one camera rival (Exersight) installs its own cameras." Name Exersight as the closest competitor. Add a line that incumbents could add this and that the YC directory is not yet scanned. |
| 5 | medium | 11 | Martin: "MSc Entrepreneurship." Gard: "MSc Robotics. Works on the vision pipeline per the team." | context.md and 00_summary §2 row 12 and §4 Q4: git shows Martin wrote the whole vision backend and Gard has one commit. The TODOs ask for roles but do not flag the Martin/Gard split as open. Stating Gard "works on the vision pipeline" without the caveat invites a diligence trap. | Add "[TODO: Martin/Gard split on the vision pipeline conflicts with git history, confirm before sending]" and drop or soften the Gard pipeline line until confirmed. |
| 6 | medium | 5 | "Pose tracking counts reps without a rule per exercise" | 01 §3: thresholds are tuned on 3 clips plus synthetic data, with a dips-specific special case added; generality beyond squat and dips is untested. | Add to footer or sub-line: "Validated on squats and dips only." |
| 7 | medium | 7 | "17 of 17 tests pass" | The tests are synthetic skeletons, not video (01 §1). Without "synthetic" a reader assumes real footage. CLAIMS.md says synthetic; the slide does not. | "17 of 17 synthetic tests pass". |
| 8 | medium | 5, 6 | "Today: bystanders pixelated, faces blurred." and headline "...pixelated bystanders." | Code (privacyBlur.ts, classify.py blur_people, Privacy.tsx): the lifter's face is blurred only in Gemini snapshots and thumbnails; in the replay the selected member is shown unblurred. Anyone the pose model misses is not blurred, and annotated.mp4 and the raw demo clips are unblurred (01 §2). The slide 6 screenshot shows small unblurred people in the background. | Slide 5: "Gemini snapshots: lifter's face and all bystanders blurred. Replay: bystanders pixelated if detected." Add "people the pose model misses are not blurred" to the footer. |
| 9 | minor | 4 | "Spottr is built to log every set from a gym's existing cameras" | "Every set" overclaims; it has run on 3 clips. "Built to" hedges it only partly. | "...is built to log sets from a gym's existing cameras". |
| 10 | minor | 6 | "Real: replay of recorded clips (squat x5, dips x10)" | The counts are team-stated; no ground truth is in the repo, and dips accuracy is unverified (01 §3). The caveat is only on slide 7. | Add "counts team-stated" here. |
| 11 | minor | 2 | "...engaged members stay far longer." and "66.4%" | Les Mills is group-fitness-biased and correlational (02 §1a). 66.4% is data year 2024; HFA 2026 reports "decade-low churn" with a paywalled figure (02 §8). "Far longer" is 23 vs 16 months. | "stay about 7 months longer (Les Mills)"; footnote the churn tension. |
| 12 | minor | 3 | "AI labelling now costs a fraction of a cent per set" | The headline presents an unmeasured estimate (token counts not measured, 03 §4.2) as fact; "(est.)" is only on the tile. Research 03 §3.4 says hardware and Flash prices rose in 2026, so "why now" is partly a headwind and the deck omits this. Prices double on 2027-01-01. | Put "estimated" in the headline; note the 2027 price step in the footer. |
| 13 | minor | 3, 7, 8, 12, 13 | Footer numbers: "0 false sets", "13-14 fps" (s7); "42,524" (s8); "5-15 pilots", "12 months" (s12); "60-day pilot" (s13) | No data-src attribute; the file is cited only in prose. The brief wants data-src on numbers. | Wrap each in a data-src span (01 §3; 03 §1.4; 03 §3.4; 05 §5). |
| 14 | minor | 12 | "Next: seed round after pilots." and the milestone timeline | A plan not stated in context.md; it is derived from 03 §3.4. The timeline is invented, though its dates carry TODOs. | Label as "plan / assumption" visibly, not only in the footer. |
| 15 | minor | 8 | Bar widths (Year-5 bar ~1% vs 116/55,281 = 0.2%) | Disclosed as "indicative", but the bars are not to scale. | Remove the bars or draw them to scale. |
| 16 | minor | 7 | "We built a working technical core in days" | context.md says the pipeline was a 3-hour sprint. The submission was incomplete, with no placement. The footer says 3-hour, but omits the "no placement" fact. | Headline: "built in a 3-hour hackathon sprint, plus days of app work"; consider noting no placement. |
| 17 | minor | 1, CLAIMS.md | "Pre-seed, 2026"; CLAIMS rows for 8 and 9 | The instrument is unsettled, so "Pre-seed" is a label the TODO on slide 12 does not cover. CLAIMS.md: 55,281 lacks its year (2023); slide 3 AI cost lacks a pointer to the qa_report §5 recomputation in the slide data-src. | Add the year and the qa_report §5 pointer in CLAIMS.md; keep "Pre-seed" or drop it. |

## Checks passed

1. Banned list: no 21.8 fps, 16/16, 61.7%, 4-6 cameras per Mac mini, "no biometrics", compliance claims, pilots, LOIs, revenue, customers or "no competition". The slide 7 "Not yet" box and slide 13 are explicit.
2. Privacy matches the code on three points. Bystanders are pixelated head to toe in the replay (privacyBlur.ts; Privacy.tsx). Gemini receives one blurred composite per set (three frames of one rep; classify.py). On-site processing is stated as "target, not deployed" and runs only on recorded clips (Privacy.tsx "In development"; 01 §2, §4).
3. Required [TODO]s are visible: presenter and submission (s1); gym owner quote (s2); camera share (s3); member linking (s4); consent of lifters (s6); gyms contacted and VC names (s7); venture-scale story (s8); pricing (s9); CEO/CTO, visa, incorporation (s11); instrument/cap, a16z/YC relation, use-of-funds split, dates (s12); success thresholds (s13).
4. Team: Felix's details match context.md; Martin's and Gard's roles are not invented.
5. Traction does not exceed the research: sprint, working core, outreach started, no live camera, no pilots.
6. The demo images show no fake "29.8 FPS | RTSP ONVIF" label and no crowd clip. The lifter's face is pixelated and the slides carry a "Demo data" caption.

## Numbers verified OK (file + section exist and values match)

- 66.4% retention; 175 operators; data year 2024 (02 §1a).
- 23 vs 16 months; 2.6M member journeys (02 §1a).
- 2.1 to 1.5 visits a week, 2019 to 2024 (03 §1.2).
- 81M US members, 2025 (03 §1.2).
- +10.7% revenue and 22.1% EBITDA (03 §1.3 line 36; 00_summary cites §4.4).
- Free weights fastest-growing since 2021 (03 §4.5).
- AI cost $0.0008 to $0.0046, rounded to $0.001-0.005 (03 §4.2); fair as an estimate.
- 55,281 clubs (03 §1.4); 42,524 outside the top 10 (03 §1.4).
- 6,379 gyms and $30.5M (03 §3.3); California 877 and $4.2M; Bay Area 170 and $0.81M.
- Year-5 base case 116 gyms and $0.56M (03 §3.4).
- $399 minus $221 equals $178, giving 44.6% (05 §4.2); two boxes 37.4%.
- Break-even 5.8-9.3 members (05 §3).
- $1,489 and $2,388 hardware (05 §2.4).
- $7k-36k: 5 x 1,489 = 7,445 and 15 x 2,388 = 35,820 (derived, 05 §2.4).
- $300k raise (context.md).
- 17/17 tests; 13-14 fps (13.4/14.2/13.9); 5 squats; 10 dips; 0 sets on the crowd clip (01 §1, §3).
- Sections cited on slides 5-13 exist, including 02 §7, §8 and 03 §4.6.
