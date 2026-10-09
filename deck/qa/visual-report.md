# Visual QA report, final (round 3, after commit b325a72)

Re-rendered 13 slides at 1920x1080 and 1280x720 (deck/qa/visual/1920, /1280); slides 1, 4, 5, 6, 9, 12 viewed again in full, the others verified via metrics (deck/qa/visual/metrics.json, qa.mjs) since their markup did not change.

## Verdict
No critical or medium blockers left. Two cosmetic defects on the replay/flow slides (white gaps in the slide 6 filmstrip, stray artefact on slide 5) and an unbalanced slide 4 remain as minor/medium polish items.

Checks: arrow-key nav OK (1,2,3,2,13,13,1,1). PDF: 13 pages = 13 slides, MediaBox 1440x810 pt (16:9), each slide 1080 px tall in print. No "FPS | RTSP ONVIF" text. "Demo data" tag on the slide 4 mock screenshot. Visible words per slide 21-38 (slide 9 = 38 by my count including the card captions; all other slides <=35). All non-TODO text passes AA; body text >=28 px, captions/pills 22 px. Nothing outside the 1920x1080 frame (slide 1 blob intentional). Accent green: one highlight per slide (slide 5 has one green-outlined pill, slide 6 none).

## Previous issues

| # | status | note |
|---|---|---|
| R1 #1-#14 | fixed (as in round 2) | timeline margins, contrast, words, crowd footage, curve, bars, counter etc. |
| R1 #15 empty lower halves (s2, 3, 7, 13) | not fixed | content still sits in the upper half, 40-50% empty above the TODO pill |
| R1 #16 Google Fonts @import | not fixed | still remote font import, no local fallback files |
| R2 #17 slide 4 unbalanced | partly fixed | single large member card now, but the "The gym pays; members use it." line still floats at top right with nothing under it, and the gym card was dropped |
| R2 #18 slide 6 small proof | fixed | large 3-frame hero with skeleton overlays, Real/Simulated text beside it |
| R2 #19 slide 5 empty middle card | fixed | rep counter and set chip now fill the card; one green pill only |
| R2 #20 slide 11 thin cards | not fixed | expected until roles are filled |
| R2 #21 slide 1 wave abrupt end | fixed | wave fades out |
| R2 #22 slide 12 spacing / pill | fixed | timeline moved up, pill under it |

## Open issues (final)

| # | severity | slide | issue | screenshot | fix |
|---|---|---|---|---|---|
| 1 | medium | 6 | The 3-frame filmstrip has two white vertical gaps between frames inside the rounded card; reads as a rendering bug. The middle frame shows a garbled green overlay label above the pixelated head and a stray red block at the top edge; frames are very soft (upscaled, low-res). | 1920/slide-06.png | Use a card background that matches (or tight gap), crop out the label/red edge, or use sharper frames. |
| 2 | medium | 4 | The line "The gym pays; members use it." floats top-right of the card with no anchor, leaving the right third empty; the "Demo data" pill sits ~10 px above the TODO pill (cramped). | 1920/slide-04.png | Make it a left-aligned subline under the headline or a side caption aligned with the card top; add space above the TODO. |
| 3 | minor | 5 | Rep-counter crop has a pinkish blurred background and a tiny stray sliver left of the restart icon (x~795); first image is a soft upscale. | 1920/slide-05.png | Re-crop the counter without the stray edge and over a neutral background. |
| 4 | minor | 9 | Headline plus three captions give 38 visible words (limit 35). | 1920/slide-09.png | Shorten card captions (e.g. "$399, one box"). |
| 5 | minor | 2, 3, 7, 13 | Lower half empty, TODO pill is the heaviest element at the bottom. | 1920/slide-13.png | Vertically centre content or accept for the draft. |
| 6 | minor | all | Fonts via remote @import; offline render falls back to system sans. | styles.css | Self-host Inter woff2. |
| 7 | minor | 11 | Martin and Gard cards nearly empty (content pending). | 1920/slide-11.png | Fill when roles are confirmed. |

Counts: critical 0, medium 2, minor 5.

## Critique (3 weakest slides)
1. Slide 6: the proof slide now has the right size, but the white gaps, soft frames and garbled overlay label undercut it.
2. Slide 4: one card plus an orphan line; the gym side of the "gym pays" story has no visual.
3. Slide 5: much better, but image quality is soft and the rep-counter crop looks pasted in; slides 2/3/7/13 stay top-heavy.
Strongest: slides 2, 9, 10 (big numbers, clean cards, clean 2x2); 1 and 12 are now tidy.
