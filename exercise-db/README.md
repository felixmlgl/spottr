# Spottr exercise database

Reference data for Spottr: exercises and the muscles each one trains. The vision pipeline maps
recognized exercises to entries here (`exercise_aliases` with `kind = 'pipeline_label'`), and the
app shows muscles trained and volume per muscle group (`exercise_muscles`, view
`exercise_muscle_groups`).

This folder only builds the dataset. It does not touch the app (`src/`) or the vision pipeline
(`backend/`).

## Use

Needs [uv](https://docs.astral.sh/uv/) (it installs Python 3.12 and the dependencies `httpx`,
`rapidfuzz`, `pyyaml` from `uv.lock`).

```bash
cd exercise-db
make fetch      # download raw snapshots (network; <= 1 request/s)
make build      # normalize, merge, export dist/ and reports/
make validate   # all checks; fails on any violation
make load       # load into Postgres / Supabase, only if DATABASE_URL is set
```

`make build` needs no network: the raw snapshots are committed under `sources/<id>/raw/`.

## Outputs

| File | What |
|---|---|
| `dist/exercises.sqlite` | the merged database, schema `schema/schema.sql` |
| `schema/schema.sql` + `dist/seed.sql` | the same for Postgres (Supabase): run the schema once, then the seed (it replaces all rows) |
| `dist/exercises.json` | one object per exercise, muscles grouped by role, plus equipment, aliases, instructions, sources |
| `dist/NOTICE.md` | license notices and attribution that must travel with the data |
| `reports/build_report.md` | counts, licenses and attribution, share-alike obligations, everything skipped and why |
| `reports/review_queue.csv` | possible duplicates waiting for a human decision |
| `reports/source_candidates.md` | other open datasets that were evaluated |

`make build` is deterministic: two runs give byte-identical files (`make validate` checks it).

## Layout

```
config.yaml                 sources to ingest (priority order), excluded sources, licenses, weights, fuzzy bands
schema/schema.sql           the schema (SQLite and Postgres)
taxonomy/
  muscles.yaml              19 muscle groups + specific muscles, English/German/Latin names
  equipment.yaml            canonical equipment, raw aliases per source, name rules
  muscle_aliases.yaml       raw muscle name per source -> muscle id (build fails on unmapped names)
  name_rules.yaml           name normalization: abbreviations, synonyms, plurals, filler, variation words, slugs
  movement_rules.yaml       explicit rules for movement_pattern and laterality
  pipeline_labels.yaml      vision-pipeline labels -> exercise id
  exercise_aliases.yaml     hand-added aliases (abbreviations)
  id_registry.csv           permanent (source, record) -> exercise id mapping
sources/<id>/
  source.yaml               name, url, license, attribution
  fetch.py                  downloads raw/ (+ raw/SNAPSHOT.json with version and retrieval date)
  normalize.py              raw/ -> normalized.jsonl (adapter contract in PLAN.md)
spottr_exdb/                build, merge, export, report, validate, load
```

## Sources

| Source | License | Role |
|---|---|---|
| `wger` | CC BY-SA (per record; some CC0) | exercises, English + German names, muscles, instructions. Read from wger's official data fixtures on GitHub, because wger.de's robots.txt disallows `/api/v2`. |
| `longhaul-fitness` | MIT | exercises, deltoid heads, rotator cuff, forearm flexors/extensors, instructions |
| `spottr-pipeline` | Spottr internal | the vision pipeline's own exercise -> muscle table (`backend/vision/exercises.py`, read-only snapshot). Records are `label:equipment` pairs attached through `taxonomy/pipeline_labels.yaml`; its muscle list is final for those exercises (`authoritative_sources`). |
| `free-exercise-db` | (Unlicense label) | **not ingested**: appears scraped from bodybuilding.com, see `sources/free-exercise-db/PROVENANCE.md`. Adapter kept, raw data not committed. |

## Adding a source

1. Check the license (actual LICENSE file or official license page) and provenance (README, issues,
   history). Not ingestable: unclear licenses, and anything that looks scraped from a commercial site.
2. Create `sources/<id>/` with `source.yaml`, `fetch.py`, `normalize.py` following the contract in
   `PLAN.md` (helpers in `spottr_exdb/adapter.py`).
3. Add `<id>` to `sources` in `config.yaml`, map its raw muscle names, equipment and categories
   (the build lists anything unmapped), then `make fetch build validate`.

No schema change is needed.

## Permanent ids and the review queue

Exercise ids are slugs (`barbell-bench-press`). `taxonomy/id_registry.csv` stores which exercise
every source record belongs to; rebuilds reuse it and only append. Ids are never renamed, even if a
display name changes.

A record whose name is close to an existing exercise but not clearly the same (fuzzy score 85–94,
extra words, or unknown equipment) becomes its own exercise with `needs_review = 1` and a row in
`reports/review_queue.csv`. To resolve it, edit the record's row in `id_registry.csv`:

- same exercise: set `exercise_id` to the `candidate_exercise_id` and `match_method` to `manual`;
- different exercise: keep `exercise_id`, set `match_method` to `manual`.

Then `make build validate`.

## Licensing

See `reports/build_report.md` for the attribution text the app must show and the share-alike
obligations (wger content is CC BY-SA). `source_records.license` and `.author` hold the license and
author of every record.
