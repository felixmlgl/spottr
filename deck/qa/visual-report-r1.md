# Visual QA report: Spottr deck draft

Scope: deck/site/index.html rendered at 1920x1080 and 1280x720 (deck/qa/visual/1920, /1280), every PNG viewed. Metrics script: deck/qa/visual/qa.mjs, output deck/qa/visual/metrics.json.

## Verdict
Structurally sound and on-brief in tone (calm, light, hairlines, one idea per slide), but not ready to send. One brief conflict (crowd footage on slide 6), one real layout overflow (slide 12 timeline), systematic AA contrast failures (grey labels, green text), five slides over 35 words, and several screenshots that are unreadable at presentation size. The deck reads more "clean template" than "ElevenLabs"; see critique.

Checks that pass: arrow-key nav (Right/Down/Space/Left/Home/End, clamped at both ends; sequence 1,2,3,2,13,13,1,1); PDF has 13 pages = 13 slides, MediaBox 1440x810 pt (= 1920x1080 px, 16:9), print CSS gives each slide exactly 1080 px height with page breaks, and page 1 renders cleanly (deck/qa/visual/pdf-page1.png); no text or box outside the 1920x1080 frame except slide 12 and the slide 10 axis label; no "FPS"/"RTSP ONVIF" text on any slide (no overlay label visible in the replay image); "Demo data" tag present on every mock-data screenshot (slides 4 and 6); no overlap between content, TODO block and source footer; accent green at most one highlight per slide (see minor note on slide 8). Not verified: PDF pages 2-13 were not rasterised (no PDF rasteriser available, Chrome launch hung); page count, size and print layout were checked via the media-box and print-mode element heights instead.

## Issues

| # | severity | slide | issue | screenshot | fix |
|---|---|---|---|---|---|
| 1 | critical | 12 | Timeline labels leave the 120 px margin: "Mac mini benchmark" starts at x~83 and its date pill at x~93; "Accuracy and retention read-out" ends at x~1837 (right margin is 1800). Reads as misaligned vs. every other slide. | 1920/slide-12.png | Inset the timeline (first milestone at left>=60, last label right-aligned or width <=200) so all text stays within 120..1800. |
| 2 | medium | 6 | Replay frame shows a gym floor with multiple other people (pixelated but full bodies and clothing visible). Brief says no bystander/crowd footage; pixelation is real but the slide's TODO on lifter consent is also still open. | 1920/slide-06.png | Crop tightly to the lifter, or use a frame without bystanders; resolve the consent TODO before external use. |
| 3 | medium | all | Contrast fails WCAG AA: label/page number/source/col-title grey #9a9a96 on #fafaf8 = 2.7:1 (needs 4.5:1); the same grey is used for the slide 10 axis labels and slide 9 "−" and "=". TODO text #a86400 on #fff6e0 = 4.35:1 (just under). | 1920/slide-02.png | Darken --text-3 to about #6f6f6a (>=4.5:1); darken --todo-ink to about #8f5400. |
| 4 | medium | 2, 7, 8, 9, 12 | Accent green text #34C759 on the off-white background is 2.12:1 (fails even the 3:1 large-text bar), e.g. "23 vs 16", "17 of 17", "~6,400 · $30.5M", "44.6%", "$300k". | 1920/slide-02.png, 1920/slide-09.png | Use a darker green for text (#1b7f3a as already used for the Spottr dot and tag), keep #34C759 for fills/lines only. |
| 5 | medium | 5, 7, 9, 12, 13 (also 3, 10, 11) | Visible word count over 35 (excluding TODO, source, labels): s5=42, s7=48, s9=50, s12=44, s13=43; s3=36, s10=39, s11=39. | metrics.json | Cut: s9 drop the two boxes or the 3-line headline; s7 merge "Built" list to 3 lines; s5 delete the "Today: bystanders..." line (it is in the footer) or shorten; s12 drop "Use of funds" or "Next" line; s13 shorten column text. |
| 6 | medium | 4, 6 | Screenshots are unreadable at presentation size (UI text ~8-10 px effective), and the gym dashboard crop is cut mid-chart on both slides (axis labels and bars sliced), looking accidental. The same gyms-overview image is used on slides 4 and 6. | 1920/slide-04.png, 1920/slide-06.png | Crop to the four KPI tiles plus one complete chart, scale up, or zoom to a single legible element; use a different member-app crop on slide 6 or drop the duplicate. |
| 7 | medium | 4, 5, 7, 9, 10, 11, 13 | Body-weight text below the 28 px floor: 26 px (col-titles, .box on s9, .person .sub on s11, "Today: bystanders..." on s5), 24 px step numbers (s5), 18 px "[TODO: date]" pills (s12). Captions/sources at 20-22 px are legible but at the minimum. | metrics.json | Raise those to >=28 px (col-title may stay uppercase label at 26 if intentional); date pills to 20 px. |
| 8 | medium | 3 | Grey rising curve beside "81M" has no axis or data. It looks like a growth chart that is not backed by any number (honesty risk with skeptical investors). | 1920/slide-03.png | Remove it, or replace with a real series from 03_market.md, or label it "illustrative". |
| 9 | minor | 8 | Bars mix units (club count vs dollars) and are not to scale: California/Bay Area bar is 3% though $4.2M is ~14% of $30.5M. Footer says "indicative", but the visual still implies proportion. Green appears on both number and bar (one highlight, two elements). | 1920/slide-08.png | Drop the bars or scale each to its real ratio; keep green on the number only. |
| 10 | minor | 9 | Headline wraps to three lines with orphan "case."; "Estimate"/"Illustrative" notes at 20 px grey are hard to see. | 1920/slide-09.png | Shorten headline to two lines (e.g. drop "in our central case" into the footer). |
| 11 | minor | 10 | Vertical axis label sits at x~50-76, outside the content margin; matrix right edge ends at 1680 not 1800; empty bottom-right quadrant. Axis text is low contrast (see #3). | 1920/slide-10.png | Move the axis label inside the 120 px margin, widen matrix to 1800. |
| 12 | minor | 4, 6 | Right-hand image cards end at x~1688 (s4) and ~1720 (s6), not on the 1800 right margin, so rows do not align with the page-number/hairline edge or with cards on s5/s11 (which end at 1800). | 1920/slide-04.png, 1920/slide-06.png | Make the two cards flex to fill 120..1800. |
| 13 | minor | all | Decorative second page counter at bottom-right (13 px, #aaa) duplicates the top-right "n / 13"; it is hidden in print but visible on screen and in the PNGs. | 1920/slide-01.png | Remove #counter or the .pageno. |
| 14 | minor | 1 | Brand name appears twice at top (small "Spottr" header and the large serif logo); the serif wordmark clashes with the Inter-only system. Green wave runs edge to edge into the blob, slightly busy. | 1920/slide-01.png | Drop the header brand on the title slide; keep wave but shorten or lighten. |
| 15 | minor | 2, 7, 13 | Lower 40-50% of the slide is empty with a TODO pill at the bottom; TODO blocks (dashed amber) are the loudest element on s11 and s12, outweighing content. | 1920/slide-07.png, 1920/slide-13.png | Vertically centre the content block, or enlarge the content; merge multiple TODO pills into a single tidy list. |
| 16 | minor | all | Fonts are loaded via CSS @import from Google Fonts; offline (or blocked) renders and the PDF export fall back to system sans and may reflow. | styles.css | Self-host Inter (woff2) in deck/site/assets or confirm the export machine is online. |

Counts: critical 1, medium 8, minor 7.

## Critique against "ElevenLabs style, plain and minimal"

What works: off-white canvas, near-black Inter at light weights, tight negative tracking on full-sentence headlines, hairline top rule and column dividers, soft-shadow white cards, a single pastel blob and one green wave. Whitespace is generous and nothing is clip-art. Restraint with colour is good.

Where it looks generic or template-y:
- Every slide is the same skeleton: small caps label, two-line 56 px headline, content block below. With 13 slides of identical rhythm it feels like a theme, not a point of view. ElevenLabs-style decks lean on a few huge moments (one giant word or number, one full-bleed product image) and break the template.
- Only two decorations exist (blob, wave) and both live on slide 1; slides 2-13 have zero visual identity beyond type. The deck is calm but arguably empty on 2, 7, 11, 13.
- Product visuals are the weak spot: small, low-resolution-feeling dashboard crops, repeated twice, cut mid-chart. The best asset (real replay with skeleton) is shrunk to a card with a busy crowded background. This is the pitch's strongest proof and is under-used.
- Slide 5's stick figure and sine wave look like placeholder clip-art, exactly what the brief forbids, and sit beside a genuine frame, which makes the contrast awkward.
- Amber dashed TODO boxes dominate several slides (11, 12 especially). Expected in a draft, but they will mask the design when judging.
- Slides 8-9 are the most "dashboard-like": stacked rows with bars, equation plus pills; slightly dense for the brief.

Strongest slides: 1 (title: big headline, logo, single wave, lots of air), 2 (three big numbers with hairline dividers, clear hierarchy, only fix the green contrast), 12 (big headline with the one green highlight and a clean timeline once margins are fixed), 13 (pure type, very on-brief).
Weakest slides: 4 (two small unreadable screenshots, cut off), 6 (crowded footage plus duplicate dashboard), 5 (clip-art figures, over word count), 10 (matrix feels like a consulting 2x2, misaligned axis label), 9 (50 words, three-line headline, pills).

Suggested direction: give slide 6 the full-width hero (cropped replay with skeleton and rep counter, 1500 px wide) and drop the dashboard; give slide 4 one clean crop per column at larger scale; let slides 2/3/9 have one giant number each; keep TODOs but in a single consistent corner stack.
