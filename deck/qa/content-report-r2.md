# Content QA report, round 2 (after fix commit f30ec45)

## Verdict

All 8 medium and 9 minor issues from round 1 are fixed. Of the round-1 items, only the missing footer data-src on slide 9 (#13) is incomplete; it is tracked as N3 below. The new numbers check out against the research: 37.4% two boxes, 27.1% for the $299 tier on Flash, and 54.2% on Flash-Lite (05 §4.2); hardware $1,489-2,388 (05 §2.4); "seven months longer" is 23 minus 16 (02 §1a). The new copy on slides 2, 5, 7, 8 and 10 is accurate and hedged. The banned-list scan still finds nothing. The privacy wording matches the code. The lifter crop (demo-lifter.png) shows only the lifter, with the face pixelated. The deck now has 0 critical, 0 medium and 3 minor open items.

Counts (open): critical 0, medium 0, minor 3.

## Round-1 issues

| # | severity | slide | previous problem | status |
|---|---|---|---|---|
| 1 | medium | 9 | 44.6% headline implied the whole price range | FIXED. Headline is "44.6% at $399 with one box; about 37% with two", with 27.1% shown for $299. |
| 2 | medium | 9 | Only $1,489 shown for hardware | FIXED. "Hardware $1,489-2,388 per gym". |
| 3 | medium | 8 | The ~6,400 / $30M estimate was stated as fact | FIXED. Headline starts "We estimate...", the row label states the 30% and 50% assumptions, and a visible "Estimate, not data" tag was added. |
| 4 | medium | 10 | Headline ignored Exersight | FIXED. Headline names Exersight, a TODO on differentiation was added, and the footer notes the unscanned YC directory. |
| 5 | medium | 11 | Martin/Gard split not flagged | FIXED. The TODO names the split and the git-history conflict; Gard's pipeline line was removed. |
| 6 | medium | 5 | Generality of rule-free counting | FIXED. "tested on squats and dips only". |
| 7 | medium | 7 | Tests not labelled synthetic | FIXED. "17/17 synthetic tests". |
| 8 | medium | 5, 6 | "faces blurred" and unblurred bystanders | FIXED. Slide 5 says the replay pixelates detected bystanders; the footer says undetected people are not blurred. Slide 6 uses a lifter-only crop, so no background people are shown. |
| 9 | minor | 4 | "every set" | FIXED. |
| 10 | minor | 6 | Counts team-stated | FIXED. "5 squats counted (team-stated)". |
| 11 | minor | 2 | "far longer", churn tension | FIXED. "seven months longer"; the footer says correlational and notes HFA 2026's decade-low churn. |
| 12 | minor | 3 | AI cost as fact, price rises omitted | FIXED. "estimated at under a cent"; the footer notes price rises and the 2027 step. |
| 13 | minor | various | Missing data-src | MOSTLY FIXED. Added on slides 7, 8, 12 and 13. See N3 for slide 9. |
| 14 | minor | 12 | Plan presented as fact | FIXED. A visible "Plan, not commitments" tag. |
| 15 | minor | 8 | Bars not to scale | FIXED. Bars removed. |
| 16 | minor | 7 | "in days"; no placement | FIXED. "A 3-hour sprint..." and "no placement" in the footer. |
| 17 | minor | 1, CLAIMS | "Pre-seed"; CLAIMS gaps | FIXED. "Draft, 2026"; 2023 and the qa_report §5 pointer are in CLAIMS.md. |

## New issues introduced by the fixes

| # | severity | slide | exact text | problem | fix |
|---|---|---|---|---|---|
| N1 | minor | 9 | Tiles "37.4% two boxes" and "27.1% $299 tier, one box"; footer "Assumes a 400-member gym and Gemini Flash at the 2027 price" | The tiles do not say the 37.4% is at $399, or that 27.1% is on Flash. The 36-month hardware amortisation behind all margins is an [ANNAHME] (05 §4.2) and is not mentioned. | Label "$399, two boxes" and "$299, Flash, one box". Add "hardware amortised over 36 months (assumption)" to the footer. |
| N2 | minor | CLAIMS.md | Slide 6 row "squat x5, dips x10"; closing screenshot note | The slide now shows only 5 squats. The final screenshot paragraph is garbled: it repeats the slide 4/6 sentence and names slides 4/5 and 4/6 inconsistently. | Update the slide 6 row to squats only (dips remain on slides 5 and 7). Rewrite the closing note: slides 4 mock data; slides 5-6 lifter crop, face pixelated. |
| N3 | minor | 9 | Footer numbers "$221", "$178", "54.2%", "5.8-9.3 members" | No data-src attribute; they are cited in prose only. | Wrap them in data-src="05_business_model.md §4.2 / §3". |

## Checks passed (re-verified)

- Banned items absent: 21.8 fps, 16/16, 61.7%, 4-6 cameras, "no biometrics", compliance claims, pilots, LOIs, revenue, customers, "no competition".
- Privacy: the replay pixelates detected bystanders; a blurred composite per set goes to Gemini; on-site processing is stated as target, not deployed; undetected people are not blurred (stated). This matches privacyBlur.ts, classify.py and Privacy.tsx.
- Traction does not exceed the research: sprint, recorded clips, outreach started, no live camera, no pilots, no LOIs, no revenue.
- Visible TODOs: presenter and submission; owner quote; camera share; member linking; lifter consent; gyms contacted and VC names; venture-scale story; pricing; Martin/Gard split and CEO/CTO; visa; incorporation; instrument, a16z/YC relation and use-of-funds split; success thresholds; Exersight differentiation.
- Team slide states only confirmed roles (Felix's plus the two degrees).
- Numbers verified: 66.4%; 23 vs 16 (seven months); 2.1 to 1.5; 81M; +10.7% / 22.1%; $0.001-0.005 estimate (labelled); 55,281; 42,524; 6,379 / $30.5M; $4.2M / $0.81M; 116 gyms / $0.56M; 44.6%, 37.4%, 27.1% and 54.2%; $221 and $178; 5.8-9.3 members; $1,489-2,388; $7k-36k; $300k; 17/17; 5 squats; 10 dips; 13-14 fps; 0 false sets. All cited sections exist.
