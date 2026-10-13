# Content QA report, final state (round 5, after commit 251194b)

## Verdict

All 5 medium and 8 minor issues from round 4 are fixed, except 2 that stay open as minor (#3 and #4 below). Slides 2, 3, 7, 8, 9, 10 and 12 and CLAIMS.md were re-audited. The slide 9 "3.8x" and comparator tile is supported by the research. The rewording on slides 3, 8 and 10 is accurate and hedged. The banned list is clean and privacy wording is unchanged.

Open counts: critical 0, medium 0, minor 4.

## Round-4 items

| # | severity | status |
|---|---|---|
| 1 slide 8 "$1B chains" | medium | FIXED. The headline is now "Our chain SAM is about $141M a year, $70M camera-suitable (derived)". The TAM row reads "all clubs", with a footer note that definitions differ. |
| 2 slide 9 margin framing, data-src | medium | FIXED. The headline reads "At a $1,500 target price, derived margins would be about 80% or more; the price is untested". The tile shows 3.8x, and data-src now says "derived: 05 §4.2 cost lines + 07 §8 price". |
| 3 slide 9 large-gym tile | medium | FIXED. Tile removed. The CLAIMS.md row says "dropped". |
| 4 slide 3 AI cost | medium | FIXED. The headline reads "LLM cost per capability keeps falling". The tile reads "~10x cheaper a year for a fixed capability (language models, not vision)". The footer says Spottr's own cost line is not falling (Flash prices up, 2027 step). |
| 5 slide 10 features and axes | medium | FIXED. "Designed for existing cameras; tested on recorded clips". GroeFit moved to the low (non-set) side. The footer says GroeFit is occupancy/churn analytics and live ingestion is not built. |
| 6 free-weights status | minor | FIXED by removal from the slide (see N1) and CLAIMS.md ("not used"). |
| 7 owner paraphrase | minor | FIXED. "especially helpful". |
| 8 slide 7 founder-reported | minor | FIXED. Separate "Outreach, founder-reported" column. |
| 9 SOM label | minor | FIXED. "Assumed Bay Area chain slice", with the research range in CLAIMS.md. |
| 10 visa TODO dropped | minor | NOT FIXED. See #3 below. |
| 11 raise close | minor | PARTLY FIXED. "Target close" is done. The YC/a16z relation TODO is not restored (see #4). |
| 12 $472 footer | minor | FIXED (the large-gym tile and its footer text are gone). |
| 13 CLAIMS.md free weights | minor | FIXED. |

## Verification of the new slide 9 tile

- 3.8x = 1500/399 = 3.76 (derived). The $399 anchor is in 05 §3 and 03 §3.2.
- The $75-999 comparators exist. $75-200 is Gymdesk (05 §1.1), and $75-300 is "gym management software" (03 §3.2, Gymsense/Gymdesk search summary). Mariana Tek $300-600 and Mindbody $79-499 are in 03 §3.2. GroeFit $129/$389/$999 is a vendor page verified by QA (03 §3.2, 04 §A3).
- The footer cites 08 §3.1, which has the $75-600 range and GroeFit up to $999. CLAIMS.md cites 08 §3.1 and 03 §3.2.
- The 83.1% and 81.2% cost lines are unchanged and the arithmetic is correct.

## Open issues

| # | severity | slide | exact text | problem | fix |
|---|---|---|---|---|---|
| 1 | minor | 3 | Headline "Strength training is booming, gyms are growing, and LLM cost per capability keeps falling." | "Strength training is booming" lost its only support when the free-weights tile was removed (press-level, 08 §1.3). Only 81M members, +5.2% remains. | "Gym membership is at a record 81M and LLM cost per capability keeps falling", or restore the free-weights stat once the HFA original is checked. |
| 2 | minor | 9 | Tile "3.8x our earlier $399 price; software comparators $75-999" | The $75-999 range mixes gym-management software ($75-600) with GroeFit (a camera-analytics vendor, up to $999). Its low end is a secondary search summary. 03 §3.2 also lists a low-quality vendor blog with "AI for gyms" up to $1,500, which would blunt the "above all anchors" point. | "management software $75-600; GroeFit $129-999". Keep the footer pointer. |
| 3 | minor | 11 | Team slide | The visa/US work status and incorporation-timing TODO is not shown (only "not yet incorporated" in the footer), and 07 does not answer it. Felix is on exchange, and the raise purpose is full-time US work. | Restore "[TODO: US work/visa status, incorporation timing]". |
| 4 | minor | 12 | TODO "[TODO: instrument and cap; use-of-funds percentages]" | The TODO on how $300k relates to YC's $500k / the a16z program is gone, and 07 does not answer it. | Re-add "[TODO: relation to YC $500k / a16z program]", or confirm with the founders that it is moot. |

## Standing checks (re-run)

- Banned list absent: 21.8 fps, 16/16, 61.7%, "4-6 cameras per Mac mini", "no biometrics" or compliance claims, and any pilots, LOIs, revenue, customers or "no competition". The "no LOI", "no revenue" and "none agreed" statements are present.
- Privacy matches the code. The replay pixelates detected bystanders. Undetected people are not blurred. The Gemini snapshot is one blurred composite per set. On-site processing is a target (not deployed). The pipeline has only run on recorded clips.
- Founder statements are labelled (traction 20/8/1 shown as founder-reported; owner remark shown as a paraphrase). CLAIMS.md matches the slides.
- All market and margin arithmetic re-checked: $995M, $2.21B, $141M/$70M, $1.9M (assumed), 83.1%, 81.2%.
- The slide 10 Spottr position is marked "target", and the features carry "recorded clips" caveats.
- Remaining TODOs (Martin/Gard names and photos, named VCs, success thresholds, instrument and use-of-funds percentages, camera coverage, chain validation) are appropriate.
