"""Normalize the free-exercise-db raw snapshot into sources/free-exercise-db/normalized.jsonl.

Reads raw/ only (no network). Output is deterministic (byte-identical across runs).

Run from exercise-db/:  uv run python -I sources/free-exercise-db/normalize.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from spottr_exdb.adapter import (  # noqa: E402
    make_record, read_snapshot_meta, source_dir, write_normalized,
)

SOURCE_ID = "free-exercise-db"
LICENSE = "Unlicense"
GITHUB_BLOB = "https://github.com/yuhonas/free-exercise-db/blob/{sha}/{path}"
GITHUB_RAW = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/{sha}/exercises/{path}"
# The repo stores two photos per exercise: 0.jpg = start position, 1.jpg = end position.
POSITIONS = ("start", "end")

FORCE = {"push", "pull", "static"}
MECHANIC = {"compound", "isolation"}
LEVEL = {"beginner": "beginner", "intermediate": "intermediate", "expert": "advanced"}


def per_exercise_files(ls_tree: str) -> set[str]:
    """Paths of the per-exercise JSON blobs listed by `git ls-tree HEAD exercises/`."""
    paths = set()
    for line in ls_tree.splitlines():
        meta, _, path = line.partition("\t")
        if meta.split()[1:2] == ["blob"] and path.endswith(".json"):
            paths.add(path)
    return paths


def vocab(value, allowed, field: str, rid: str):
    if value is None:
        return None
    if value in allowed:
        return value
    print(f"warning: {rid}: {field}={value!r} not in schema vocabulary, set to null", file=sys.stderr)
    return None


def main() -> None:
    raw = source_dir(SOURCE_ID) / "raw"
    sha = read_snapshot_meta(SOURCE_ID)["version"]
    exercises = json.loads((raw / "dist" / "exercises.json").read_text(encoding="utf-8"))
    files = per_exercise_files((raw / "ls-tree-exercises.txt").read_text(encoding="utf-8"))

    records = []
    for ex in exercises:
        rid = ex["id"]
        path = f"exercises/{rid}.json"
        source_url = GITHUB_BLOB.format(sha=sha, path=path if path in files else "dist/exercises.json")
        level = ex.get("level")
        equipment = ex.get("equipment")
        records.append(make_record(
            source_id=SOURCE_ID,
            source_record_id=rid,
            source_url=source_url,
            license=LICENSE,
            author=None,
            name_en=ex["name"],
            name_de=None,
            aliases=[],
            category=ex.get("category"),
            equipment=[equipment] if equipment is not None else [],
            mechanic=vocab(ex.get("mechanic"), MECHANIC, "mechanic", rid),
            force=vocab(ex.get("force"), FORCE, "force", rid),
            level=vocab(LEVEL.get(level, level), set(LEVEL.values()), "level", rid),
            laterality=None,
            primary_muscles_raw=list(ex.get("primaryMuscles") or []),
            secondary_muscles_raw=list(ex.get("secondaryMuscles") or []),
            instructions=[s.strip() for s in ex.get("instructions") or [] if s.strip()],
            images=[{"position": pos, "path": f"{SOURCE_ID}/{img}", "url": GITHUB_RAW.format(sha=sha, path=img),
                     "license": LICENSE, "author": None}
                    for pos, img in zip(POSITIONS, ex.get("images") or [])],
            raw=ex,
        ))

    out = write_normalized(SOURCE_ID, records)
    print(f"{SOURCE_ID}: {len(records)} records -> {out.relative_to(source_dir(SOURCE_ID).parent.parent)}")


if __name__ == "__main__":
    main()
