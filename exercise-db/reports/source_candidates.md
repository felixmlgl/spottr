# Source candidates: exercise-to-muscle data

Scouted on 2026-10-15

Scope: openly licensed datasets that map exercises to muscles, beyond the two fixed sources
(1) free-exercise-db and (2) wger. Nothing was ingested. Only data files (JSON/CSV/YAML/TTL) were
downloaded, and only to count records and estimate overlap. No images or videos were downloaded.

**How overlap was estimated.** Names were normalized (lower case, punctuation stripped,
plural/abbreviation folding, tokens sorted, "Exercise – Equipment" reordered to
"Equipment Exercise"). They were then compared against free-exercise-db `dist/exercises.json`
(876 names) and wger's English names (872, from the `translations.json` fixture in
wger-project/wger, see note B). The scores use rapidfuzz `token_sort_ratio`. Buckets:
exact, near (>= 90), ambiguous (80-89 or a token subset), likely new (< 80). "Est. new" counts
all of "likely new" plus a sampled share of "ambiguous" (20 ambiguous names were checked by hand
per candidate). Treat these numbers as rough ranges.

## NEEDS USER DECISION

### A. Fixed source 1 (free-exercise-db) appears to be derived from bodybuilding.com

**Status (main agent):** not ingested, per the hard rule; listed under `excluded_sources` in
`config.yaml`. Its adapter is kept, its raw data is not committed. Waiting for your decision.

This is not one of the candidates, but it affects the hard rule "scraped from a commercial site
→ must not be ingested". Evidence:

- free-exercise-db's README credits wrkout/exercises.json as "the original dataset"
  (https://github.com/yuhonas/free-exercise-db, "Special Thanks"). wrkout/exercises.json has 873
  exercise folders. 846 of them match free-exercise-db ids exactly, and the other 27 differ only
  in punctuation (e.g. `Farmer's_Walk` vs `Farmers_Walk`).
- wrkout's CONTRIBUTING.md says: "Currently all exercises have two images, these have been
  scrapped off the internet" (https://github.com/wrkout/exercises.json/blob/master/CONTRIBUTING.md).
  Issue #305 reports that a reverse image search points to bodybuilding.com
  (https://github.com/wrkout/exercises.json/issues/305).
- **Instructions are copied word for word.** The bodybuilding.com "Drag Curl" page, as archived
  by the Wayback Machine (https://web.archive.org/web/20190818093818/https://www.bodybuilding.com/exercises/drag-curl),
  has the same instruction text as free-exercise-db's `Drag_Curl` record. The page metadata also
  matches free-exercise-db: Type Strength, Main Muscle Biceps, Equipment Barbell.
- **Names and muscle labels match bodybuilding.com.** 559 of 876 free-exercise-db names match a
  title in the Kaggle "megaGym" dataset character for character (niharika41298/gym-exercise-data,
  2,918 rows, read through the HF mirror `juliadollis/gym_exercise_data_translated`). For 556 of
  those 559, the primary muscle equals megaGym's `BodyPart`. megaGym copies bodybuilding.com's
  rating widget: its Drag Curl rating, 8.5, is the value on the archived page. free-exercise-db
  uses the same 17-group muscle vocabulary as bodybuilding.com ("middle back", "lats",
  "abductors", …). Two other projects describe the same data as coming from bodybuilding.com:
  the Kaggle dataset ambarishdeb/gym-exercises-dataset ("data pulled from bodybuilding.com") and
  bearbob/exerciseDB (commit 5d64497 "Initial commit with exercises from bodybuilding.com").
- **Decision needed:** (a) keep free-exercise-db as planned, (b) keep only factual fields (name,
  muscles, equipment, level) and drop the copied `instructions` text, or (c) drop source 1. This
  report does not give legal advice. The instruction text is the clearest problem.

### B. wger's robots.txt disallows the API path that the wger adapter is told to use

`https://wger.de/robots.txt` contains `User-Agent: *` / `Disallow: /api/v2`. The hard rules say to
respect robots.txt. I made two requests to `/api/v2/` before I noticed this (`exerciseinfo/?limit=1`
for the count, and one status check), then stopped using the API.

The same data is available without the API: the fixtures in the wger GitHub repo,
`wger/exercises/fixtures/exercise-base-data.json` (872 exercises) and `translations.json`
(2,429 translations, 872 English). They carry the per-record `license` and `license_author`
fields. The repo's code is AGPL-3.0, but each exercise record has its own CC licence.
**Decision needed:** use the API anyway (it is official and public), switch to the fixtures, or
ask wger.

**Resolved (main agent):** the wger adapter uses the fixtures, downloaded from the official
repository and pinned to a commit (`sources/wger/raw/SNAPSHOT.json`). That is an official download
and respects robots.txt; the API is not used.

No candidate has a genuinely ambiguous licence and more than 200 new exercises. RepDB (643
exercises) has a clear licence, but that licence is outside the accepted list (see its section).

## Summary

| # | Candidate | License (verified) | Provenance | Records | Muscle granularity | Est. new exercises | Recommendation |
|---|---|---|---|---|---|---|---|
| 1 | [longhaul-fitness/exercises](https://github.com/longhaul-fitness/exercises) | MIT (LICENSE) | Original. Written by the maintainer; an LLM agent in the repo has drafted steps and muscles since commit 8627fb5. No signs of scraping or copying | 349 strength + 46 flexibility + 9 cardio (no muscles) | 21 semi-specific regions (front/side/rear delt, rotator cuff front/back, forearm inner/outer, thigh inner/outer, …); primary + secondary | ~170 (range 80–270) | **INGEST, rank 1** |
| 2 | [everkinetic/data](https://github.com/everkinetic/data) | CC-BY-SA-4.0 (LICENSE.md) | Open-data project based on everkinetic.com (Greg Priday). wger already uses Everkinetic images | 293 | Group level, 35 raw labels including typos ("gluts", "bicpes"); one primary + secondary | ~30–50 | Do not ingest (little new coverage) |
| 3 | [rthepen/workout-database](https://github.com/rthepen/workout-database) | MIT (LICENSE) | 244 records copy free-exercise-db text (so bodybuilding.com lineage). Origin of the rest is undocumented. Muscle tags are often implausible | 1,015 | 25 labels, mixed (gluteus_maximus, deltoids, "cardiovascular_system"); primary + secondary | ~300–400 | Do not ingest (mixed provenance, poor muscle quality) |
| 4 | [rfivesix/OpenExerciseDB](https://github.com/rfivesix/OpenExerciseDB) | Data CC-BY-SA-4.0, code MIT (LICENSE.md) | Fork of wger. 100% of muscle tags are AI-generated (Gemini), 0 reviewed | 868 active | 51 values down to heads (delt_anterior, triceps_long_head, …); primary + secondary | 0 | Do not ingest (wger copy; unreviewed LLM muscles) |
| 5 | [johnarleyburns/free-exercise-db-plusplus](https://github.com/johnarleyburns/free-exercise-db-plusplus) | Unlicense (LICENSE) | Annotation layer over free-exercise-db. Muscle roles come from movement-pattern rules | 927 (873 = free-exercise-db) | Group level; direct / indirect / stabilizer | ~15–50 | Do not ingest (derivative; adds rules, not new data) |
| 6 | [RepDB/exercise-dataset](https://github.com/RepDB/exercise-dataset) | Custom "RepDB Free Tier License v1.0" (LICENSE-DATA.md), not an accepted licence | Claims to be original | 643 | 31 specific muscles; primary + secondary; EN/DE/ES | ~200–250 | Do not ingest (licence not accepted; derived datasets may not be redistributed) |
| 7 | [Glowupp-app/open-exercisedb](https://github.com/Glowupp-app/open-exercisedb) | MIT (LICENSE) | Company content ("inspired by Glowupp fitness content"); single upload; marketing/LLM-style text | 322 | 62 inconsistent labels plus P/S/T intensity per group | ~100–150 | Do not ingest (inconsistent muscle labels, vague equipment) |
| 8 | [exercemus/exercises](https://github.com/exercemus/exercises) | MIT (LICENSE), per-record licences from wger | Copy of exercises.json + wger | 872 | Group level | ~0–6 | Do not ingest (copy of sources 1–2) |
| 9 | [wrkout/exercises.json](https://github.com/wrkout/exercises.json) | Unlicense (LICENSE.md) | Upstream of free-exercise-db; bodybuilding.com (see A) | 873 | Group level | 0 | Do not ingest (same data as source 1) |
| 10 | Wikidata (P6884 "target muscle") | CC0 | Community | 4 statements on 3 items | Specific | ~0 | Do not ingest (almost no data) |
| 11 | [astashov/liftosaur](https://github.com/astashov/liftosaur) | AGPL-3.0 | ExRx-style target/synergist muscle naming | ~218 | Specific muscles and heads; target + synergist | n/a | Do not ingest (licence not accepted) |
| 12 | [Dieterbe/body.build](https://github.com/Dieterbe/body.build) | AGPL-3.0 | Own model plus third-party ratings (Jeff Nippard, Menno Henselmans) | ~100s, in Dart code | Muscle heads per joint action | n/a | Do not ingest (licence not accepted) |
| 13 | [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (+ forks) | MIT label | ExerciseDB v1 (AscendAPI), confirmed by the maintainer in issue #5 | 1,324 | Target + secondary | n/a | Do not ingest (commercial origin) |
| 14 | Kaggle [niharika41298/gym-exercise-data](https://www.kaggle.com/datasets/niharika41298/gym-exercise-data) ("megaGym") | CC0 label | bodybuilding.com scrape (see A) | 2,918 | 17 groups (BodyPart) | n/a | Do not ingest (commercial origin) |

At most 3 could be recommended. Only longhaul-fitness passes every hard rule and adds meaningful
coverage.

---

## 1. longhaul-fitness/exercises: INGEST (rank 1)

- **URL / download:** https://github.com/longhaul-fitness/exercises. Pin commit
  `2c77d52a8c412eb2e8614e2d2f4f2f6edcea2b42`. Files:
  `https://raw.githubusercontent.com/longhaul-fitness/exercises/<sha>/strength.json`,
  `…/flexibility.json`, `…/cardio.json`.
- **Licence (verified):** read in `LICENSE` at the repo root: "MIT License" / "Copyright (c) 2023
  Longhaul Fitness". The README badge also says MIT. The data files have no separate data
  licence, so MIT covers the whole repo. MIT is a software licence but is on the accepted list.
  **Attribution required:** keep the copyright line and the MIT permission notice with copies or
  substantial portions, e.g. in a THIRD_PARTY_NOTICES file shipped with `dist/`. Suggested credit:
  "Exercise data from longhaul-fitness/exercises, Copyright (c) 2023 Longhaul Fitness, MIT
  License."
- **Provenance:** maintainer-curated (Bill Amberg / wamberg). There are about 330 commits, most of
  them "Add strength exercise: …" one at a time. Commit 8627fb5 ("Create AI agent to help
  classify strength and flexibility exercises.") added `agent/`, which uses LLMs to draft steps
  and muscle lists (`agent/README.md`: "This project uses LLMs to detail exercises … steps to
  complete, and activated muscles"). 40 of the 209 "Add …" commits come after the agent; the
  origin of the earlier entries is not documented. Checks against copying:
  - 46 of 1,847 long step sentences are near-identical to free-exercise-db (bodybuilding.com)
    text, all of them generic ("Pause for a moment, then slowly return…").
  - 40 of 349 names equal a megaGym/bodybuilding.com title, all common names (Pull-Up, …).
  - 15% of names match ExerciseDB v1, the same baseline as any common-name list.
  - A web search for a distinctive step sentence found no source.
  - Open PR #4 (26 exercises from a contributor) is not merged.
- **Records and fields:** `strength.json` has 349 records, `flexibility.json` 46, `cardio.json` 9
  (cardio has no muscles). Fields: `pk` (uuid), `name` (format "Variation Exercise – Equipment"),
  `slug`, `primaryMuscles` (on every record), `secondaryMuscles` (on 289 + 27 records), `steps`
  (about 6.7 per exercise), `notes`. There is no separate equipment field: equipment has to be
  parsed from the name suffix.
- **Muscle granularity:** 21 labels: chest, lat, trap, lower back, glute, quad, hamstring, calf,
  abdominal, oblique, bicep, tricep, `shoulder - front|side|back` (anterior, lateral, posterior
  deltoid), `rotator cuff - front|back`, `forearm - inner|outer` (flexors, extensors),
  `thigh - inner|outer` (adductors, abductors). That is finer than free-exercise-db for shoulders,
  rotator cuff, forearms and hips. Roles are primary and secondary; there are no stabilizers.
- **Plausibility check:** Bench Press – Barbell: P chest + front delt, S triceps. Lateral Raise:
  P side delt. Face Pull: P rotator cuff back + trap + rear delt. Pull-Up: P lat, S biceps,
  forearm, rotator cuff, rear delt. All plausible. Squat lists "lower back" as primary, which is
  debatable.
- **Overlap:** of 395 unique names (strength + flexibility), 103 are exact and 24 near matches
  with sources 1–2, 187 are ambiguous and 81 are clearly new. The clearly new ones are mostly
  mobility, band, ring, BOSU and kettlebell variants. In the hand-checked sample, about half of
  the ambiguous names were genuinely different variants (e.g. "Bottoms Up Seesaw Overhead Press –
  Kettlebell", "Feet-Elevated Bulgarian Row – Ring"). **Est. new: about 170 (range 80–270).**
- **Recommendation:** ingest. It is clean (MIT, original) and adds variants plus split
  delt/rotator-cuff/forearm data. Map "shoulder - front" to anterior deltoid and so on in
  `taxonomy/muscle_aliases.yaml`. Record the LLM involvement in `source.yaml`.

## 2. everkinetic/data: do not ingest (low marginal value)

- **URL:** https://github.com/everkinetic/data (`exercises.json`, HEAD `446bb9a`).
- **Licence (verified):** `LICENSE.md` starts "## creative commons" / "# Attribution-ShareAlike 4.0
  International". The GitHub API reports CC-BY-SA-4.0. This is ShareAlike, the same obligation
  class as wger.
- **Provenance:** README: "Open data project based on http://everkinetic.com created by Greg
  Priday." Everkinetic images were CC-BY-SA 3.0 and were reused by wger and Open Training. Text is
  not copied: 3 of 1,022 long steps are near-identical to free-exercise-db, and 17 to wger
  descriptions (generic phrasing). No commercial-scrape evidence.
- **Records / fields:** 293 records: `id`, `name`, `title`, `primer`, `type`, `primary` (single
  string), `secondary[]`, `equipment[]`, `steps[]`, image URLs (not downloaded).
- **Muscles:** group level, 35 raw labels with typos and combined strings ("gluts", "bicpes",
  "forerm", "shoulders, lats").
- **Overlap:** 289 unique names: 124 exact, 34 near, 119 ambiguous (mostly naming variants such as
  "Lateral Dumbbell Raises"), 12 clearly new. **Est. new: about 30–50.**
- **Reason:** clean, but adds little: about 40 exercises with noisy group-level muscles, largely
  already covered by wger.

## 3. rthepen/workout-database: do not ingest

- **URL:** https://github.com/rthepen/workout-database (`dist/all_exercises.json`, HEAD `ee61c50`).
- **Licence (verified):** `LICENSE`: "MIT License" / "Copyright (c) 2026 rthepen & Open-Source
  Workout Database Contributors".
- **Provenance:** started from free-exercise-db: `workoutdatabase oud/free-exercise-db.json`, and
  the root `exercises.json` uses the free-exercise-db schema. 244 of 1,015 records contain
  instruction sentences near-identical (ratio >= 85) to free-exercise-db text, i.e. bodybuilding.com
  text (see A). 265 names equal megaGym/bodybuilding.com titles. The other records have no
  documented source: a Dutch candidate list (`oefeningen_overzicht.txt`) and Google Sheet syncs,
  with text that reads as machine-translated or LLM-written. The project is about two months old
  and has 2 stars.
- **Records / fields:** 1,015 records: `exercise_name{en,nl}`, `aliases`, `material`, `category`,
  `target_muscles{primary,secondary}`, `attributes`, `instructions{en,nl}`, `form_cues`,
  `relations`, YouTube `media`.
- **Muscles:** 25 labels, mixing specific muscles (gluteus_maximus, rhomboids, erector_spinae,
  anterior_deltoid) with groups (hamstrings, quadriceps, calves, deltoids) and
  "cardiovascular_system". Many tags are implausible: "Face Pulls" has primary latissimus_dorsi +
  rhomboids (a copy of the Pull-Ups template); "Dumbbell Lateral Raise" has primary
  anterior_deltoid with secondary triceps + rectus abdominis; "Kettlebell Pullover" has primary
  rectus_abdominis + cardiovascular_system.
- **Overlap:** 988 unique: 449 exact, 24 near, 297 ambiguous, 218 clearly new (agility drills,
  partner, TRX, sandbag, kickboxing). **Est. new: about 300–400.**
- **Reason:** part of it derives from the bodybuilding.com lineage, the rest has no documented
  origin, and the muscle tags are unreliable.

## 4. rfivesix/OpenExerciseDB: do not ingest

- **URL:** https://github.com/rfivesix/OpenExerciseDB (HEAD `427269a`). YAML per exercise in
  `data/exercises/`, plus a SQLite release (not downloaded).
- **Licence (verified):** `LICENSE.md`: "## Data — CC BY-SA 4.0 … Everything under `data/`,
  `vocab/` … is licensed under the Creative Commons Attribution-ShareAlike 4.0 International
  License" and "## Code — MIT". Upstream records keep their wger licences (720 CC-BY-SA-4.0, 127
  CC-BY-SA-3.0, 21 CC0).
- **Provenance:** "This database began as a fork of the exercise data from the wger project …
  only data obtained through its public API." Per-field provenance shows that the muscles of all
  868 active records are `source: ai` (Gemini 3.8 Flash for 818, Gemini 3.7 Flash for 50), with no
  `reviewed_by` on any of them.
- **Muscles:** 51 values in use from a 69-term hierarchy (group → muscle → head); primary +
  secondary, no stabilizers.
- **Overlap:** the same exercises as wger, so 0 new.
- **Reason:** no new exercises, and the "better" muscle data is unreviewed LLM output. It could
  serve as a secondary cross-check later, not as evidence.

## 5. johnarleyburns/free-exercise-db-plusplus: do not ingest

- **URL:** https://github.com/johnarleyburns/free-exercise-db-plusplus
  (`free-exercise-db-plusplus.json`, HEAD `0a666fc`).
- **Licence (verified):** `LICENSE`: "This is free and unencumbered software released into the
  public domain." (Unlicense; GitHub shows NOASSERTION because the text is slightly reflowed).
- **Provenance:** "an evidence-audited annotation layer over yuhonas/free-exercise-db". Each of the
  927 records embeds the free-exercise-db source record (873 ids identical). The annotations are
  derived from movement-pattern rules: every `evidenceRef` is `pattern:*`, none cite literature
  per exercise. Barbell bench press has no stabilizers. Built with an AI coding agent (CLAUDE.md).
  54 extra records (cable/machine variants) have no stated source.
- **Muscles:** same group vocabulary as free-exercise-db, with `direct` / `indirect` /
  `stabilizers` roles (stabilizers on 368 records).
- **Reason:** derivative of source 1, inherits its provenance problem, and its roles are
  rule-generated rather than observed.

## 6. RepDB/exercise-dataset: do not ingest (licence not accepted)

- **URL:** https://github.com/RepDB/exercise-dataset (`exercises.json`, HEAD `d86f961`; also on
  Kaggle as sergeiargutin/exercise-dataset).
- **Licence (verified):** `LICENSE-DATA.md` "RepDB — Free Tier License (v1.0)". Term 2 requires a
  visible link "Exercise data by RepDB (repdb.co)". Term 3: "You may not republish, resell, or
  repackage the dataset — or a modified or derived dataset — as a dataset, dataset repository, or
  API. In-app use only." The file also asserts a sui generis database right (§§ 87a ff. UrhG).
  The code (`LICENSE-CODE`) is MIT; the data is not.
- **Provenance:** "compiled independently by RepDB"; images are AI-generated. No scraping evidence
  found (16% ExerciseDB name match, the baseline).
- **Records / muscles:** 643 records with 31 specific muscles (gluteus_medius,
  anterior/lateral/posterior deltoid, serratus_anterior, …), primary + secondary, EN/DE/ES names.
- **Overlap:** 229 exact, 26 near, 274 ambiguous, 114 clearly new. **Est. new: about 200–250.**
- **Reason:** the licence is not on the accepted list, and term 3 conflicts with publishing
  `dist/exercises.json` / `seed.sql` as a merged dataset. Using it would be a separate commercial
  licensing decision.

## 7. Glowupp-app/open-exercisedb: do not ingest

- **URL:** https://github.com/Glowupp-app/open-exercisedb (`exercises.json`).
- **Licence (verified):** `LICENSE`: "MIT License" / "Copyright (c) 2026 Glowupp-app".
- **Provenance:** README: "Originally inspired by Glowupp fitness content." The data came in one
  upload with no history, and the descriptions read like marketing or LLM copy ("An excellent
  choice for a sculpted waist…"). 22% of names match ExerciseDB, the baseline, so there is no
  scraping evidence.
- **Records / muscles:** 322 records with `primary_muscle`, `secondary_muscles` and a
  `muscle_intensity` map (P/S/T 1–9 per group). There are 62 inconsistent labels ("Abs / Core",
  "Abs  /  Core", "Legs – Quads", "Quadriceps", "Other", "Cardio"), and equipment is coarse
  ("bodyweight", "weights").
- **Overlap:** 63 exact, 29 near, 185 ambiguous, 42 clearly new. **Est. new: about 100–150.**
- **Reason:** muscle and equipment data are too inconsistent to map reliably, and the content
  origin is unclear.

## 8–9. exercemus/exercises and wrkout/exercises.json: do not ingest

- **exercemus/exercises:** `LICENSE` "MIT License / Copyright (c) 2022 exercemus". The README
  says "The initial list was created from wger.de and exercises.json". 872 records; 863 names are
  exact matches with sources 1–2 and 0–6 are new. The per-record `license` field is null for 871
  records, so the wger licences were dropped. Copy of sources 1–2.
- **wrkout/exercises.json:** `LICENSE.md` is the Unlicense ("This is free and unencumbered
  software released into the public domain."). 873 `exercises/*/exercise.json`, the upstream of
  free-exercise-db (846 identical ids, 27 that differ only in punctuation). Its images are
  admittedly scraped; for the text, see A.

## 10. Wikidata: do not ingest

- **Property:** P6884 "target muscle" ("muscle that is targeted in a physical exercise").
- **SPARQL (query.wikidata.org):** only **4 statements on 3 items** in all of Wikidata (press-up:
  pectoralis major + triceps; handstand push-up: triceps; one lexeme). Searching the physical-
  exercise class tree (Q219067, about 2,392 items; weight training exercise Q50320205: 84 items;
  bodyweight exercise Q450743: 349 items) for any property pointing to an item with an FMA ID
  finds only P6884 (2), P12913 (5) and P1269 (1).
- **Licence:** CC0. It is useful at most for a few German labels (16 of the 84 weight-training
  items have one), not for muscle mappings.

## 11–12. Liftosaur and body.build: do not ingest (AGPL-3.0)

- **astashov/liftosaur:** licence AGPL-3.0 (GitHub API; repo LICENSE). `src/models/exercise.ts`
  has about 218 exercise ids with `targetMuscles` / `synergistMuscles` using specific names
  ("Pectoralis Major Sternal Head", "Deltoid Anterior", "Adductor Magnus"). The target/synergist
  naming follows ExRx conventions, but no source is stated (only issue #181, "Chest Press lists
  wrong muscles"). AGPL is not on the accepted list.
- **Dieterbe/body.build:** licence AGPL-3.0 (`LICENSE`). Exercises are defined in Dart
  (`lib/data/dataset/ex.dart`, `muscle_*.dart`), with muscle heads per articulation and range of
  motion, plus third-party program ratings (`rating_jn.dart`, `rating_mh.dart`). This is the
  richest muscle model found, but AGPL is not accepted. Worth asking the author for a data
  licence if detailed muscle-head data becomes a priority.

## 13–14. Commercial-origin datasets: do not ingest

- **hasaneyldrm/exercises-dataset** (22.9k stars, MIT label, 1,324 exercises): issue #5
  (https://github.com/hasaneyldrm/exercises-dataset/issues/5) shows that the media IDs resolve
  byte-for-byte on `static.exercisedb.dev`. The maintainer confirmed: "the media and base exercise
  data are indeed from ExerciseDB v1." The same applies to its forks and repackages:
  plataformafitness/exercises-library (same LICENSE/NOTICE files), YaKohen/exercises-dataset
  (1,324 records), wangmuerxiao/exercises-dataset-zh ("Forked from hasaneyldrm/exercises-dataset"),
  shahanbutt/exercises-dataset and ozansozuozgit/flow-exercise-dataset (1,324 records each).
  harshvishu/free-exercise-db-with-videos uses ExerciseDB ids such as "0489" and the
  `bodyPart`/`target`/"leverage machine" schema. Kaggle omarxadel/fitness-exercises-dataset is the
  upstream that the maintainer named. Judging by count and media alone (not verified record by
  record), mohamedatef90/exercise-library (1,112 GIF exercises), JahelCuadrado/ExerciseGymGifsDB
  (1,300+ GIFs) and warpirate/GetFitPro (1,300+ exercises) are probably the same data.
- **Kaggle megaGym (niharika41298/gym-exercise-data, CC0 label):** the Kaggle description says
  "the data is raw and scraped from various internet sources". The bodybuilding.com evidence is in
  section A.

---

## Searched, nothing usable

- **ExerciseDB / AscendAPI** (ExerciseDB/exercisedb-api, Kaggle exercisedb/fitness-exercises-dataset,
  exercisedb-pro/exercisedb-dataset, megprith "Vital Animations"): commercial. The "open source"
  link resolves to an AGPL repo containing only a README; the data sits behind ToS and paid plans.
- **Kaggle gym datasets:** ambarishdeb/gym-exercises-dataset ("data pulled from bodybuilding.com").
  akankshamishra0512/exercises-dataset and nitinr00/all-muscle-training-exercises-dataset
  ("collected using the ExerciseDB API via RapidAPI"). adnanelouardi/600k-fitness… ("scraped from
  fitness planning platform data"). willianoliveiragibin/gym-exercises (6 KB) and
  rishitmurarka/gym-exercises-dataset (Unknown licence): tiny, no stated source.
  peshimaammuzammil (852 bytes) and prajwaldongre "best 50": trivial.
- **workout.cool** (Snouzy/workout-cool, MIT code): only a 3-exercise `data/sample-exercises.csv`
  is public. Its predecessor **workout.lol** (MIT code, data as a BSON dump) got videos and
  instructions under a MuscleWiki agreement that has since ended (issue #64).
- **Derivatives of source 1:** kinetic-place/exercises-db and exercises-json (873/899 names
  identical to free-exercise-db; credits wrkout), makeneto/free-exercise-db,
  ArelliGoutham/exercise-database (merge of free-exercise-db + RepDB + wrkout),
  bachcuda-hue/repatlas-workout-tracker, gengyueworks/gym-exercise-guide, Rippy1911/anatome, and
  HF sirnino/bodybuilding-exercises (873 records identical to free-exercise-db, relabelled
  Apache-2.0).
- **Derivatives of wger:** EnjoyingFOSS/feeel (AGPL code; `exercisebaseinfo.json` from wger) and
  zohar-ui/open-exercise-db (CC-BY-SA, schema only, no data yet).
- **ExRx / MuscleWiki / other scrapes:** flaviostutz/exrx-loader (ExRx scraper),
  deboradum/GymVis ("scraped from ExRx"), birdlabs-sg/fitbirdCore (files named after ExRx list
  pages ArmWt/BackWt…, no licence), mugoosse/workout-utils (Muscle & Motion scraper),
  buidlcat/workout-lol-ext (MuscleWiki links).
- **No or unusable licence:** davejt/exercise (no licence), Stronger-Fox/exercises (ISC +
  proprietary non-compete clause), chaosbastler/opentraining-exercises (66 XML exercises; only
  the Everkinetic images carry a licence), TomNedow/exerciseDB, andre-fong/Amplio,
  mini-infrastructure/mini-workout-logger, sammydowds/cyber-split (no licence),
  gellyfish-ai/gymbells-exercises (non-commercial), jaysan0330/musclemap-sample (44-exercise sample
  of a paid product), LiamMorrow/LiftLog (AGPL).
- **Too small or low value:** MattiasHenders/gainSON (MIT, 10 exercises).
  MichLadd/MuscleExerciseOntology (MIT TTL, a university project with about 30 individuals).
  DataDaoDe/rb-fitness_ontology (no licence). HF RafaelJaime/calisthenics_exercises (CC0, 104
  calisthenics moves, group-level muscles, no provenance). HF Martjn/calisthenics_exercises
  (Apache-2.0, 170 LLM-generated entries linking to exercisedb/musclewiki media). HF
  webbrain-one/gym-exercises (videos, "other" licence). HF onurSakar/GYM-Exercise (Q&A text, not
  exercises).
- **Academic:** Zenodo, figshare and OSF searches ("exercise muscles dataset", "resistance training
  muscle activation database", "exercise ontology muscle") found only single-exercise sEMG studies
  (e.g. HipBridgeEMG, Nordic hamstring) and no exercise-to-muscle catalogue. The Ontology of
  Physical Exercises (BioPortal OPE) is an alpha release last uploaded in 2013; its BioPortal page
  returned 403 and the download needs an API key, so it was not checked in depth. The LiFT
  ontology (Coladangelo, NKOS 2022) has no public data release. OpenStax Anatomy & Physiology
  (CC-BY) has muscle actions but no exercise mappings; useful for the muscle taxonomy only.
- **Wikidata:** see section 10 (4 P6884 statements).
