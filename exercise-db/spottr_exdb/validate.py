"""`make validate`: checks dist/ and the taxonomy; exits non-zero on any violation."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import sqlite3
import subprocess
import sys
import tempfile
from collections import defaultdict
from pathlib import Path

from .adapter import ROOT
from .build import REGISTRY
from .build import main as build_main
from .export import SCHEMA_PATH, TABLES
from .taxonomy import load_taxonomy

DIST = ROOT / "dist"
DIST_FILES = ("exercises.sqlite", "seed.sql", "exercises.json", "NOTICE.md")
MEDIA_SUFFIXES = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".mp4", ".mov", ".webm", ".avi", ".m4v"}


class Checks:
    def __init__(self):
        self.failures: list[str] = []

    def check(self, ok: bool, label: str, detail: str = "") -> None:
        print(f"[{'ok' if ok else 'FAIL'}] {label}" + (f"\n       {detail}" if detail and not ok else ""))
        if not ok:
            self.failures.append(label)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    c = Checks()
    tax = load_taxonomy()
    db_path = DIST / "exercises.sqlite"
    if not db_path.exists():
        print("dist/exercises.sqlite missing: run `make build` first")
        return 1
    con = sqlite3.connect(db_path)
    q = lambda sql, *a: con.execute(sql, a).fetchall()  # noqa: E731

    # --- schema is exactly schema/schema.sql
    fresh = sqlite3.connect(":memory:")
    fresh.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    want = sorted(fresh.execute("SELECT type, name, sql FROM sqlite_master").fetchall())
    have = sorted(q("SELECT type, name, sql FROM sqlite_master"))
    c.check(want == have, "schema of dist/exercises.sqlite is exactly schema/schema.sql")

    # --- every exercise has a primary muscle
    rows = q("SELECT id FROM exercises e WHERE NOT EXISTS "
             "(SELECT 1 FROM exercise_muscles m WHERE m.exercise_id = e.id AND m.role = 'primary') ORDER BY id")
    c.check(not rows, "every exercise has at least one primary muscle", f"{len(rows)}: {[r[0] for r in rows[:20]]}")

    # --- no unmapped raw muscle names (independent re-read of normalized.jsonl)
    unmapped = set()
    claims = 0
    for sid in tax.config["sources"]:
        amap = tax.muscle_aliases.get(sid, {})
        for line in (ROOT / "sources" / sid / "normalized.jsonl").read_text(encoding="utf-8").splitlines():
            d = json.loads(line)
            for role in ("primary", "secondary", "stabilizer"):
                for raw in d[f"{role}_muscles_raw"]:
                    claims += 1
                    if str(raw).strip().lower() not in amap:
                        unmapped.add((sid, raw))
    c.check(not unmapped, "no raw muscle name is unmapped", str(sorted(unmapped)[:20]))
    alias_rows = q("SELECT source_id, alias FROM muscle_aliases")
    c.check(all(a == a.lower() for _, a in alias_rows), "muscle_aliases.alias values are lowercased")

    # --- unique normalized name + load equipment
    load = {eid for eid, e in tax.equipment.items() if e["load"]}
    eq = defaultdict(set)
    for ex_id, eid in q("SELECT exercise_id, equipment_id FROM exercise_equipment"):
        eq[ex_id].add(eid)
    seen = defaultdict(list)
    for ex_id, name in q("SELECT id, name_en FROM exercises"):
        loads = sorted(eq[ex_id] & load)
        if len(loads) > 1 and "bodyweight" in loads:
            loads.remove("bodyweight")
        key = tuple(loads) if loads else (("bodyweight",) if eq[ex_id] else ())
        seen[(tax.names.key(name), key)].append(ex_id)
    dupes = {k: v for k, v in seen.items() if len(v) > 1}
    c.check(not dupes, "no two exercises share the same normalized name and equipment set",
            "; ".join(f"{k}: {v}" for k, v in list(dupes.items())[:10]))

    # --- foreign keys and licenses
    con.execute("PRAGMA foreign_keys = ON")
    fk = q("PRAGMA foreign_key_check")
    c.check(not fk, "all foreign keys are valid", str(fk[:10]))
    bad_src = q("SELECT sr.source_id, sr.source_record_id FROM source_records sr LEFT JOIN sources s ON s.id = sr.source_id "
                "WHERE s.id IS NULL OR s.license IS NULL OR trim(s.license) = ''")
    c.check(not bad_src, "every source record points to a source with a license", str(bad_src[:10]))
    bad_lic = [r for r in q("SELECT id, license FROM sources") if not tax.license_accepted(r[1])]
    bad_lic += [r for r in q("SELECT DISTINCT source_id, license FROM source_records") if not tax.license_accepted(r[1])]
    c.check(not bad_lic, "every source and record license is an accepted open license", str(bad_lic[:10]))
    excluded = set(tax.config.get("excluded_sources") or {})
    leaked = q(f"SELECT id FROM sources WHERE id IN ({','.join('?' * len(excluded))})", *sorted(excluded)) if excluded else []
    c.check(not leaked, "excluded sources are not in the database", str(leaked))

    # --- pipeline labels
    dup = q("SELECT alias, count(*) FROM exercise_aliases WHERE kind = 'pipeline_label' GROUP BY alias HAVING count(*) > 1")
    c.check(not dup, "pipeline-label aliases are unique", str(dup))
    got = dict(q("SELECT alias, exercise_id FROM exercise_aliases WHERE kind = 'pipeline_label'"))
    c.check(got == tax.pipeline_labels, "pipeline labels in the database match taxonomy/pipeline_labels.yaml")

    # --- permanent ids
    current = {}
    with REGISTRY.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            current[(row["source_id"], row["source_record_id"])] = row
    try:
        prev_text = subprocess.run(["git", "show", "HEAD:exercise-db/taxonomy/id_registry.csv"], cwd=ROOT,
                                   capture_output=True, text=True, check=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        prev_text = None
    if prev_text is None:
        print("[skip] id_registry.csv not committed yet: nothing to compare against")
    else:
        changed = []
        for row in csv.DictReader(io.StringIO(prev_text)):
            key = (row["source_id"], row["source_record_id"])
            now = current.get(key)
            if now is None:
                changed.append(f"{key} removed")
            elif now["exercise_id"] != row["exercise_id"] and now["match_method"] != "manual":
                changed.append(f"{key}: {row['exercise_id']} -> {now['exercise_id']}")
        c.check(not changed, "ids from the previous id_registry.csv are unchanged (only manual reassignments)",
                "; ".join(changed[:10]))
    db_map = {(s, r): e for s, r, e in q("SELECT source_id, source_record_id, exercise_id FROM source_records")}
    mismatch = [k for k, row in current.items() if k in db_map and db_map[k] != row["exercise_id"]]
    missing = [k for k, e in db_map.items() if e is not None and k not in current]
    c.check(not mismatch and not missing, "source_records.exercise_id agrees with id_registry.csv",
            f"mismatch {mismatch[:5]}, not in registry {missing[:5]}")

    # --- seed.sql is the same data
    seeded = sqlite3.connect(":memory:")
    seeded.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    seeded.executescript((DIST / "seed.sql").read_text(encoding="utf-8"))
    same = all(sorted(seeded.execute(f"SELECT * FROM {t}").fetchall(), key=repr) ==
               sorted(q(f"SELECT * FROM {t}"), key=repr) for t, _ in TABLES)
    c.check(same, "dist/seed.sql loads into schema.sql and equals dist/exercises.sqlite")

    # --- exercises.json matches
    data = json.loads((DIST / "exercises.json").read_text(encoding="utf-8"))
    c.check(sorted(e["id"] for e in data) == sorted(r[0] for r in q("SELECT id FROM exercises")),
            "dist/exercises.json has one object per exercise")

    # --- images
    bad_pos = q("SELECT exercise_id, position FROM exercise_images WHERE position NOT IN ('start','end')")
    c.check(not bad_pos, "exercise_images positions are start/end", str(bad_pos[:5]))
    pair_src = q("SELECT exercise_id FROM exercise_images GROUP BY exercise_id "
                 "HAVING count(*) = 2 AND count(DISTINCT source_id || '/' || source_record_id) > 1")
    c.check(not pair_src, "start and end image of an exercise come from the same record", str(pair_src[:5]))
    manifest = {}
    for sid in tax.config["sources"]:
        mpath = ROOT / "sources" / sid / "media_manifest.json"
        if mpath.exists():
            manifest.update(json.loads(mpath.read_text(encoding="utf-8"))["files"])
    img_rows = q("SELECT path, sha256 FROM exercise_images")
    wrong_hash = [p for p, h in img_rows if p in manifest and manifest[p]["sha256"] != h]
    c.check(not wrong_hash, "image hashes match the media manifests", str(wrong_hash[:5]))
    media_root = ROOT / "media"
    if media_root.exists():
        missing_files = [p for p, _ in img_rows if not (media_root / p).is_file()]
        c.check(not missing_files, "every referenced image exists under media/ (make fetch-media)", str(missing_files[:5]))
        corrupt = [p for p, h in img_rows if h and (media_root / p).is_file() and sha256(media_root / p) != h]
        c.check(not corrupt, "downloaded images match their sha256", str(corrupt[:5]))
    else:
        print("[skip] media/ not downloaded (make fetch-media): image files not checked")
    tracked = subprocess.run(["git", "ls-files", "--", "media"], cwd=ROOT, capture_output=True, text=True).stdout.split()
    c.check(not tracked, "no image files are tracked in git (public repo)", str(tracked[:5]))

    # --- no media in raw snapshots
    media = [p.relative_to(ROOT).as_posix() for p in (ROOT / "sources").rglob("*") if p.suffix.lower() in MEDIA_SUFFIXES]
    c.check(not media, "no images or videos under sources/", str(media[:10]))

    # --- determinism: two fresh builds equal each other and dist/
    with tempfile.TemporaryDirectory() as tmp:
        hashes = []
        for i in (1, 2):
            out = Path(tmp) / f"run{i}"
            rc = build_main(["--out", str(out / "dist"), "--reports", str(out / "reports"), "--registry-readonly"])
            if rc:
                c.check(False, "rebuild succeeds with the committed id_registry.csv")
                break
            hashes.append({f: sha256(out / "dist" / f) for f in DIST_FILES} |
                          {f"reports/{f}": sha256(out / "reports" / f) for f in ("build_report.md", "review_queue.csv")})
        if len(hashes) == 2:
            current_hashes = {f: sha256(DIST / f) for f in DIST_FILES} | {
                f"reports/{f}": sha256(ROOT / "reports" / f) for f in ("build_report.md", "review_queue.csv")}
            c.check(hashes[0] == hashes[1], "build is deterministic: two runs give byte-identical dist files",
                    str({k: (hashes[0][k][:12], hashes[1][k][:12]) for k in hashes[0] if hashes[0][k] != hashes[1][k]}))
            c.check(hashes[0] == current_hashes, "dist/ and reports/ are up to date with the sources and taxonomy",
                    f"differs: {[k for k in current_hashes if current_hashes[k] != hashes[0][k]]} (run `make build`)")

    print()
    if c.failures:
        print(f"VALIDATION FAILED: {len(c.failures)} check(s)")
        return 1
    n = q("SELECT count(*) FROM exercises")[0][0]
    print(f"VALIDATION OK: {n} exercises, {claims} raw muscle claims mapped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
