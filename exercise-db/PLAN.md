# Plan

Builds the Spottr exercise reference database (exercises + muscles they train) from openly
licensed sources. Lives in `exercise-db/`; it does not touch the app (`src/`) or the vision
pipeline (`backend/`).

1. **Skeleton** (main agent): `pyproject.toml` (uv), `Makefile`, `config.yaml`,
   `schema/schema.sql` (the schema verbatim), shared adapter helpers in `spottr_exdb/adapter.py`.
2. **In parallel** (subagents):
   - `free-exercise-db` adapter: `sources/free-exercise-db/{fetch,normalize}.py`, raw snapshot
     pinned to a commit SHA, provenance check.
   - `wger` adapter: `sources/wger/{fetch,normalize}.py`, raw API snapshot, per-record license
     and author.
   - Scout: `reports/source_candidates.md` only, ingests nothing.
3. **Main agent**: taxonomy (`taxonomy/*.yaml`, German names), merge (normalize names, match key =
   name + load equipment, rapidfuzz `token_set_ratio` 95/85 bands, variations, permanent IDs in
   `taxonomy/id_registry.csv`), muscle resolution, exports (`dist/exercises.sqlite`,
   `dist/seed.sql`, `dist/exercises.json`), reports, `make validate`, `make load`.
4. Ingest approved discovered sources (max 3) through new adapters, rebuild.
5. Verifier subagent (did not write build code): `make validate`, 30 random exercises end to end
   against raw records, 10 well-known lifts for plausibility. Fix and re-run until clean.

## Adapter contract

Every source lives in `sources/<source_id>/`:

| File | Written by | Content |
|---|---|---|
| `source.yaml` | adapter author | `id, name, url, license (SPDX), license_url, attribution, share_alike, commercial_use_ok` |
| `fetch.py` | adapter author | downloads the raw snapshot into `raw/` (no images or videos, <= 1 request/s, robots.txt respected) |
| `raw/SNAPSHOT.json` | `fetch.py` | `{"source_id", "retrieved_at" (ISO-8601 UTC), "version" (commit SHA / API version), "url", "files": [{"path", "bytes", "sha256"}]}` |
| `normalize.py` | adapter author | reads `raw/` only (no network), writes `normalized.jsonl` |
| `normalized.jsonl` | `normalize.py` | one record per line, see below; sorted by `source_record_id`; byte-identical across runs |

```json
{"source_id": "", "source_record_id": "", "source_url": "", "license": "", "author": "",
 "name_en": "", "name_de": null, "aliases": [], "category": "", "equipment": [],
 "mechanic": null, "force": null, "level": null, "laterality": null,
 "primary_muscles_raw": [], "secondary_muscles_raw": [], "stabilizer_muscles_raw": [],
 "instructions": [], "raw": {}}
```

- `category`, `equipment`, `*_muscles_raw`: raw source strings, exactly as the source spells them.
  They are mapped centrally (`config.yaml` category map, `taxonomy/equipment.yaml`,
  `taxonomy/muscle_aliases.yaml`); the build fails on anything unmapped.
- `mechanic`, `force`, `level`, `laterality`: already in the schema's vocabulary, or `null`.
- `aliases`: `[{"alias": "...", "lang": "en"|"de"}]`, other names for the same exercise.
- `name_en` may be `null` when the source has no English name (the record is kept as evidence but
  does not create an exercise on its own).
- `instructions`: list of plain-text English steps (HTML stripped).
- `raw`: the source record, untouched.

Adding a source = new folder with these files + an entry in `config.yaml`. No schema change.
