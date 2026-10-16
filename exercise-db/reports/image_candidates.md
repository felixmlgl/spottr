# Image candidates: start and end position images

Scouted on 2026-10-15

Scope: openly licensed images for our exercises, ideally one in the start position and one in the
end position. This was research only: nothing was ingested or committed. Only metadata was downloaded
(git trees, JSON listings, Commons API listings, one OCR text). Each candidate got at most 5 sample
images (listed in its section).

**The exercise list changed during scouting.** The brief named 971 exercises. While I worked,
`dist/exercises.json` was rebuilt with free-exercise-db included, and it now has **1,726 exercises**.
870 of them carry free-exercise-db start/end images, which are disputed. All numbers below use that
build. **"Core"** means the 983 exercises with at least one source other than free-exercise-db (wger,
longhaul-fitness, spottr-pipeline). That is the original 971 plus a few new wger records. "Pipeline"
means the 48 exercise ids that `taxonomy/pipeline_labels.yaml` points to.

**How matching was done.** Names were normalized with the repo's own `NameRules`
(`taxonomy/name_rules.yaml`), with two changes: equipment tokens were kept, because a dumbbell picture
must not illustrate a barbell exercise, and "dead lift", "flyes" and "bicep" were folded. Tokens were
sorted, and all English aliases were tried. A match counts if it is **exact**, or if the rapidfuzz
`token_sort_ratio` is ≥ 90 with no conflicting equipment. wger ids were linked directly where wger
uses an Everkinetic drawing. Precision, checked by hand: 40 random exact or id matches were about
95% correct, and the 35 fuzzy matches were 19 of 35 correct. There are another ~200 fuzzy candidates
at 80–89 that were not counted; a manual pass could add an estimated 30–60 matches.

## NEEDS USER DECISION

**Status (main agent):** Everkinetic is ingested from GitHub (everkinetic/data, pinned commit), not via the
Commons API, whose path `/w/` robots.txt disallows for crawlers. The AI-generated CC0 set is not ingested (user
decision 2026-10-16). wger images and the Army photos are not used.

1. **AI-generated CC0 set ([hitmanrepo/open-exercise-illustrations](https://github.com/hitmanrepo/open-exercise-illustrations)).**
   This is the only large clean-licensed set with explicit `start`/`end` files. It would more than
   double coverage (core start+end goes from 152 to 344). The images are AI-generated with an
   unnamed model. The maintainer is anonymous, the repo was published in a single commit, and the
   README warns that grip, cable path and machine details can be wrong. The images use a dark studio
   background. **Decide:** accept AI-generated illustrations (as a fallback after Everkinetic, with
   a review pass), or not.
2. **Wikimedia Commons API vs. robots.txt.** `commons.wikimedia.org/robots.txt` has
   `User-agent: *` / `Disallow: /w/`, which covers `/w/api.php` (only `action=mobileview` is
   allowed). The brief named this API explicitly, and it is Wikimedia's documented channel for
   programmatic access (API etiquette: descriptive User-Agent, serial requests, `maxlag`). So I used
   it: about 200 metadata requests, one every 2.5 s, with a descriptive User-Agent. I also downloaded
   4 sample files from `upload.wikimedia.org`, which robots.txt allows. **Decide** how the ingest
   should get per-file metadata: (a) the API, the same way (recommended; ~600 files, ~15 requests in
   batches of 50); or (b) the file description pages `/wiki/File:…` (allowed for "friendly, low-speed
   bots") plus `upload.wikimedia.org`.
3. **wger images have no allowed channel.** `https://wger.de/robots.txt` disallows `/api/v2`. The HTML
   exercise pages are behind an Anubis anti-bot proof-of-work page; I made one request to
   `/en/exercise/192/view`, got the challenge, and did not try to solve it. The repo fixtures contain
   no image records. Provenance is mixed anyway (see §2.4). **Recommendation:** do not ingest wger
   images. If you want them, ask the wger maintainers for permission to use the API or for a media
   dump.
4. **ShareAlike.** The recommended source, Everkinetic, is CC BY-SA. Unmodified images in the app
   only need attribution per image. Any adapted image must stay CC BY-SA: recoloured to the accent
   colour, cropped, or combined into a start/end composite. This does not extend to the app code.
   **Confirm** this is acceptable.
5. **Army FM 7-22 photos** are public domain, but they show identifiable soldiers in "ARMY" PT
   uniform. Using them in a commercial app raises personality-rights and implied-endorsement
   questions. **Recommendation:** skip, unless you want them for a handful of bodyweight drills.

## 1. Summary

The "Matches" column counts our exercises as start+end / any. Core is the 983, which corresponds to
the brief's 971; All is the 1,726.

| # | Candidate | License (verified) | Provenance | Exercises with start+end | Exercises with ≥ 1 image | Matches, core | Matches, all | Format & typical size | Recommendation |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Everkinetic on Wikimedia Commons** (`Category:Weight training diagrams`) | CC BY-SA 3.0 on 922 of 923 Everkinetic files, read per file (`File:Cable-upright-rows-2.png` is tagged CC BY 3.0). Matches the archived everkinetic.com/license page | Original drawings by Everkinetic (everkinetic.com, Greg Priday), who published them openly. 557 files list `db.everkinetic.com` as source, 363 list `everkinetic.com` | 272 drawings as SVG pairs (`… 1.svg`/`… 2.svg`), plus 157 raster pairs (mostly the same drawings) | 279 SVG + ~200 raster | Everkinetic union (rows 1+2): **152 / 152** | Everkinetic union (rows 1+2): **283 / 283** (249 high confidence) | SVG, viewBox ~800–1200 px, 7–21 KB (558 SVG = 7.5 MB); old PNG/GIF 221–1024 px | **Use, rank 1** (primary channel) |
| 2 | **[everkinetic/data](https://github.com/everkinetic/data)** (GitHub) | CC BY-SA 4.0 (`LICENSE.md`), an adaptation of Everkinetic's CC BY-SA 3.0 originals | Same drawings, collected by Frank Paczynski. No scraping signs | 269 (`NNNN-relaxation` / `NNNN-tension`), plus 252 slugs in `src/images-web` (`slug-1/-2.png`) | 270 | (merged into row 1) | (merged into row 1) | dist: traced SVG ~20 KB, grayscale PNG ~950×860 px, ~40 KB; images-web PNG median ~220 KB | **Use as fallback** for the ~30 drawings that have no Commons SVG |
| 3 | **[hitmanrepo/open-exercise-illustrations](https://github.com/hitmanrepo/open-exercise-illustrations)** | CC0 1.0 (`LICENSE` read) | AI-generated, model not named; anonymous author, one commit | 359 (+ 11 start/mid/end) | 415 (45 single "hold") | 299 / 311 | 372 / 391 | WebP 768×1024 typical, ~25 KB, dark background; 796 files = 23 MB | **Needs decision**; if accepted, rank 2 (fallback) |
| 4 | **wger exercise images** | Per image: CC BY-SA 3 (88) / CC BY-SA 4 (286) | Mixed: 88 Everkinetic, 180 user uploads, 49 without author, 43 flagged AI, 14 that link to commercial sources | 35 clean Everkinetic pairs; otherwise no start/end metadata | 273 of 871 wger exercises | Only via Everkinetic | Only via Everkinetic | PNG/JPG/WebP, mixed | **Do not ingest** (no allowed channel, mixed provenance). Use wger ids only to link to Everkinetic drawings |
| 5 | **US Army FM 7-22** (2012 edition) | Public domain (US federal work; "Approved for public release; distribution is unlimited") | Official Army photos; no third-party credits found in the OCR text | ~100 exercise figures as "Starting Position / Count 1–4" strips | ~100 | 22 / 22 (8 not covered by Everkinetic, 1 not covered by Everkinetic or the AI set) | 24 / 24 | One 23.9 MB PDF of grayscale photo strips; needs cropping | **Skip** (low gain, personality rights) |
| 6 | **[bryllim/workout-guide](https://github.com/bryllim/workout-guide)** | Assets CC BY-SA 4.0 (`LICENSE-ASSETS`), code MIT | Only 76 first frames are traced to Everkinetic. The other ~830 frames are by "Bryl Lim" and the method is undisclosed. One sampled frame redraws an Everkinetic pose without credit | 302 (3 frames each) | 302 | ~204 (exact) | ~237 (exact) | SVG 512×512, white on transparent, 18–47 KB | **Not recommended** (unclear provenance) |
| 7 | **Other Commons photos, animations and videos** | Per file: PD / CC BY / CC BY-SA | Community uploads | ~0 standardized pairs | scattered | — | — | JPEG photos, GIF, WebM | Manual cherry-picking only |

## 2. Candidates

### 2.1 Everkinetic on Wikimedia Commons (recommended, primary)

- **Channel.** List the files with the Commons API:
  `action=query&generator=categorymembers&gcmtitle=Category:Weight_training_diagrams&gcmtype=file&gcmlimit=50&prop=imageinfo&iiprop=url|size|mime|sha1|extmetadata`.
  Get the originals from `upload.wikimedia.org/wikipedia/commons/…`, which robots.txt allows. For the
  API vs. robots.txt question, see decision 2. The category holds 933 files, 923 of them by
  Everkinetic: 558 SVG, 241 PNG, 123 GIF, 1 JPEG. A few more Everkinetic files sit in other
  categories (1,089 search hits for "Everkinetic"); they are worth one more category sweep at ingest.
- **License and attribution.** Each file page has `{{Information |Author=Everkinetic |Source=http://db.everkinetic.com/exercise/<slug>/}}`
  (or `http://everkinetic.com/`) and `{{cc-by-sa-3.0}}`. I checked this against the archived
  `everkinetic.com/license` page. It puts the images under an attribution/share-alike Creative
  Commons license, links to CC BY-SA 3.0, and asks for credit with a link back to Everkinetic.
  Per-image credit to store: *"<File title>" by Everkinetic (everkinetic.com), CC BY-SA 3.0,
  https://creativecommons.org/licenses/by-sa/3.0/, via Wikimedia Commons, <file page URL>*. If the
  image is modified, add "modified by Spottr: <what>". The existing `exercise_images` columns
  (`license`, `author`, `source_url`) fit this; add a license URL and a changes note.
- **Start vs. end.** Files are numbered `1`/`2` and have no position metadata. The numbering is not
  consistent. In the samples, `Bench press 1` shows the bar on the chest and `2` the arms extended,
  while `Barbell dead lifts 1` is standing and `2` is bent over. So each pair needs a manual
  assignment. A default can come from our `movement_pattern`: squat, press and push exercises start
  in the top position; pull, curl, raise and hinge-from-floor exercises start in the bottom
  position. Then do a visual check, roughly 300 pairs at 1–2 h. As a partial cross-check,
  [SalvadorRomeroB/zekt-exercise-illustrations](https://github.com/SalvadorRomeroB/zekt-exercise-illustrations)
  already splits 108 Everkinetic drawings into `-start`/`-end` (CC BY-SA 4.0).
- **Mapping.** File titles are exercise slugs: "Seated cable rows 1.svg", "Bench press dumbbell 2.svg".
  For our exercises with a wger id, wger's own Everkinetic uploads (`Bench-press-1.png`, …) name the
  drawing directly. That gives 29 id-based links, 13 of which name matching misses, for example
  "Leg Press on Hackenschmidt Machine" → narrow-stance hack squats. I took these links from a
  third-party copy of the wger API (`rfivesix/OpenExerciseDB` `snapshot/wger-*.json.gz`, CC BY-SA)
  and used them only for counting and mapping.
- **Quality (4 samples: Bench press 1/2, Barbell dead lifts 1/2).** Clean black line art on white,
  one consistent male figure, three-quarter view. It fits a light UI. The vectors are crisp and small
  (13–21 KB). No backgrounds and no text.
- **Size.** 558 SVG = 7.5 MB. The older PNG/GIF copies add 20.7 MB, but are only needed where no SVG
  exists.

### 2.2 everkinetic/data on GitHub (recommended as fallback)

- **Channel.** Official GitHub repository. Use `raw.githubusercontent.com/everkinetic/data/<commit>/dist/...`,
  or a tarball pinned to `446bb9a` (HEAD of `main`). `raw.githubusercontent.com` has no robots.txt
  (404). The whole repo is ~257 MB. Only `dist/svg` (537 files, 10.4 MB), `dist/png` (541 files,
  22.5 MB) and optionally `src/images-web` (511 files, 111 MB) are needed. `dist/exercises.json`
  (289 records) has `id`, `name`, `title`, `svg[]`, `png[]`.
- **License.** `LICENSE.md` is the full CC BY-SA 4.0 text, and the GitHub API reports CC-BY-SA-4.0.
  README: "Open data project based on http://everkinetic.com created by Greg Priday". BY-SA 3.0
  allows adaptations under a later BY-SA version, so the traced SVGs can be 4.0.
  Credit: *Everkinetic (everkinetic.com), via everkinetic/data (github.com/everkinetic/data),
  CC BY-SA 4.0*.
- **Contents.** `src/images-ai` (336 files) are renders of Adobe Illustrator (`.ai`) source files
  (`NNNN-F.ai.png` / `-S.ai.png`), not AI-generated images. `src/images-web` are the website
  images (`<slug>-1.png`/`-2.png`; 246 pairs, 5 triples, 1 with four frames). 19 dist records have
  no images.
- **Start vs. end.** `relaxation`/`tension` describes muscle state, not order. In the samples,
  bench-press `tension` = arms extended (the start), squat `tension` = standing (the start), and for
  curls `relaxation` = start. This needs the same per-exercise rule plus review as §2.1.
- **Mapping.** By `name`/`title`. 235 of the 252 `images-web` slugs equal dist names. 24 drawings
  exist only on GitHub, mostly curl and lunge variants named "bicep…", plus leg press, barbell squat
  and dumbbell lunges.
- **Quality (5 samples: 0042-relaxation.png/.svg, 0042-tension.png, 0122-relaxation.png, 0122-tension.png).**
  The PNGs are 8-bit grayscale at 947–996 px wide. The SVGs are auto-traced (filled paths with a
  white background rect, 268×275 pt). `0122-relaxation` (squat, bottom position) is cropped at the
  thighs. Prefer the Commons SVGs where both exist.

### 2.3 hitmanrepo/open-exercise-illustrations (AI-generated, CC0; needs decision)

**Decision (2026-10-16): not ingested.** Spottr will fill image gaps with its own images later.

- **Channel.** Official GitHub repo: `exercises.json`, `exercises.csv`, `images/<id>/{start,end,mid,hold}.webp`.
  796 files, 23.2 MB.
- **License.** `LICENSE` is the CC0 1.0 Universal legal code, and the GitHub API reports CC0-1.0. No
  attribution is required; a credit line is optional. The README says the images are
  AI-generated and not reviewed by a coach. The model is not named. The account was created
  this year and has 6 public repos, and the set was published in a single commit. I found no evidence
  of copying from commercial sites. Copyright in purely AI-generated images is doubtful in the US,
  which is consistent with CC0.
- **Start vs. end.** Explicit filenames: `start.webp`, `end.webp`, `mid.webp` (11 three-step moves)
  and `hold.webp` (45 holds and stretches). These map directly to `exercise_images.position`.
- **Mapping.** `id`, `name` and `aliases[]`. Many aliases are wger names ("Shoulder Press, Dumbbells",
  "Squats on Multipress", "Skullcrusher SZ-bar"), so 352 of 391 matches are exact. There are also 44
  alternate names that reuse another exercise's images.
- **Quality (4 samples: bench-press start/end, squat start/end).** A consistent faceless pale-grey
  mannequin on a dark charcoal studio background, side view. The squat frames are clear. In the bench
  press frames the figure is small in a very wide frame. Sizes vary (768×1024, 1024×768, 1536×1024,
  886×886). The dark backgrounds clash with the light UI and would need a dark card or background
  removal (which would be fine under CC0).

### 2.4 wger exercise images (do not ingest)

- **Channel.** None allowed. robots.txt disallows `/api/v2`, which is used by `exerciseinfo`,
  `exerciseimage`, and wger's own `download-exercise-images` command (`wger/exercises/sync.py`).
  HTML pages are behind the Anubis anti-bot challenge, so I did not try them. The repo fixtures
  (`wger/exercises/fixtures/`) contain only a 3-record `test-exercise-images.json`;
  `wger-project/data` holds nutrition data only. `/media/exercise-images/...` is not disallowed, but
  without a listing there is nothing to map.
- **Per-image metadata.** I read this from a third-party copy of the API (`rfivesix/OpenExerciseDB`
  snapshot) and used it only for counting. Fields: `license` (1 = CC-BY-SA 3, 2 = CC-BY-SA 4),
  `license_author`, `license_title`, `license_object_url`, `license_derivative_source_url`,
  `is_main`, `style` (1 line, 2 3D, 4 photo, 5 other), `is_ai_generated`. There is **no start/end
  field**. Order is `-is_main, id`. Two images are a start/end pair only for the Everkinetic
  `-1/-2` uploads, and even there `-2` is sometimes `is_main`.
- **Counts.** 871 exercises, 374 images. 273 exercises have ≥ 1 image and 71 have ≥ 2; 35
  exercises' images are all clean Everkinetic pairs. On our side, 653 exercises carry a wger id: 211
  of them have a wger image, 68 have ≥ 2, and 43 have an Everkinetic pair.
- **Provenance problems.**
  - 43 images are flagged AI-generated.
  - 49 images have no author, and some of those carry only a title.
  - 14 images link to commercial sources as their origin: fitnessvolt.com, menshealth.com, a Google
    Images search, workoutguru.fit (author "Workout Guru"), training.fit, docteur-fitness.com,
    simplyfitness.com, lyfta.app, an NHS trust PDF, and one credited to "Athlean-X".
  - The 180 user uploads (mostly photos) cannot be verified one by one.
  - The only clean part, the 88 Everkinetic images, comes from §2.1/§2.2 directly.

### 2.5 US Army FM 7-22, Army Physical Readiness Training (2012 edition; skip)

- **Channel.** The official site `armypubs.army.mil` has `robots.txt: User-agent: * / Disallow: /`,
  so it allows no automated download. I fetched its robots.txt and, in the same command, one HEAD
  request to a PDF URL, which returned a 1.2 KB HTML page. Nothing else was requested. Either the user
  downloads it manually, or it can come from the Internet Archive item
  `fm-7-22-army-physical-readiness-training-2012` (Public Domain Mark; archive.org robots.txt allows
  `/download`; PDF 23.9 MB). I read only the OCR text (`_djvu.txt`) and one page image (leaf 308).
- **License.** A US federal government work, so public domain (17 U.S.C. §105). The cover reads
  "DISTRIBUTION RESTRICTION: Approved for public release; distribution is unlimited." The OCR text has
  no "courtesy", "©" or permission notes. Because the photos show identifiable soldiers, see
  decision 5.
- **Start vs. end.** Each figure is a strip labelled "Starting Position", "Count 1", … "Count 4".
  Start = "Starting Position", end = "Count 1" (for 4-count drills). This requires cropping panels
  out of the PDF.
- **Contents.** About 100 exercise figures: machine reconditioning exercises (leg press, leg curl,
  chest press, seated row, lat pull-down, lateral raise, triceps extension, biceps curl), the
  preparation and conditioning drills, climbing drills (pull-up, leg tuck) and the strength training
  circuit (sumo squat, straight-leg dead lift, bent-over row with kettlebells, supine chest press,
  overhead push press). The newer ATP 7-22.02 could not be checked (see §4).
- **Quality (1 sample: page 9-65, Figure 9-42 bent-over row).** Grayscale studio photos, about
  170×330 px per panel at 1224 px page width, with an "ARMY" T-shirt.

### 2.6 bryllim/workout-guide (not recommended)

- **Channel.** GitHub, `packages/workout-guide/{assets,manifest.json}`: 906 SVG + 906 PNG.
- **License.** Assets are CC BY-SA 4.0 (`LICENSE-ASSETS`: copyright Bryl Lim, except where
  `ATTRIBUTION.md` names an upstream source). Code is MIT.
- **Provenance.** The manifest credits Everkinetic only for 76 first frames (e.g. bench-press frame 1
  = `dist/svg/0042-tension.svg`, "rasterized … recolored … vector-traced"). The other 226 first
  frames and all 604 second and third frames are credited to Bryl Lim. Commit `d0ff73d` ("docs:
  clarify artwork provenance") reworded the credit. The earlier README said the catalog was imported
  from an adjacent "Kabi" source repository. How the frames were made is not stated.
- **Samples.** I checked 5: bench-press frames 1–3 and hip-thrust frames 1 and 3. Bench-press frame 3
  closely redraws Everkinetic's `0042-relaxation` without an Everkinetic credit, and frame 2 has a
  different line weight and perspective. Hip thrust, which Everkinetic never drew, is in the
  Everkinetic style. These signs point to generated derivatives with an incomplete attribution
  chain.
- **Coverage.** About 237 exact matches (204 core). The frames are 1 → 2 → 3 with no start/end
  labels.

### 2.7 Other Wikimedia Commons material (manual picks only)

I walked `Category:Weight training exercises` and `Category:Bodyweight exercises` to depth 2: 98
categories and 2,336 files (1,881 JPEG, 81 WebM). Licenses: 1,026 PD (largely US military photos),
946 CC BY-SA, 272 CC BY, 40 CC0. These are event, competition and PT photos with no standard view,
and I found no systematic start/end pairs: of 34 name-based pairs, most are unrelated.

There are small series from which frames could be extracted:

- FitnessScape: 13 demonstration videos, CC BY 3.0 (bench press, bent-over row, deadlift, squat,
  pull-ups, shoulder press, 45° leg press, T-bar row, …).
- Taco Fleur: 34 kettlebell videos, CC BY-SA 4.0.
- Wensceslao: 10 bodyweight GIF animations, CC BY-SA 4.0 (burpees, high knees, jumping jacks, jump
  rope, leg raises, push-ups, sit-ups, skier jacks, squats, toe touches).
- `Category:Tecknat Rörelser`: 12 back-exercise GIFs, CC BY 3.0.

`Category:Exercise diagrams` (18 files) and the Videoplasty cartoons (21 SVG, not
exercise-specific) are not useful.

## 3. Coverage if the recommended candidates are ingested

| Scenario | All 1,726: start+end / one / none | Core 983: start+end / one / none | free-exercise-db images replaceable (of 870) | Pipeline (48): start+end |
|---|---|---|---|---|
| **A. Everkinetic (Commons + GitHub), recommended** | **283 / 0 / 1,443** | **152 / 0 / 831** | 212 | **35** |
| B. A + AI CC0 set (decision 1) | 524 / 14 / 1,188 | 344 / 8 / 631 | 297 | 44 |
| C. B + FM 7-22 | 526 / 14 / 1,186 | 345 / 8 / 630 | 298 | 44 |

- All Everkinetic matches come as pairs, so "one image only" arises only from the AI set's 45 holds.
- Scenario A includes 34 fuzzy matches at about 55% precision, so expect **~265** correct after
  review. The ~200 fuzzy candidates at 80–89 could add 30–60 (est. **295–325** of 1,726, about
  **150–180** of the core 983).
- AI-set matches are 90% exact.
- 255 exercises (200 core) would be covered by the AI set alone.

**Pipeline exercises.** "Approx." means the drawing is a close variant.

| Pipeline exercise id | Everkinetic drawing | AI CC0 set | FM 7-22 | Note |
|---|---|---|---|---|
| barbell-bench-press | bench-press | bench-press |  |  |
| barbell-bent-over-rowing | barbell-rear-delt-row (via wger id) | bent-over-row | Bent-over row | approx.: rear-delt row drawing, which wger uses for this exercise |
| barbell-biceps-curl | biceps-curls-with-barbell | barbell-curl |  |  |
| barbell-deadlift | barbell-dead-lifts | deadlift |  |  |
| barbell-hip-thrust | none | hip-thrusts |  |  |
| barbell-incline-bench-press | incline-bench-press | incline-bench-press |  |  |
| barbell-lunge | barbell-lunges | barbell-lunge |  |  |
| barbell-romanian-deadlift | romanian-dead-lift | romanian-deadlift |  |  |
| barbell-shoulder-press | barbell-shoulder-press | overhead-press | Overhead press |  |
| barbell-shrug | barbell-shrugs | shrugs |  |  |
| barbell-squat | barbell-squat | squat |  |  |
| barbell-standing-calf-raise | standing-barbell-calf-raise | none |  |  |
| barbell-triceps-extension | none | none |  |  |
| cable-crunch | none | cable-crunch |  | Everkinetic has only a seated cable crunch |
| cable-fly | flat-bench-cable-flys | cable-crossover |  | Everkinetic: flat-bench cable fly, not a standing crossover |
| cable-rear-delt-fly | none | none |  | approx.: Everkinetic bent-over-cable-lateral-raises |
| cable-seated-row | seated-cable-rows | seated-cable-row | Seated row |  |
| cable-standing-biceps-curl | standing-biceps-curl-with-cable (manual) | cable-curl |  |  |
| cable-tricep-pushdown | triceps-pushdown-with-rope-and-cable | tricep-pushdowns | Triceps extension |  |
| cable-wide-grip-lat-pulldown | wide-grip-lat-pull-down | lat-pulldown | Lat pull-down | Everkinetic drawing is on Commons (SVG) and in GitHub `src/images-web`, not in GitHub `dist/` |
| crunch | crunches | crunches |  |  |
| dip-triceps-version | tricep-dips | dips |  |  |
| dumbbell-bench-press | bench-press-dumbbell | dumbbell-chest-press |  |  |
| dumbbell-bent-over-two-row | none | none |  | approx.: Everkinetic rear-deltoid-row-dumbbell |
| dumbbell-biceps-curl | biceps-curl-with-dumbbell | biceps-curl | Biceps curl |  |
| dumbbell-fly | dumbbell-flys | dumbbell-fly |  |  |
| dumbbell-hip-thrust | none | dumbbell-hip-thrust |  |  |
| dumbbell-incline-bench-press | dumbbell-incline-bench-press | incline-dumbbell-press |  |  |
| dumbbell-lateral-raise | dumbbell-lateral-raises | lateral-raises | Lateral raise |  |
| dumbbell-lunge | dumbbell-lunges | dumbbell-lunge |  |  |
| dumbbell-reverse-fly | none | rear-delt-fly |  | approx.: Everkinetic bent-over-rear-deltoid-raise-with-head-on-bench |
| dumbbell-romanian-deadlift | none (barbell drawing only) | dumbbell-romanian-deadlift |  |  |
| dumbbell-shoulder-press | dumbbell-shoulder-press | dumbbell-shoulder-press |  |  |
| dumbbell-shrug | dumbbell-shrugs | dumbbell-shrug |  |  |
| dumbbell-triceps-extension | none | none |  | approx.: Everkinetic lying-triceps-extension-with-dumbbells or one-arm-triceps-extension, depending on the intended variant |
| machine-butterfly | butterfly-machine | pec-deck |  |  |
| machine-crunch | none | machine-abdominal-crunch |  |  |
| machine-leg-extension | leg-extensions | leg-extension |  |  |
| machine-leg-press | leg-press | leg-press | Leg press |  |
| machine-leverage-shoulder-press | shoulder-press-machine | shoulder-press-machine |  |  |
| machine-lying-leg-curl | lying-leg-curl-machine | leg-curl | Leg curl |  |
| machine-reverse-fly | none | reverse-pec-deck |  |  |
| machine-seated-row | none | machine-row |  |  |
| machine-side-lateral-raise | none | machine-lateral-raise |  |  |
| machine-standing-calf-raise | calf-raises | calf-raises |  | check that the Everkinetic drawing uses a machine |
| pull-up | pull-ups | pull-up | Pull-up |  |
| push-up | push-ups | push-up | Push-up |  |
| smith-machine-squat | smith-machine-squats | smith-machine-squat |  |  |

**Missing with Everkinetic only (13 of 48):**

- barbell-hip-thrust, dumbbell-hip-thrust
- barbell-triceps-extension, dumbbell-triceps-extension
- cable-crunch, machine-crunch
- cable-rear-delt-fly, dumbbell-reverse-fly, machine-reverse-fly
- dumbbell-bent-over-two-row
- dumbbell-romanian-deadlift
- machine-seated-row
- machine-side-lateral-raise

With the AI set, 4 remain: barbell-triceps-extension, dumbbell-triceps-extension,
cable-rear-delt-fly and dumbbell-bent-over-two-row. These are the ones to commission or draw
(e.g. in the Everkinetic style, as CC BY-SA adaptations) if every pipeline label must have
images.

## 4. Searched, nothing usable

- **Already rejected per brief.** Not re-checked: free-exercise-db and wrkout/exercises.json images
  (bodybuilding.com), MuscleWiki, ExerciseDB/RapidAPI GIFs, bodybuilding.com, JEFIT, ExRx, Strength
  Level.
- **[februarysea/workout-motion](https://github.com/februarysea/workout-motion)** (92 procedural SVG
  animations). Licensed under PolyForm Noncommercial 1.0.0 (`LICENSE`), with a separate commercial
  license.
- **[ozansozuozgit/flow-exercise-dataset](https://github.com/ozansozuozgit/flow-exercise-dataset)**
  (1,257 three-frame SVG sets, art CC0). The records derive from hasaneyldrm/exercises-dataset
  (1,324 records, 4-digit ids, `bodyPart`/`target` fields), which matches the ExerciseDB structure.
  The art was made with OpenAI image generation; 1,244 of 1,257 prompts were not retained, and
  references were not recorded (`NOTICE.md`). This is ExerciseDB lineage with unverifiable art.
- **hasaneyldrm/exercises-dataset.** ExerciseDB-style records. Its media (GIFs) are excluded from
  its own license.
- **[AlexMollard/Open-Exercise-Art](https://github.com/AlexMollard/Open-Exercise-Art)** (562
  images). One still per exercise, so no start/end. Generated with Codex's image tool, using
  Everkinetic and Workout Guide poses "as reference" (`PROVENANCE.md`). Artwork CC BY-SA 4.0,
  tools GPL-3.0.
- **SalvadorRomeroB/zekt-exercise-illustrations.** 108 Everkinetic drawings split into start/end
  (CC BY-SA 4.0). A subset of §2.1; useful only to cross-check the start/end assignment.
- **chaosbastler/opentraining-exercises.** Only Everkinetic images (covered).
- **Feeel** (gitlab.com/enjoyingfoss/feeel, AGPL app). 53 single low-poly WebP images, mostly
  home and bodyweight exercises. Its `exercisebaseinfo.json` is a copy of wger.
- **wger-project repos.** `wger` fixtures have no image records. `data` holds nutrition data only.
  `flutter`, `react` and `mcp-server` read the API.
- **Hugging Face**, searched for "gym exercise", "exercise images", "workout images", "fitness
  exercise":
  - onurSakar/GYM-Exercise: text Q&A.
  - juliadollis/gym_exercise_data_translated: the megaGym table, bodybuilding.com lineage.
  - prithivMLmods/Gym-Exercise-Video-Analysis: labelled Apache-2.0, frames of unknown origin.
  - webbrain-one/gym-exercises: videos under an "other" licence.
  - Cuong2004/gym-exercise-landmarks: landmarks only, no licence.
  - shylee1/...: synthetic tracking data.
- **Kaggle.** Not queried through the API (needs an account). Web search found only the megaGym
  table and a "Workout/Exercise Images" collection of third-party photos with no per-image licence
  or provenance.
- **ATP 7-22.02** (Army H2F drills, the successor to FM 7-22 Part III). Not verified:
  `armypubs.army.mil` robots.txt disallows everything, and the National Guard excerpts on `co.ng.mil`
  returned "Access Denied". It is probably public domain with the same photo-strip format; the user
  could download it manually if wanted.
- **NIA "Workout to Go"** (NIH Pub. 11-4258) and **CDC/Tufts "Growing Stronger"**. Small
  older-adult routines (~10–20 exercises). No rights statement for the illustrations was found, and
  they may be contractor artwork. Not pursued.
- **Navy NOFFS / Marine Corps HITT.** Commons and web search found only newsletters and PDFs that
  mention them, and no official image download. Not pursued.
- **GitHub search** ("exercise illustrations", "workout illustrations", "exercise animations svg",
  "fitness exercise svg"). Beyond the repos above:
  - gellyfish-ai/gymbells-exercises: non-commercial tier.
  - dscherm/gym-mouse: ComfyUI-generated, no licence.
  - Everything else was unrelated.
