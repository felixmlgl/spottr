# Visual QA report, round 2 (after commit f30ec45)

Re-rendered all 13 slides at 1920x1080 and 1280x720 (deck/qa/visual/1920, /1280), every 1920 PNG viewed; metrics re-run (deck/qa/visual/metrics.json, script qa.mjs).

## Verdict
Most round-1 problems are fixed: margins, contrast, word counts, FPS/crowd footage, repeated dashboard crop. The deck is now cleaner but two slides regressed visually (4 and 6 are now sparse and unbalanced, 5 has an almost empty middle card). Not critical anymore; fix the new medium items before sending.

Checks: arrow-key nav OK (1,2,3,2,13,13,1,1). PDF export: 13 pages = 13 slides, MediaBox 1440x810 pt (16:9), print slide heights all 1080 px. No "FPS | RTSP ONVIF" text. "Demo data" tag on both mock screenshots (slide 4); slide 6 and 5 show real output with "Real output" tags. Visible words now 21-35 on every slide (limit 35). Text sizes: all body text >=28 px except 22 px assumption pills (acceptable captions). AA contrast: all non-TODO text now passes (grey #6b6b66, TODO #7d4a00); the green is no longer used for text, only underlines/outlines. No element outside the frame except the intentional slide 1 blob.

## Round-1 issues

| # | status | note |
|---|---|---|
| 1 s12 timeline overflow | fixed | milestones inset to 120..1800, last label right-aligned |
| 2 s6 bystander footage | fixed | now cropped to the lifter only, face pixelated; consent TODO still present (content, not visual) |
| 3 AA contrast of grey and TODO | fixed | text-3 #6b6b66, todo-ink #7d4a00 |
| 4 green text contrast | fixed | green now underline/outline accent, text stays near-black |
| 5 over 35 words | fixed | max is 35 (s2, s5, s7, s8, s9, s10, s12) |
| 6 unreadable, cut-off dashboard crops | partly fixed | crops are now complete and legible, but see new #17 and #18 |
| 7 sub-28 px text | fixed | col-titles/step numbers 28 px, captions 22 px |
| 8 slide 3 unlabeled curve | fixed | removed; green underline under 81M instead |
| 9 s8 bars not to scale | fixed | bars removed |
| 10 s9 three-line headline | fixed | two lines, three margin cards replace equation and pills |
| 11 s10 axis label/matrix margins | fixed | matrix spans 180..1800, axis label inside margin |
| 12 s4/s6 card right edge | fixed | (superseded by #17) |
| 13 duplicate page counter | fixed | removed |
| 14 s1 duplicate brand | fixed | header brand removed on title; wave now ends abruptly at x=1100 (see #21) |
| 15 empty lower halves, TODO weight | not fixed | slides 2, 3, 7, 13 still have 40-50% empty space above the TODO pill |
| 16 Google Fonts @import | not fixed | still @import from fonts.googleapis.com; no local font files |

## New issues

| # | severity | slide | issue | screenshot | fix |
|---|---|---|---|---|---|
| 17 | medium | 4 | Layout is unbalanced: right column holds only two small KPI tiles (ends x~1340), leaving a large void; the line "The gym pays; members use it." floats bottom-right, unaligned with anything; the two cards differ in height and top edge. | 1920/slide-04.png | Align both cards (same height, 2-column grid filling 120..1800), put the "gym pays" line under the headline or drop it (label was removed from the eyebrow). |
| 18 | medium | 6 | Product proof is now a small 400 px portrait crop in the left third with large empty space; text at right is plain. The overlay label above the pixelated head ("#2 squat r1") is garbled/illegible. Weakest slide visually. | 1920/slide-06.png | Show the lifter crop larger (or two frames side by side) and place Real/Simulated text under or beside at equal weight; remove or sharpen the garbled tag in demo-lifter.png. |
| 19 | medium | 5 | Middle card ("Rep counting") is almost empty: one line "Joint motion" and a big void, while cards 1 and 3 hold images; the first image is small and left-aligned in a wide card. Two green-outlined "Real" pills appear on one slide. | 1920/slide-05.png | Add a real rep-count visual (e.g. rep counter frame) or collapse to two cards; centre images; keep one green pill. |
| 20 | minor | 11 | Martin and Gard cards are mostly empty (one line each) while Felix's has four lines; heights are fine but the imbalance is noticeable. TODO block is two stacked wide pills. | 1920/slide-11.png | Expected until roles are filled; consider trimming Felix's line to match. |
| 21 | minor | 1 | Green wave now stops abruptly at x~1100 (path ends mid-slide) rather than fading out. | 1920/slide-01.png | End with a fade/gradient mask or extend to the edge. |
| 22 | minor | 12 | Timeline leaves a 250 px dead zone below it before the TODO block; "Plan, not commitments" pill sits oddly between headline and timeline. | 1920/slide-12.png | Move the pill under the timeline or into the footer; vertically centre timeline. |

Counts: critical 0, medium 3 (#17, #18, #19), minor 5 (#20, #21, #22, plus carried-over #15 and #16).

## Critique (updated)
Strongest: slide 2 (three huge numbers, one green underline, perfect hierarchy), slide 9 (three margin cards, central case highlighted, very scannable), slide 10 (clean 2x2, now aligned, Spottr dot as the single accent). Also good: 1 and 13 (pure type).
Weakest: slide 6 (the proof slide is the smallest visual), slide 4 (unbalanced, orphan line), slide 5 (empty middle card, clip-art gone but not replaced with substance).
Overall the deck now reads calmer and more consistent, but it still follows one template on every slide and uses almost no large imagery; the strongest evidence (the replay with skeleton) should be much bigger. TODO pills still dominate slides 11 and 12 while content is thin.
