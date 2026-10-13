# Visual QA report, round 4 (commit 38bee83)

All 13 slides re-rendered at 1920x1080 and 1280x720 (deck/qa/visual/1920, /1280); every 1920 PNG viewed; metrics re-run (deck/qa/visual/metrics.json, qa.mjs).

## Verdict
Clean, consistent and free of layout breakage; nothing critical. Remaining problems: two slides over the 35-word limit (8, 10), slide 4's two cards are mismatched, and slide 6 frames are soft with oversized skeleton dots.

## Checks
- Arrow-key nav OK (1,2,3,2,13,13,1,1).
- PDF: 13 pages = 13 slides, MediaBox 1440x810 pt (16:9), every slide 1080 px tall in print.
- Overflow/margins: nothing outside the 1920x1080 frame (slide 1 blob intentional); content, TODO pill and source footer do not overlap (slides 7, 8, 9: three-line footer sits ~15 px under the TODO pill, tight).
- Font sizes: all body text >=28 px; captions, pills and TODOs 22 px.
- Contrast: all text passes AA (grey #6b6b66, TODO #7d4a00); green is only used as underline/outline/dot.
- Green: at most one highlight per slide (s2, 3, 7, 8, 12, 13 underline; s9 card outline; s10 Spottr dot; s5 and s6 one outlined pill each).
- Visible words per slide: 25, 32, 35, 29, 34, 26, 34, 48, 37, 46, 23, 36, 32. Over 35: slides 8, 9, 10, 12 (see issues; 12 counts the five date labels).
- Bystanders / other gym members: none visible in any frame. Slide 4 shows the member app and the floor heat map (no people); slides 5 and 6 show only the lifter (head cropped out on s6, pixelated on s5). No crowd frame anywhere.
- "Demo data" present on both mock screenshots (slide 4). Slides 5/6 are real output (tagged "Real pipeline output"; slide 6 pill appears once).
- No "FPS" / "RTSP ONVIF" text on any slide (script check) and none visible in any image.

## Issues

| # | severity | slide | issue | screenshot | fix |
|---|---|---|---|---|---|
| 1 | medium | 8 | 48 visible words (TAM/SAM/SOM labels, three rows, assumption pill); eyebrow is a long 70-character line. Footer is 3 lines, tight to the TODO pill. | 1920/slide-08.png | Shorten row captions, shorten eyebrow to "Market", move detail to the source line. |
| 2 | medium | 10 | 46 words: chart plus a four-line "Spottr" list at right; chart no longer fills the width. GroeFit label is struck through by the horizontal grid line and the Hevy/Strong dot sits on the vertical line. | 1920/slide-10.png | Drop the right list or cut to two lines; nudge GroeFit and Hevy off the grid lines. |
| 3 | medium | 4 | Mismatched cards: member card 760 wide and ~330 tall, gym card 480 wide and ~410 tall, different top edges; "The gym pays; members use it." floats in the right gutter. Gym floor screenshot text is unreadable at slide size (tiny). | 1920/slide-04.png | Same width/height for both cards filling 120..1800 grid; put the pay line under the headline or in the eyebrow; crop the floor map to the heat-grid only. |
| 4 | minor | 6 | Replay frames are soft (upscaled) and the skeleton dots/box are oversized and cartoonish; lifter head is cropped, so frames look cut at the top. | 1920/slide-06.png | Use larger source frames, thinner overlay; include a little headroom. |
| 5 | minor | 9 | 37 words; "Hardware" line plus pill below cards leave the lower third empty. | 1920/slide-09.png | Trim card captions ("large gym, one box"). |
| 6 | minor | 12 | 36 words incl. date labels; large gap between timeline and TODO; "Plan, not commitments" pill hugs the last timeline label. | 1920/slide-12.png | Add spacing or move the pill into the footer. |
| 7 | minor | 2, 3, 7, 13 | Content stays in the upper half; 40-50% empty before the TODO pill (slide 7 headline is a single line so it is the emptiest). | 1920/slide-07.png | Accept for the draft or vertically centre. |
| 8 | minor | 7, 8, 9 | Three-line source footers sit ~15 px below the TODO pill and read as a dense block. | 1920/slide-07.png | Shorten footers or lift the TODO pill. |
| 9 | minor | all | Fonts still loaded via remote @import (no local fallback files). | styles.css | Self-host Inter. |

Counts: critical 0, medium 3, minor 6.

## Critique (3 weakest slides)
1. Slide 10: word-heavy, grid lines through labels, and the chart/list split makes it the busiest slide.
2. Slide 4: two unequal cards and a floating line; the tiny floor-map text is unreadable on screen.
3. Slide 8: 48 words and a three-line footer, the densest slide against the minimal brief; slide 6 frames are also soft.
Strongest: slides 2 (big numbers plus owner note), 9 (three margin cards), 13/1 (calm, pure type).
