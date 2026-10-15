"""Loads config.yaml and the hand-maintained taxonomy files."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import yaml

from .adapter import ROOT
from .names import NameRules


class BuildError(Exception):
    pass


def load_yaml(path: Path):
    return yaml.safe_load(path.read_text(encoding="utf-8"))


@dataclass
class Taxonomy:
    config: dict
    names: NameRules
    muscles: dict[str, dict]            # id -> row for the muscles table
    equipment: dict[str, dict]          # id -> {name_en, name_de, load}
    equipment_aliases: dict[str, dict[str, list[str]]]
    equipment_infer: dict[str, str]     # canonical name token -> equipment id
    equipment_replace: list[dict]
    muscle_aliases: dict[str, dict[str, str]]
    movement_rules: list[dict]
    laterality_rules: list[dict]
    pipeline_labels: dict[str, str]     # label -> exercise id
    exercise_aliases: dict[str, list[dict]]  # exercise id -> [{alias, kind, lang}]
    sources: dict[str, dict]            # enabled source id -> sources-table row
    source_meta: dict[str, dict]        # enabled source id -> full source.yaml

    def group_of(self, muscle_id: str) -> str:
        m = self.muscles[muscle_id]
        return m["parent_id"] or m["id"]

    def license_rank(self, spdx: str | None) -> int:
        for prefix, rank in sorted(self.config["license_rank"].items(), key=lambda kv: -len(kv[0])):
            if spdx and (spdx == prefix or spdx.startswith(prefix + "-")):
                return rank
        return 99

    def license_accepted(self, spdx: str | None) -> bool:
        return bool(spdx) and any(spdx == p or spdx.startswith(p + "-") for p in self.config["accepted_licenses"])


def load_taxonomy(root: Path = ROOT, sources: list[str] | None = None) -> Taxonomy:
    config = load_yaml(root / "config.yaml")
    if sources is not None:  # experiments: build with another source list
        config["sources"] = list(sources)
    tax_dir = root / "taxonomy"
    names = NameRules(load_yaml(tax_dir / "name_rules.yaml"))

    mdata = load_yaml(tax_dir / "muscles.yaml")
    muscles: dict[str, dict] = {}
    for g in mdata["groups"]:
        muscles[g["id"]] = {"id": g["id"], "level": "group", "parent_id": None, "name_en": g["name_en"],
                            "name_de": g["name_de"], "latin_name": g.get("latin_name"),
                            "region": g["region"], "body_view": g.get("body_view")}
    for m in mdata["muscles"]:
        if m["id"] in muscles:
            raise BuildError(f"duplicate muscle id {m['id']}")
        parent = muscles.get(m["parent"])
        if not parent or parent["level"] != "group":
            raise BuildError(f"muscle {m['id']}: unknown group {m['parent']}")
        muscles[m["id"]] = {"id": m["id"], "level": "muscle", "parent_id": m["parent"], "name_en": m["name_en"],
                            "name_de": m["name_de"], "latin_name": m.get("latin_name"),
                            "region": m.get("region", parent["region"]), "body_view": m.get("body_view")}

    edata = load_yaml(tax_dir / "equipment.yaml")
    equipment = {e["id"]: {"id": e["id"], "name_en": e["name_en"], "name_de": e["name_de"], "load": bool(e["load"])}
                 for e in edata["equipment"]}
    equipment_aliases = {src: {str(k).strip().lower(): list(v) for k, v in amap.items()}
                         for src, amap in (edata.get("aliases") or {}).items()}
    for src, amap in equipment_aliases.items():
        for raw, ids in amap.items():
            for eid in ids:
                if eid not in equipment:
                    raise BuildError(f"equipment.yaml: {src} '{raw}' -> unknown equipment {eid}")
    rules = edata.get("name_rules") or {}
    equipment_infer = dict(rules.get("infer") or {})
    equipment_replace = list(rules.get("replace") or [])

    adata = load_yaml(tax_dir / "muscle_aliases.yaml") or {}
    muscle_aliases = {src: {str(k).strip().lower(): v for k, v in amap.items()} for src, amap in adata.items()}
    for src, amap in muscle_aliases.items():
        for raw, mid in amap.items():
            if mid not in muscles:
                raise BuildError(f"muscle_aliases.yaml: {src} '{raw}' -> unknown muscle {mid}")

    rdata = load_yaml(tax_dir / "movement_rules.yaml")
    pdata = load_yaml(tax_dir / "pipeline_labels.yaml") or {}
    xdata = load_yaml(tax_dir / "exercise_aliases.yaml") or {}
    exercise_aliases: dict[str, list[dict]] = {}
    for ex_id, entries in (xdata.get("aliases") or {}).items():
        exercise_aliases[ex_id] = [{"alias": e["alias"], "kind": e["kind"], "lang": e.get("lang")} for e in entries]

    sources: dict[str, dict] = {}
    source_meta: dict[str, dict] = {}
    for sid in config["sources"]:
        sdir = root / "sources" / sid
        meta = load_yaml(sdir / "source.yaml")
        snap = json.loads((sdir / "raw" / "SNAPSHOT.json").read_text(encoding="utf-8"))
        source_meta[sid] = meta
        if meta["id"] != sid:
            raise BuildError(f"sources/{sid}/source.yaml has id {meta['id']}")
        sources[sid] = {
            "id": sid, "name": meta["name"], "url": meta["url"], "license": meta["license"],
            "license_url": meta.get("license_url"), "attribution": meta.get("attribution"),
            "share_alike": int(meta.get("share_alike") or 0), "commercial_use_ok": int(meta["commercial_use_ok"]),
            "retrieved_at": snap["retrieved_at"], "version": snap.get("version"),
        }

    tax = Taxonomy(config=config, names=names, muscles=muscles, equipment=equipment,
                   equipment_aliases=equipment_aliases, equipment_infer=equipment_infer,
                   equipment_replace=equipment_replace, muscle_aliases=muscle_aliases,
                   movement_rules=rdata["movement_pattern"], laterality_rules=rdata["laterality"],
                   pipeline_labels={str(k): v for k, v in (pdata.get("labels") or {}).items()},
                   exercise_aliases=exercise_aliases, sources=sources, source_meta=source_meta)
    for sid, row in sources.items():
        if not tax.license_accepted(row["license"]):
            raise BuildError(f"source {sid}: license {row['license']!r} is not in accepted_licenses")
    return tax
