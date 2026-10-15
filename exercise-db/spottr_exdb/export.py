"""Writes dist/exercises.sqlite, dist/seed.sql and dist/exercises.json from a BuildResult."""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path

from .adapter import ROOT
from .merge import ROLES, BuildResult, natural_key

SCHEMA_PATH = ROOT / "schema" / "schema.sql"

# Insert order respects foreign keys; DELETE runs in reverse.
TABLES = [
    ("sources", ["id", "name", "url", "license", "license_url", "attribution", "share_alike",
                 "commercial_use_ok", "retrieved_at", "version"]),
    ("muscles", ["id", "level", "parent_id", "name_en", "name_de", "latin_name", "region", "body_view"]),
    ("muscle_aliases", ["source_id", "alias", "muscle_id"]),
    ("equipment", ["id", "name_en", "name_de"]),
    ("exercises", ["id", "name_en", "name_de", "category", "movement_pattern", "mechanic", "force",
                   "laterality", "level", "variation_of", "instructions", "instructions_source_id",
                   "needs_review"]),
    ("exercise_equipment", ["exercise_id", "equipment_id"]),
    ("exercise_aliases", ["exercise_id", "alias", "kind", "lang", "source_id"]),
    ("source_records", ["source_id", "source_record_id", "exercise_id", "source_url", "license", "author",
                        "match_method", "match_score", "raw_json"]),
    ("exercise_muscle_evidence", ["source_id", "source_record_id", "muscle_id", "role", "raw_muscle_name"]),
    ("exercise_muscles", ["exercise_id", "muscle_id", "role", "weight", "source_count", "confidence"]),
    ("exercise_images", ["exercise_id", "position", "source_id", "source_record_id", "path", "source_url",
                         "license", "author", "sha256"]),
]


def table_rows(res: BuildResult) -> dict[str, list[tuple]]:
    tax = res.tax
    t: dict[str, list[tuple]] = {}
    t["sources"] = [tuple(tax.sources[s][c] for c in TABLES[0][1]) for s in sorted(tax.sources)]
    muscles = sorted(tax.muscles.values(), key=lambda m: (m["level"] != "group", m["id"]))
    t["muscles"] = [tuple(m[c] for c in TABLES[1][1]) for m in muscles]
    t["muscle_aliases"] = [(sid, alias, mid) for sid in sorted(tax.sources)
                           for alias, mid in sorted(tax.muscle_aliases.get(sid, {}).items())]
    t["equipment"] = [(e["id"], e["name_en"], e["name_de"]) for e in sorted(tax.equipment.values(), key=lambda e: e["id"])]
    exs = sorted(res.exercises.values(), key=lambda e: (e["variation_of"] is not None, e["id"]))
    t["exercises"] = [tuple(e[c] for c in TABLES[4][1]) for e in exs]
    t["exercise_equipment"] = list(res.exercise_equipment)
    t["exercise_aliases"] = [(a["exercise_id"], a["alias"], a["kind"], a["lang"], a["source_id"])
                             for a in res.exercise_aliases]
    srows = []
    for r in sorted(res.records, key=lambda r: (r.source_id, natural_key(r.rid))):
        a = res.assignments[r.ref]
        srows.append((r.source_id, r.rid, a.exercise_id, r.d["source_url"], r.d["license"], r.d["author"],
                      a.match_method if a.exercise_id else None, a.match_score if a.exercise_id else None,
                      json.dumps(r.d["raw"], ensure_ascii=False, separators=(",", ":"))))
    t["source_records"] = srows
    t["exercise_muscle_evidence"] = sorted(
        (e["source_id"], e["source_record_id"], e["muscle_id"], e["role"], e["raw_muscle_name"]) for e in res.evidence)
    t["exercise_muscles"] = sorted((m["exercise_id"], m["muscle_id"], m["role"], m["weight"], m["source_count"],
                                    m["confidence"]) for m in res.exercise_muscles)
    cols = dict(TABLES)["exercise_images"]
    t["exercise_images"] = sorted(tuple(i[c] for c in cols) for i in res.exercise_images)
    return t


def write_sqlite(tables: dict[str, list[tuple]], path: Path) -> None:
    tmp = path.with_suffix(".sqlite.tmp")
    for p in (tmp, Path(str(tmp) + "-journal")):
        if p.exists():
            p.unlink()
    con = sqlite3.connect(tmp)
    try:
        con.execute("PRAGMA foreign_keys = ON")
        con.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        with con:
            for name, cols in TABLES:
                rows = tables[name]
                if rows:
                    con.executemany(f"INSERT INTO {name} ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})", rows)
        bad = con.execute("PRAGMA foreign_key_check").fetchall()
        if bad:
            raise RuntimeError(f"foreign key violations: {bad[:5]}")
        con.execute("VACUUM")
    finally:
        con.close()
    os.replace(tmp, path)


def sql_literal(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def write_seed(tables: dict[str, list[tuple]], path: Path, batch: int = 200) -> None:
    lines = [
        "-- Spottr exercise database: data for schema/schema.sql (Postgres / Supabase, also SQLite).",
        "-- Generated by `make build`; do not edit. Re-running it replaces all rows.",
        "BEGIN;",
    ]
    for name, _ in reversed(TABLES):
        lines.append(f"DELETE FROM {name};")
    for name, cols in TABLES:
        rows = tables[name]
        for i in range(0, len(rows), batch):
            chunk = rows[i:i + batch]
            lines.append(f"INSERT INTO {name} ({', '.join(cols)}) VALUES")
            lines.append(",\n".join("(" + ", ".join(sql_literal(v) for v in row) + ")" for row in chunk) + ";")
    lines.append("COMMIT;")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_json(res: BuildResult, path: Path) -> None:
    tax = res.tax
    muscles_by_ex: dict[str, list[dict]] = {}
    for m in res.exercise_muscles:
        muscles_by_ex.setdefault(m["exercise_id"], []).append(m)
    equipment_by_ex: dict[str, list[str]] = {}
    for ex_id, eq in res.exercise_equipment:
        equipment_by_ex.setdefault(ex_id, []).append(eq)
    aliases_by_ex: dict[str, list[dict]] = {}
    for a in res.exercise_aliases:
        aliases_by_ex.setdefault(a["exercise_id"], []).append(
            {"alias": a["alias"], "kind": a["kind"], "lang": a["lang"], "source_id": a["source_id"]})

    images_by_ex: dict[str, dict] = {}
    for img in res.exercise_images:
        images_by_ex.setdefault(img["exercise_id"], {})[img["position"]] = {
            k: img[k] for k in ("path", "source_url", "source_id", "license", "author", "sha256")}

    out = []
    for ex_id in sorted(res.exercises):
        e = res.exercises[ex_id]
        by_role = {r: [] for r in ROLES}
        groups: dict[str, dict] = {}
        for m in sorted(muscles_by_ex.get(ex_id, []), key=lambda m: (-m["weight"], m["muscle_id"])):
            info = tax.muscles[m["muscle_id"]]
            group = info["parent_id"] or info["id"]
            by_role[m["role"]].append({"id": m["muscle_id"], "name_en": info["name_en"], "name_de": info["name_de"],
                                       "level": info["level"], "group": group, "weight": m["weight"],
                                       "source_count": m["source_count"], "confidence": m["confidence"]})
            g = groups.setdefault(group, {"weight": 0.0, "role_rank": 9})
            g["weight"] = max(g["weight"], m["weight"])
            g["role_rank"] = min(g["role_rank"], ROLES.index(m["role"]) + 1)
        group_by_role = {r: sorted((g for g, v in groups.items() if v["role_rank"] == i + 1)) for i, r in enumerate(ROLES)}
        out.append({
            "id": ex_id,
            "name_en": e["name_en"],
            "name_de": e["name_de"],
            "category": e["category"],
            "movement_pattern": e["movement_pattern"],
            "mechanic": e["mechanic"],
            "force": e["force"],
            "laterality": e["laterality"],
            "level": e["level"],
            "variation_of": e["variation_of"],
            "needs_review": bool(e["needs_review"]),
            "equipment": equipment_by_ex.get(ex_id, []),
            "muscles": by_role,
            "muscle_groups": group_by_role,
            "aliases": aliases_by_ex.get(ex_id, []),
            "images": images_by_ex.get(ex_id, {}),
            "instructions": json.loads(e["instructions"]) if e["instructions"] else [],
            "instructions_source_id": e["instructions_source_id"],
            "sources": [{"source_id": r.source_id, "source_record_id": r.rid, "source_url": r.d["source_url"],
                         "license": r.d["license"], "author": r.d["author"],
                         "match_method": res.assignments[r.ref].match_method}
                        for r in res.ex_records[ex_id]],
        })
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_notice(res: BuildResult, path: Path) -> None:
    """Attribution and license notices that must travel with the data."""
    tax = res.tax
    L = ["# Notices", "",
         "The files in this folder contain data from the sources below. Keep this file with any copy of the data.", ""]
    for sid in tax.config["sources"]:
        s, meta = tax.sources[sid], tax.source_meta[sid]
        L += [f"## {s['name']} (`{sid}`)", "", f"- Source: {s['url']}", f"- Version: `{s['version']}`",
              f"- License: `{s['license']}`" + (f" ({s['license_url']})" if s["license_url"] else "")]
        if s["attribution"]:
            L.append(f"- Attribution: {s['attribution']}")
        if s["share_alike"]:
            L.append("- Share-alike: adaptations of this data must be shared under the same license.")
        if sid in (tax.config.get("disputed_sources") or []):
            L.append("- Provenance disputed: the data and images appear to originate from bodybuilding.com "
                     "(see sources/free-exercise-db/PROVENANCE.md). Ingested on Spottr's decision; the images are "
                     "not redistributed with this repository.")
        L.append("")
        if meta.get("notice_file"):
            text = (ROOT / "sources" / sid / meta["notice_file"]).read_text(encoding="utf-8").strip()
            L += ["```text", text, "```", ""]
    path.write_text("\n".join(L) + "\n", encoding="utf-8")


def write_all(res: BuildResult, out_dir: Path) -> dict[str, list[tuple]]:
    out_dir.mkdir(parents=True, exist_ok=True)
    tables = table_rows(res)
    write_sqlite(tables, out_dir / "exercises.sqlite")
    write_seed(tables, out_dir / "seed.sql")
    write_json(res, out_dir / "exercises.json")
    write_notice(res, out_dir / "NOTICE.md")
    return tables
