# Spottr deck: claims register (first draft)

Status: `verified` = taken from a research source with the cited section (third-party figures are as reliable as the cited source); `assumption` = model input, estimate or plan, labelled as such on the slide.

| Slide | Claim | Source | Status |
|---|---|---|---|
| 2 | 66.4% average annual retention (HFA 2025, 175 operators, data year 2024) | 02_problem_customer.md §1a | verified |
| 2 | Engaged members stay 23 months vs 16, i.e. seven months longer (Les Mills, 2.6M member journeys; correlational, group-fitness-biased) | 02_problem_customer.md §1a | verified |
| 2 | HFA 2026 reports decade-low churn for 2025 (tension with 66.4%, data year 2024) | 02_problem_customer.md §1a, §8 | verified |
| 2 | Visits per member 2.1 a week (2019) to 1.5 (2024) | 03_market.md §1.2 | verified |
| 3 | 81M US gym members in 2025 | 03_market.md §1.2 | verified |
| 3 | Free weights fastest-growing equipment category since 2021 | 03_market.md §4.5 | verified |
| 3 | Median revenue +10.7%, EBITDA 22.1% (2025, HFA Global Report 2026) | 03_market.md §1.3 | verified |
| 3 | AI label about $0.001-0.005 per set ($0.0008 Flash-Lite to $0.0046 Flash 2027); model prices rose in 2026 and step up on 2027-01-01 | 03_market.md §4.1-4.2; recomputation in qa_report.md §5 | assumption (token counts not measured) |
| 5 | Pipeline stages; blur rules; target architecture not deployed | 01_product.md §2-§4 | verified (repo) |
| 6 | Replay shows real output on recorded clips (squat x5, dips x10) | 01_product.md §1, §3 | verified (counts team-stated) |
| 7 | Built in a 3-hour hackathon sprint, 2026-09-27 | context.md §Stage and traction | verified (team-stated) |
| 7 | 17/17 synthetic tests pass (synthetic skeletons, not video) | 01_product.md §1 | verified (re-run 2026-10-05) |
| 7 | 5 squats, 10 dips counted; 0 false sets on crowd clip and 13-14 fps (source footer) | 01_product.md §3 | verified for 3 clips; not a benchmark |
| 7 | Outreach started | context.md §Stage and traction | verified (anecdotal, unquantified) |
| 8 | 55,281 US commercial clubs (2023 data); 42,524 outside top 10 | 03_market.md §1.4, §3.3 | verified (source figures) |
| 8 | About 6,400 gyms (6,379), $30.5M ARR at $399/month; headline and tag frame it as an estimate | 03_market.md §3.3 | assumption (30% target share, 50% camera suitability, both unverified; $399) |
| 8 | California 877 gyms, $4.2M; Bay Area 170 gyms, $0.81M | 03_market.md §3.3 | assumption (Bay Area share is a population proxy) |
| 8 | Year-5 base case 116 gyms, $0.56M ARR | 03_market.md §3.4 | assumption |
| 9 | $299 / $499 tiers, blended $399, 12-month term | 05_business_model.md §3 | assumption (unvalidated hypothesis) |
| 9 | $399 revenue, $221.0 costs, $178.0 gross profit, 44.6% margin (central: $399 tier, Flash 2027 price, one box) | 05_business_model.md §4.2 | assumption |
| 9 | Two boxes per gym: 37.4% | 05_business_model.md §4.2 | assumption |
| 9 | $299 tier on Flash, one box: 27.1% (54.2% on Flash-Lite) | 05_business_model.md §4.2 | assumption |
| 9 | Break-even: keep 5.8-9.3 members a year | 05_business_model.md §3 | assumption (retention effect unproven) |
| 9 | Hardware $1,489 (one box) to $2,388 (two boxes) per gym, carried by Spottr | 05_business_model.md §2.4 | assumption |
| 9 | 400-member ICP gym | 05_business_model.md §3 | assumption |
| 10 | Competitor positions (EGYM, Technogym, Exersight installs its own cameras, GroeFit, wearables, Hevy/Strong); YC directory not yet scanned | 04_competition.md §1, §4, §6, §8, §9 | assumption (our reading of public info) |
| 11 | Founder education and roles (Felix); Martin MSc Entrepreneurship; Gard MSc Robotics; all full-time (no roles inferred from git history) | context.md §Team | verified (team-stated); role split open, marked TODO |
| 12 | Raising $300k; use-of-funds categories | context.md §Deck audience and goal | verified (team goal) |
| 12 | Hardware for 5-15 pilots about $7k-36k (5 x $1,489 to 15 x $2,388) | 05_business_model.md §2.4 | assumption (derived) |
| 12 | 5-15 pilots in 12 months; milestone timeline; seed round after pilots (tagged "Plan, not commitments") | 03_market.md §3.4; 05_business_model.md §5, §6 | assumption (plan) |
| 13 | 60-day pilot converting to a paid LOI | 05_business_model.md §5 | assumption (design, not benchmark) |
| 13 | No retention-improvement evidence yet | 03_market.md §4.6; 02_problem_customer.md §8 | verified (absence found) |

Screenshots: slides 4 and 5 (member map, KPI tiles) show mock data ("Demo data"); slides 5 and 6 show the lifter crop only (no other members), face pixelated for this deck. Slide 4 and 6 show mock data ("Demo data"); the replay frame is real pipeline output on a recorded clip with the lifter's head pixelated for this deck. Consent for the lifter footage is undocumented (TODO on slide 6).
