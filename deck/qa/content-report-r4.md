# Content QA report, round 4 (deck at commit 38bee83, using 07_founder_input.md and 08_web_update.md)

## Verdict

The deck is mostly honest. Founder statements are marked as such in CLAIMS.md and the slide footers. The gym-owner remark is shown as a paraphrase. "No pilot agreed, no LOI, no revenue" is stated. The banned list is clean: no 21.8 fps, 16/16, 61.7%, "4-6 cameras per Mac mini", "no biometrics" or compliance claim, and no pilots, LOIs, revenue, customers or "no competition". Privacy wording still matches the code.

All the new arithmetic is correct and the cited lines exist. The risks are framing:
- Slide 8 pairs "chains" with a $1B figure that is actually all US clubs.
- Slide 9 leads with an 83% margin built on an untested price 3.8x above the research's anchors, and with a large-gym case that is our own arithmetic.
- Slide 3 turns LLM price falls into a general AI-cost claim.
- Slide 10 lists "existing cameras" as a feature without marking it as a target, and places GroeFit as if it logs sets.

Open counts: critical 0, medium 5, minor 8.

## Issues

| # | severity | slide | exact text | problem | fix |
|---|---|---|---|---|---|
| 1 | medium | 8 | Headline "Start with chains: about $1B a year in the US, $2.2B with Europe (derived)." and tile "$995M · $2.2B TAM" | The $995M is all 55,281 US commercial clubs at $18k, camera-suitable or not, budget or luxury, with or without a strength floor (08 §3.1). It is not a chains number. The chain SAM is $141M, or $70M camera-suitable. Europe's 67,515 clubs use a different definition (08 §4.5). Pairing "chains" with $1B overstates the starting market. | Headline: "TAM is every US club, about $1B; our chain SAM is about $141M ($70M camera-suitable)". Add "all clubs, any type" to the TAM row, and note that US and European club definitions differ. |
| 2 | medium | 9 | Headline "At $1,500 per location a month, hardware included, derived gross margin is about 83%." | The margin rests on an untested founder price. The research says the price is 3.8x the earlier $399 anchor, above all software comparators of $75-600 a month, with GroeFit up to $999 (08 §3.1, §4.7), and "expect pushback". Gross margin leads without the pushback context. The tag "price untested" is small. The derived numbers carry data-src 05 §4.2, but 05 §4.2 does not contain 83.1/81.2/58.3, $252.9, $281.8 or $625.9, and its 2.9% is on $399. | Add "$1,500 is 3.8x the $399 anchor; comparators $75-999" or move that to a caution line. Change data-src to "derived: 05 §4.2 costs + 07 §8 price". |
| 3 | medium | 9 | Tile "58.3% large gym (~1,900 members), one box" | 05 §4.2 gives only the Gemini ~$472 note for a chain-sized gym, not a COGS table. The tile keeps hardware ($41.4), hosting ($15), support ($50) and MDM ($4) at 400-member levels for 4.75x the traffic and one box, which is optimistic. It is shown as a research-backed third tile. | Label it "our arithmetic, assumption", or use 2 boxes and scaled support, or drop it. |
| 4 | medium | 3 | Headline "...and the cost of AI capability keeps falling." and tile "AI cost per capability: about 10x cheaper a year" | a16z LLMflation measures language-model benchmarks, not vision or pose. The caveat is only in the small footer. 08 §1.11 and 05 §4.2 show frontier and Flash prices have risen and double on 2027-01-01. The headline contradicts Spottr's own cost case, and a skeptic would say this is not Spottr's cost line. | Headline "...and a given language-model capability gets about 10x cheaper a year". Tile "LLM cost per fixed capability, ~10x/yr (not vision)". Keep the price-rise counterpoint in the footer. |
| 5 | medium | 10 | Spottr list "Existing cameras, nothing to wear / Automatic sets and reps / Area overview for gyms (demo) / Bystander blurring"; the 2x2 | "Existing cameras" is a target: no live RTSP ingestion exists (01 §4), and the pipeline has only run on recorded clips. It is unmarked in the list, and the caveat sits only in the footer. On the y-axis "Manual · Automatic per set", GroeFit sits mid-height although it is not rep tracking (04 §A3: occupancy and churn). The axes put Spottr alone top right, and 01 §4 says zone occupancy is planned and mock. | Add "(target, recorded clips only)" to the list lines. Move GroeFit to the manual/non-set side. Retitle the y-axis "Auto-logs sets per person". Keep "(demo)" on the area overview. |
| 6 | minor | 3 | Tile "Free weights: fastest-growing equipment category" | 08 §1.3 marks this press/verify. CLAIMS.md says "verified at press level". The footer says "to be re-checked". | Re-check in the HFA release before sending, or soften to "reported fastest-growing (HFA)". Change the CLAIMS status to "press, unverified". |
| 7 | minor | 2 | "Gym owner, paraphrased: the area overview helped most." | 07 §2 says "especially helpful", not "most". The slide cell is correctly marked as a paraphrase. | "found the area overview especially helpful". |
| 8 | minor | 7 | "20 gyms emailed, 8 replied" and "1 chain in pilot talks, none agreed" under "Built" | Founder statements are not marked in the body, and the footer cites a file name (07_founder_input.md) that means nothing to an investor. Outreach is not "built". | Label "founder-reported"; move outreach into its own "Outreach" line; keep the "no pilot agreed, no LOI" wording. |
| 9 | minor | 8 | "SOM Bay Area chains, camera-suitable $1.9M" | 08 §3.3 calls it an illustrative scenario. It is all camera-suitable Bay Area chain locations (about 104, assuming chains spread like all clubs), not an obtainable share. The research's obtainable range is $0.18-0.45M or $0.2-3.5M in 3 years. | Label "Bay Area chain SAM (assumption)", or show the 3-year goal range. |
| 10 | minor | 11 | Team slide has CEO/CTO/CPO and no Martin/Gard note | The visa/US work status TODO was dropped although 07 does not answer it, and Felix is on exchange. The pipeline-authorship conflict (git: Martin wrote the backend) is no longer visible; only "title tbc" on Gard remains. | Restore "[TODO: US work/visa status, incorporation timing]". |
| 11 | minor | 12 | "Oct 2026 Raise closes" | The close is stated as a milestone. No instrument or lead is named, and the TODO on the instrument is the only hint. The a16z/YC relation TODO was removed. | "Target close". Keep the instrument TODO and re-add the YC/a16z relation TODO if still unknown. |
| 12 | minor | 9 | Footer "Gemini about $472" | Exists (05 §4.2 chain-sized note), but it makes the large-gym tile depend on a 4.75x extrapolation. | Resolved by fixing #3. |
| 13 | minor | 1, CLAIMS | CLAIMS slide 3 row | The row says the free-weights claim is "verified" while the source file flags it. | Aligned with #6. |

## Checks passed

(a) New numbers vs 07/08/05:
- 55,281 x $18k = $995M. 122,796 x $18k = $2.21B.
- 7,825 x $18k = $141M; 3,913 x $18k = $70M.
- 104 x $18k = $1.9M.
- The 30-70% range $42-99M matches 08 §3.2.
- Margins:
  - One box: costs 41.4+99+15+50+4+43.5 = $252.9, GP $1,247.1, 83.1%.
  - Two boxes: costs $281.8, GP $1,218.2, 81.2%.
  - Large gym: costs 41.4+472+15+50+4+43.5 = $625.9, GP $874.1, 58.3%.
- All the 05 §4.2 cost lines exist, including the ~$472 chain-sized Gemini figure and the 2.9% card rate.
- 7,825 chain locations, 67,515 European clubs and $1,500 are as in 08 and 07.

(b) Founder statements:
- 20 emailed, 8 replied, one chain with corporate and a positive general manager, no pilot agreed, no LOI, no revenue: all match 07 §6.
- The owner remark is a paraphrase (the "most" wording is item 7).
- Raise, titles, contact, consent and chain targeting match 07. The Gard "title tbc" tag is shown.

(c) The AI-cost claim is limited to language models in the footer (see item 4).

(e) Privacy:
- The replay pixelates detected bystanders; undetected people are not blurred; one blurred composite per set goes to Gemini; on-site processing is a target; recorded clips only.
- The lifter is unblurred in the replay, as the code does, and the founders confirmed consent (07 §5).
- The crop shows only the lifter; the "Demo data" tags are present.

(f) Remaining TODOs are appropriate: Martin and Gard full names and photos, named VCs, success thresholds, instrument and use-of-funds percentages, camera coverage, and validating the chain location counts and the $1,500 price.
