# Spottr deck: claims register (round 3)

Status: `verified` = from a cited source section (third-party figures are as reliable as that source); `founder statement` = 07_founder_input.md, not externally verified; `derived` = our arithmetic from cited inputs; `assumption` = model input, estimate or plan, labelled as such on the slide.

| Slide | Claim | Source | Status |
|---|---|---|---|
| 1 | Presenters: all three founders; contact info@tryspottr.app | 07_founder_input.md §1 | founder statement |
| 2 | 66.4% average annual retention (HFA 2025, 175 operators, data year 2024) | 02_problem_customer.md §1a | verified |
| 2 | Engaged members stay 23 vs 16 months (seven months longer; Les Mills, correlational) | 02_problem_customer.md §1a | verified |
| 2 | Visits per member 2.1 a week (2019) to 1.5 (2024) | 03_market.md §1.2; 08_web_update.md §1.6 | verified |
| 2 | HFA 2026 reports decade-low churn for 2025 (tension with 66.4%) | 02_problem_customer.md §1a, §8 | verified |
| 2 | One gym owner (paraphrase, not a quote): the per-area overview was most useful | 07_founder_input.md §2 | founder statement (one conversation) |
| 3 | 81M US fitness-facility members in 2025, a record, +5.2% | 08_web_update.md §1.1 | verified (HFA release) |
| 3 | Free weights the fastest-growing equipment category (HFA) | 08_web_update.md §1.3; 03_market.md §4.5 | verified at press level; re-check original (26.4M dumbbell-user figure deliberately not used) |
| 3 | Cost of a given AI capability falls about 10x a year (language models, not vision) | 08_web_update.md §1.8 (a16z LLMflation), §1.9 (Epoch: 9-900x/yr) | verified; counterpoint: frontier model prices have risen (§1.11) |
| 4 | Gym pays, members use it; gym dashboard and floor view are simulated | context.md §What Spottr is; 01_product.md §4 | verified (repo) |
| 4 | Linking a person on camera to a member account is an open problem | 07_founder_input.md §4 | founder statement |
| 5 | Pipeline stages, blur rules (Gemini gets one blurred composite per set; replay pixelates detected bystanders; undetected people not blurred); on-site processing is target, not deployed | 01_product.md §2-§4 | verified (repo) |
| 6 | Replay frames are real pipeline output on a recorded squat clip; 5 squats counted | 01_product.md §1, §3 | verified (count team-stated) |
| 6 | Lifters in squat.mp4 and dip.mp4 may be shown | 07_founder_input.md §5 | founder statement |
| 7 | 17/17 synthetic tests pass (synthetic skeletons, not video) | 01_product.md §1 | verified |
| 7 | 5 squats, 10 dips counted; 0 false sets on crowd clip; 13-14 fps (source footer) | 01_product.md §3 | verified for 3 clips; not a benchmark |
| 7 | 3-hour hackathon sprint, 2026-09-27, no placement | context.md §Stage and traction | founder statement |
| 7 | 20 gyms cold-emailed, 8 replied; 1 large chain in pilot talks (corporate; location GM positive); no pilot agreed, no LOI, no revenue | 07_founder_input.md §6 | founder statement |
| 8 | Go-to-market: chains, Bay Area, US, international; freemium for members | 07_founder_input.md §7 | founder statement |
| 8 | TAM US about $995M (55,281 clubs x $18,000 a year) | 08_web_update.md §3.1, §2.1 | derived (price is a founder target) |
| 8 | TAM US + Europe about $2.2B (122,796 clubs) | 08_web_update.md §3.1, §2.5 | derived |
| 8 | SAM US named chains about $141M (7,825 locations, vendor counts +/-5%); about $70M camera-suitable | 08_web_update.md §3.2 | derived; 50% suitability is an assumption (30-70% gives $42-99M) |
| 8 | SOM Bay Area chains about $1.9M (about 104 camera-suitable locations) | 08_web_update.md §3.3 | derived; assumption (chains spread like all clubs) |
| 9 | Price $1,500 per location per month, hardware included | 07_founder_input.md §8 | founder statement; untested, no customer has paid |
| 9 | Gross margin 83.1% (400-member gym, one box): costs $252.9 = hardware 41.4 + Gemini 99 + hosting 15 + support 50 + MDM 4 + payments 2.9% x $1,500 = 43.5; GP $1,247.1 | 05_business_model.md §4.2 (cost lines) | derived; cost lines are assumptions (hardware over 36 months, Gemini Flash at the 2027 price) |
| 9 | 81.2% with two boxes: costs $281.8 (hardware 66.3, MDM 8) | 05_business_model.md §4.2 | derived |
| 9 | 58.3% for a large gym (~1,900 members, Gemini about $472 a month): costs $625.9, GP $874.1 | 05_business_model.md §4.2 (note on chain-sized gyms) | derived; assumption |
| 9 | Hardware $1,489 (one box) to $2,388 (two boxes) per gym | 05_business_model.md §2.4 | assumption |
| 10 | Competitor positions (EGYM, Technogym, Exersight with its own cameras, GroeFit, wearables, Hevy/Strong); Spottr top right by the founders' request and our reading of the axes | 04_competition.md §1, §4, §6, §8, §9; 07_founder_input.md §9 | assumption (our reading; YC directory not scanned) |
| 10 | Spottr features: existing cameras, nothing to wear, automatic sets and reps (recorded clips only), area overview (demo data), bystander blurring (replay, Gemini snapshots) | 01_product.md §2-§4 | verified (repo) / demo |
| 11 | CEO Felix Müller-Gliemann, CTO Martin, CPO Gard (title to be confirmed) | 07_founder_input.md §11 | founder statement |
| 11 | Education (LMU Munich, UC Berkeley Haas exchange; MSc Entrepreneurship; MSc Robotics); all full-time; not yet incorporated | context.md §Team | founder statement |
| 12 | Raising a $300k pre-seed; closes end of October 2026, then 12 months | 07_founder_input.md §10 | founder statement |
| 12 | Milestone month labels (Oct 2026 to Oct 2027), 5-15 pilots, seed round after pilots | 03_market.md §3.4; 05_business_model.md §5, §6 | assumption (our plan, tagged "Plan, not commitments") |
| 12 | Hardware for 5-15 pilots about $7k-36k (5 x $1,489 to 15 x $2,388) | 05_business_model.md §2.4 | derived |
| 13 | Chain pilot then paid LOI; works live; retention has no evidence yet | 07_founder_input.md §6, §8; 05_business_model.md §5; 03_market.md §4.6 | assumption (design, not benchmark); absence of evidence verified |

Images: slide 4 shows mock data ("Demo data"): the member Today card and the /gyms floor view. Slides 5 and 6 show real pipeline output (styled replay overlay) on a recorded squat clip, cropped tightly to the lifter so no other gym member is in frame; the lifter's face is not pixelated because the founders confirmed consent (07_founder_input.md §5). The Gemini composite on slide 5 is the pipeline's own blurred output. Word counts exclude small label, tag, axis and TODO chips and source footers.
