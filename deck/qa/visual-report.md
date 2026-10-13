# Visual QA report, final (commit 251194b)

All 13 slides re-rendered at 1920x1080 and 1280x720 (deck/qa/visual/1920, /1280); slides 3, 4, 6, 8, 9, 10 viewed again in full, the others checked via metrics (their markup is unchanged since round 4). Metrics: deck/qa/visual/metrics.json (qa.mjs).

## Verdict
Ready as a draft. No critical issues; two medium word-count overruns (slides 8 and 10) remain, plus cosmetic items. Every previous layout defect (slide 4 mismatch, slide 10 grid-line collision, slide 6 head crop, slide 9 empty captions) is fixed.

## Checks
- Arrow-key nav OK (1,2,3,2,13,13,1,1).
- PDF: 13 pages = 13 slides, MediaBox 1440x810 pt (16:9), each slide 1080 px tall in print.
- No overflow or text outside the 1920x1080 frame (slide 1 blob intentional); content, TODO pills and footers do not overlap.
- Body text >=28 px; captions, pills and TODOs 22 px. All text passes AA. Green only as underline/outline/dot, at most one highlight per slide.
- Bystanders / other gym members: none visible in any frame (slide 4: member app and zone heat map, no people; slides 5 and 6: the lifter only, cropped). "Demo data" tag on both mock screenshots (slide 4); real output tagged "Real pipeline output". No FPS / RTSP label anywhere.
- Visible words per slide: 25, 33, 32, 25, 34, 26, 35, 47, 37, 45, 23, 36, 32.

## Previous round-4 issues
| # | status |
|---|---|
| 1 slide 8 words and eyebrow | partly fixed (eyebrow short, rows reduced to three, footer shorter; still 47 words) |
| 2 slide 10 words and grid collisions | partly fixed (labels off the grid lines; right panel still 45 words) |
| 3 slide 4 mismatched cards | fixed (equal cards, pay line moved to the eyebrow, floor map readable) |
| 4 slide 6 soft frames, head crop | partly fixed (headroom restored, thinner overlay; frames still soft) |
| 5 slide 9 words | fixed in layout (3rd card now a 3.8x comparison); 37 words |
| 6 slide 12 words/spacing | not fixed (36 words, pill close to last label) |
| 7 empty lower halves | not fixed (2, 3, 7, 13) |
| 8 tight three-line footers | fixed (footers now two lines on 7-9) |
| 9 remote font @import | not fixed |

## Open issues

| # | severity | slide | issue | screenshot | fix |
|---|---|---|---|---|---|
| 1 | medium | 8 | 47 visible words (headline, three rows with labels, long assumption pill). | 1920/slide-08.png | Drop the Bay Area row or shorten the pill; labels to one word. |
| 2 | medium | 10 | 45 visible words; the right "Spottr" panel is a five-line wrapped paragraph that competes with the chart. | 1920/slide-10.png | Reduce the panel to one short line or remove it. |
| 3 | minor | 4 | Both screenshots have a white inner margin on the left/right inside the card (gym card shows blank bands each side of the grid), so cards look under-filled. | 1920/slide-04.png | Crop images tight to their content. |
| 4 | minor | 6 | Frames still soft; the first frame's "P2 squat x0" overlay label is garbled at the top edge. | 1920/slide-06.png | Crop the label out or use sharper frames. |
| 5 | minor | 3 | Slide is now a single number and one line; lower half empty (like 2, 7, 13). | 1920/slide-03.png | Accept for the draft or centre vertically. |
| 6 | minor | 9, 12 | 37 and 36 words (limit 35); slide 12 pill hugs the last milestone label. | 1920/slide-09.png | Trim captions; move the pill into the footer. |
| 7 | minor | all | Remote Google Fonts @import, no local fallback. | styles.css | Self-host Inter. |

Counts: critical 0, medium 2, minor 5.

## Critique
Weakest three: slide 10 (word-heavy, wrapped side panel), slide 8 (densest, 47 words), slide 6 (soft frames, garbled overlay label).
Next weakest: slide 3 and 13 (top-heavy, thin content). Strongest: slides 2, 9 and 4 (balanced cards, big numbers), 1 and 12 for calm type.
