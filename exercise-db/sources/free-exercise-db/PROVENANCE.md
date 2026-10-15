# Provenance: free-exercise-db

Snapshot: `yuhonas/free-exercise-db` at `f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5` (2026-09-27), 876 records.
Checked on 2026-10-15. bodybuilding.com, MuscleWiki, ExerciseDB and JEFIT were not visited; the archive.org copies were not opened either.

## Assessment

**Appears scraped from bodybuilding.com** (through `wrkout/exercises.json`). This covers 873 of the 876 records.
The other 3 records (`Kettlebell_Halo`, `Kettlebell_Halo_With_Overhead_Extension`,
`Kettlebell_Overhead_Triceps_Extension`) were contributed in 2026 (PR #28) and have no images.

Both repositories use the Unlicense, but the evidence below indicates that the upstream author did not
write the data himself. A public-domain dedication by someone who doesn't hold the rights does not clear them.

## Chain

1. **bodybuilding.com exercise guides.** Likely the original source; see the evidence below.
2. **`wrkout/exercises.json`**, by Ollie Jennings.
   - The data arrived in one commit, `cb0394de31dbf896311b02d792864d8b34ffaaf3` (2020-08-22, "initial push of open dataset with some scripts").
   - That commit added 873 exercises, each with `exercise.json` and `images/0.jpg`, `images/1.jpg`.
   - The repo has no import or scraper script and no source attribution. Its `scripts/` only builds JSON and SQL from the files.
3. **`yuhonas/free-exercise-db`**, by Clint Plummer.
   - Initial commit `92edeca28a9a35f3b0591a31827509110728468b` (2023-03-30).
   - Its `exercises/` tree hash is `d605f85d35542bc4590b3215e9aa9505138b2a83`. That is the exact same git tree as wrkout's `exercises/` at commits `46b9bc5` to `cffbbc5` (2020-08-23 to 2020-09-18), so it is a byte-identical copy.
   - Later changes:
     - restructuring and IDs (`9e2c758`, `7c9a656` / PR #1)
     - character fixes (PR #10)
     - the 3 new kettlebell records (PR #28, `79ca7b4`)

## Evidence

### The project's own statements

- **free-exercise-db README.** It names wrkout as the source: "I stumbled upon exercises.json … so I restructured the data". Under "Special Thanks" it credits Ollie Jennings "for the original dataset". It says nothing about where wrkout got the data.
- **free-exercise-db issue #2** (https://github.com/yuhonas/free-exercise-db/issues/2). The owner calls the project "a fork/reworking of exercises.json". About the images he writes: "I actually have no idea where the images are from".
- **Upstream issue wrkout#4** (https://github.com/wrkout/exercises.json/issues/4, 2020-08-24). The upstream author, about the exercises themselves (not only the images): "Currently a lot of the exercises do not adopt this naming convention as they were scrapped of the internet."
- **Upstream `CONTRIBUTING.md`**, present since the initial commit `cb0394d`. About the images: "these have been scrapped off the internet". The author adds that he does not own their copyright and advises against commercial use.
- **Upstream issue wrkout#308** (https://github.com/wrkout/exercises.json/issues/308, 2025-07-30, "Inquiry About the Data Source"). It asks where the data came from. It is still open with no reply.

### Evidence pointing to bodybuilding.com

- **Images: reverse image search.** A comment on wrkout#305 (https://github.com/wrkout/exercises.json/issues/305, @Mathnerd314, 2024-06-05) reports that a reverse image search "suggests bodybuildlng.com [sic] as one source". The comment quotes that site's terms of use and concludes the images are "clearly infringing".
- **Images: possibly ExRx.net too.** In free-exercise-db#13 (https://github.com/yuhonas/free-exercise-db/issues/13), a commenter thinks some images come from ExRx.net. Another commenter found that the exercise descriptions do *not* match ExRx. They did not check bodybuilding.com.
- **Field structure.** The original wrkout records had a `mechanicsType` key:
  - all 873 upstream records had it;
  - commit `e8cfa886d3bc95f055495d1a21c76c7f00ae99c7` renamed it to `mechanic` in 837 files, and `b6a5e0fa54cd2578dcff58a0714845bd9c776554` fixed the remaining 36.
  - `Mechanics Type` is the label bodybuilding.com used on its exercise detail pages. A 2015 bodybuilding.com scraper gist (https://gist.github.com/nhomble/0efa413180471a0d5b21) documents those labels: `Type`, `Main Muscle Worked`, `Other Muscles`, `Equipment`, `Mechanics Type`, `Level`, `Force`, plus `Sport` and `Also Known As`.
  - These map one-to-one onto this dataset: `category`, `primaryMuscles`, `secondaryMuscles`, `equipment`, `mechanic`, `level`, `force`.
  - `primaryMuscles` holds exactly one muscle in 875 of 876 records, which matches a single "Main Muscle Worked".
- **Value lists.** The values match what bodybuilding.com's exercise finder offered. This part is from general knowledge, not checked against the site:
  - 7 categories (strength, stretching, plyometrics, powerlifting, olympic weightlifting, strongman, cardio)
  - levels beginner / intermediate / **expert**
  - 17 muscle groups ("middle back", "lower back", "lats", "traps", …)
  - equipment including "body only", "e-z curl bar", "foam roll", "other"
- **Instruction text.** Four distinctive instruction sentences from the dataset were each run as an exact-phrase web search. Only the search engine was used; no result page was opened. In all four, the top hit was the matching bodybuilding.com exercise page. The search summaries also described the same following steps:
  - Barbell Curl, step 1 ("Stand up with your torso upright while holding a barbell…"): `bodybuilding.com/exercises/barbell-curl`
  - Atlas Stones, step 1 ("Begin with the atlas stone between your feet…"): `bodybuilding.com/exercises/atlas-stones`
  - Yoke Walk, step 1 ("The yoke is usually done with a yoke apparatus…"): `bodybuilding.com/exercises/yoke-walk`
  - Child's Pose, step 2 ("Lower your buttocks down to sit on your heels…"): `bodybuilding.com/exercises/childs-pose`
- **House style.** The instructions share one boilerplate, which matches the pages above:
  - 448 of 876 records contain "This will be your starting position".
  - 279 contain "Repeat for the recommended amount of repetitions".
  - 221 contain "Tip:".

### Other notes

- Searches on free-exercise-db issues and PRs found nothing for "bodybuilding", "scrape", "scraped", "takedown" or "DMCA". The only copyright discussions are about the images (#2, #12, #13).
- In 2025 the upstream author added a "Commercial Projects?" section to the README (PR #307, `5994bea`). It points to his paid dataset at wrkout.xyz, which he says he produced himself with 3D software (wrkout#305).
- Both repositories carry the same `LICENSE.md`, git blob `fdddb29a`: the Unlicense.

## What was checked

- Both repositories' READMEs, LICENSE files and CONTRIBUTING.md.
- Full commit history of both, from blobless clones (no images downloaded).
- All issues and PRs of free-exercise-db: 16 issues and 19 PRs, plus keyword searches.
- All non-bot issues and PRs of wrkout/exercises.json, including every comment on #4, #5, #302, #305 and #308.
- One public scraper gist.
- Four exact-phrase web searches.
