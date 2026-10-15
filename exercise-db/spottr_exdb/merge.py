"""Merge normalized source records into exercises and resolve their muscles and images.

Pure logic: reads normalized.jsonl + taxonomy + id registry, returns a BuildResult with every
table's rows. Writing files is done by export.py / report.py.
"""

from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from rapidfuzz import fuzz

from .adapter import ROOT
from .taxonomy import BuildError, Taxonomy

ROLES = ("primary", "secondary", "stabilizer")
RANK = {r: i for i, r in enumerate(ROLES)}
POSITIONS = ("start", "end")
REGISTRY_FIELDS = ["source_id", "source_record_id", "exercise_id", "match_method", "match_score",
                   "review_candidate", "review_reason"]
# Tokens of two names are "the same token, spelled differently" at this rapidfuzz.ratio.
SAME_TOKEN_RATIO = 85
# Equipment that says nothing about the implement when the name names one ("Cable Curls" listed
# as bodyweight, "Plate Twist" listed as other).
UNINFORMATIVE = {"bodyweight", "other"}

REVIEW_FUZZY = "fuzzy match 85-94"
REVIEW_EXTRA = "extra words (token_sort_ratio >= 85)"
REVIEW_DEFAULT = "differs only by a default-form word (bent-over, standing)"
REVIEW_UNKNOWN = "same name, one side has no equipment"
REVIEW_ALIAS = "matches only through an alias"
REVIEW_CONFLICT = "equipment in the name contradicts the source's equipment"


def natural_key(rid: str):
    return (0, int(rid), "") if rid.isdigit() else (1, 0, rid)


@dataclass
class Rec:
    d: dict
    prio: int
    equipment: list[str]
    equip_key: tuple
    equipment_conflict: bool
    category: str | None
    tokens: list[str]
    name_key: str | None
    alias_keys: set[str]
    de_key: str | None
    evidence: list[tuple[str, str, str]]        # (muscle_id, role, raw name)
    claims: dict[str, str]                      # muscle_id -> highest role in this record

    @property
    def source_id(self) -> str:
        return self.d["source_id"]

    @property
    def rid(self) -> str:
        return self.d["source_record_id"]

    @property
    def ref(self) -> tuple[str, str]:
        return (self.source_id, self.rid)

    @property
    def name_en(self) -> str | None:
        return (self.d["name_en"] or "").strip() or None

    @property
    def name_de(self) -> str | None:
        return (self.d["name_de"] or "").strip() or None

    @property
    def has_primary(self) -> bool:
        return "primary" in self.claims.values()

    @property
    def order(self):
        return (self.prio, natural_key(self.rid))


@dataclass
class Ex:
    id: str
    records: list[Rec] = field(default_factory=list)

    @property
    def sources(self) -> set[str]:
        return {r.source_id for r in self.records}

    def display(self) -> Rec:
        named = [r for r in self.records if r.name_en]
        return min(named or self.records, key=lambda r: r.order)

    @property
    def equip_key(self) -> tuple:
        return min(self.records, key=lambda r: r.order).equip_key


@dataclass
class Assignment:
    exercise_id: str | None
    match_method: str | None = None
    match_score: float | None = None
    review_candidate: str | None = None
    review_reason: str | None = None
    skip_reason: str | None = None

    @property
    def in_review(self) -> bool:
        return bool(self.exercise_id and self.review_reason and self.match_method != "manual")


@dataclass
class BuildResult:
    tax: Taxonomy
    records: list[Rec]
    assignments: dict[tuple[str, str], Assignment]
    exercises: dict[str, dict]                 # id -> exercises-table row
    ex_records: dict[str, list[Rec]]
    exercise_equipment: list[tuple[str, str]]
    exercise_aliases: list[dict]
    exercise_muscles: list[dict]
    exercise_images: list[dict]
    evidence: list[dict]
    registry_rows: list[dict]
    new_registry_rows: int
    review_queue: list[dict]
    no_primary_fallback: list[str]
    suspect_names: list[tuple[str, str, str]]
    non_english_instructions: list[tuple[str, str, str]]


# ---------------------------------------------------------------- language

EN_WORDS = {"the", "and", "your", "you", "with", "to", "of", "on", "is", "in", "for", "until", "keep", "back",
            "position", "hold", "slowly", "feet", "arms", "hands", "up", "down", "this", "it", "as", "at", "while",
            "then", "from", "should", "repeat", "body", "starting", "be", "are", "or", "knees", "hips", "shoulders"}
FOREIGN_WORDS = {
    # German
    "und", "die", "der", "das", "mit", "den", "dem", "sie", "ist", "auf", "nicht", "ein", "eine", "beine", "arme",
    "nach", "oben", "unten", "langsam", "zur", "zum", "wird", "werden", "bis",
    # Spanish / Portuguese
    "el", "la", "los", "las", "con", "del", "para", "una", "que", "hasta", "brazos", "piernas", "espalda", "y",
    "es", "se", "su", "lo", "por", "com", "os", "um", "uma", "pernas", "braços", "até", "posición", "posição",
    # French / Italian
    "le", "les", "des", "avec", "et", "vos", "votre", "jusqu", "bras", "jambes", "pour", "dans", "il", "della",
    "braccia", "gambe", "di", "sono", "muscoli", "verso", "alla", "nella",
}
NON_ENGLISH_NAME_WORDS = {"con", "mit", "und", "agarre", "maquina", "supino", "inclinado", "remo", "remada", "jambes",
                          "cote", "avec", "sentado", "barra", "mancuerna", "mancuernas", "polea", "auf", "der", "die",
                          "das", "dynamique", "planche", "ponte", "abdominales", "sobre", "zum", "jalon", "jalones",
                          "pecho", "abierto", "trazioni", "impugnatura", "inversa", "arco", "gamba", "kopfuber",
                          "gewichtaufheben", "cabo", "estiramiento", "piernas", "cadera", "brazos", "cuello",
                          "isometria", "alle", "parallele", "caballero", "unialteral", "elevacion",
                          "patada", "patadas", "burro", "traseras", "respiracion", "profunda"}


def looks_english(text: str) -> bool:
    words = re.findall(r"[a-zà-ÿ]+", text.lower())
    en = sum(w in EN_WORDS for w in words)
    foreign = sum(w in FOREIGN_WORDS for w in words)
    return en >= foreign


# ---------------------------------------------------------------- loading

def load_records(tax: Taxonomy, root: Path = ROOT) -> list[Rec]:
    names = tax.names
    unmapped_muscles: Counter = Counter()
    unmapped_equipment: Counter = Counter()
    unmapped_categories: Counter = Counter()
    cat_rules = tax.config.get("category_name_rules") or {}
    out: list[Rec] = []
    for prio, sid in enumerate(tax.config["sources"]):
        path = root / "sources" / sid / "normalized.jsonl"
        if not path.exists():
            raise BuildError(f"{path} missing: run the source's normalize.py (make build does)")
        mus_map = tax.muscle_aliases.get(sid, {})
        eq_map = tax.equipment_aliases.get(sid, {})
        cat_map = {str(k).lower(): v for k, v in (tax.config["categories"].get(sid) or {}).items()}
        for line in path.read_text(encoding="utf-8").splitlines():
            d = json.loads(line)
            if d["source_id"] != sid:
                raise BuildError(f"{path}: record with source_id {d['source_id']}")
            name_en = (d["name_en"] or "").strip()
            name_de = (d["name_de"] or "").strip()
            tokens = names.tokens(name_en or name_de)

            # Name used for matching: without a trailing " – <equipment>" when that suffix is the
            # record's own raw equipment value ("Dip – Bar" -> "Dip"); equipment is matched separately.
            match_name = name_en
            for raw in d["equipment"]:
                m = re.match(rf"^(.*\S)\s+[–-]\s+{re.escape(str(raw))}$", name_en)
                if m and names.is_equipment_suffix(str(raw)):
                    match_name = m.group(1)

            # Equipment: map raw -> canonical; load equipment named in the name is added (and
            # replaces an uninformative "bodyweight"/"other"); a name that contradicts the source's
            # load equipment is flagged for review.
            equipment: list[str] = []
            for raw in d["equipment"]:
                ids = eq_map.get(str(raw).strip().lower())
                if ids is None:
                    unmapped_equipment[(sid, raw)] += 1
                    continue
                equipment.extend(ids)
            tokset = set(tokens)
            for rule in tax.equipment_replace:  # e.g. a Smith machine exercise listed as `machine`
                if rule["token"] in tokset and rule["from"] in equipment:
                    equipment = [rule["to"] if e == rule["from"] else e for e in equipment]
            named = [eid for tok, eid in tax.equipment_infer.items() if tok in tokset and eid not in UNINFORMATIVE]
            source_loads = {e for e in equipment if tax.equipment[e]["load"]} - UNINFORMATIVE
            conflict = bool(named and source_loads and not (source_loads & set(named)))
            if named:
                equipment = [e for e in equipment if e not in UNINFORMATIVE] + named
            elif not equipment:
                equipment = [eid for tok, eid in tax.equipment_infer.items() if tok in tokset]
            for rule in tax.equipment_replace:
                if rule["token"] in tokset and rule["from"] in equipment:
                    equipment = [rule["to"] if e == rule["from"] else e for e in equipment]
            equipment = sorted(set(equipment))
            load = sorted({e for e in equipment if tax.equipment[e]["load"]})
            if len(load) > 1 and "bodyweight" in load:
                load.remove("bodyweight")
            equip_key = tuple(load) if load else (("bodyweight",) if equipment else ())

            # category
            category = None
            if d["category"]:
                category = cat_map.get(str(d["category"]).strip().lower())
                if category is None:
                    unmapped_categories[(sid, d["category"])] += 1
                elif sid in (cat_rules.get("sources") or []):
                    for rule in cat_rules.get("rules") or []:
                        if rule["token"] in tokset:
                            category = rule["category"]
                            break

            # muscles
            evidence: list[tuple[str, str, str]] = []
            seen = set()
            for role in ROLES:
                for raw in d[f"{role}_muscles_raw"]:
                    mid = mus_map.get(str(raw).strip().lower())
                    if mid is None:
                        unmapped_muscles[(sid, raw)] += 1
                        continue
                    if (mid, role) not in seen:
                        seen.add((mid, role))
                        evidence.append((mid, role, raw))
            claims: dict[str, str] = {}
            for mid, role, _ in evidence:
                if mid not in claims or RANK[role] < RANK[claims[mid]]:
                    claims[mid] = role

            out.append(Rec(
                d=d, prio=prio, equipment=equipment, equip_key=equip_key, equipment_conflict=conflict,
                category=category, tokens=tokens,
                name_key=names.key(match_name) if match_name else None,
                alias_keys={names.key(a["alias"]) for a in d["aliases"] if a["lang"] == "en" and a["alias"].strip()},
                de_key=" ".join(sorted(re.sub(r"[^a-z0-9]+", " ", name_de.lower()).split())) if name_de else None,
                evidence=evidence, claims=claims,
            ))
    problems = []
    if unmapped_muscles:
        problems.append("Unmapped raw muscle names (add them to taxonomy/muscle_aliases.yaml):\n" + "\n".join(
            f"  {sid}: {raw!r} ({n} records)" for (sid, raw), n in sorted(unmapped_muscles.items())))
    if unmapped_equipment:
        problems.append("Unmapped raw equipment (add them to taxonomy/equipment.yaml aliases):\n" + "\n".join(
            f"  {sid}: {raw!r} ({n} records)" for (sid, raw), n in sorted(unmapped_equipment.items())))
    if unmapped_categories:
        problems.append("Unmapped raw categories (add them to config.yaml categories):\n" + "\n".join(
            f"  {sid}: {raw!r} ({n} records)" for (sid, raw), n in sorted(unmapped_categories.items())))
    if problems:
        raise BuildError("\n".join(problems))
    return out


def read_registry(path: Path) -> dict[tuple[str, str], dict]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    reg = {}
    for row in rows:
        key = (row["source_id"], row["source_record_id"])
        if key in reg:
            raise BuildError(f"id_registry.csv: duplicate row for {key}")
        reg[key] = row
    return reg


def write_registry(path: Path, rows: list[dict]) -> None:
    rows = sorted(rows, key=lambda r: (r["source_id"], natural_key(r["source_record_id"])))
    with path.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=REGISTRY_FIELDS, lineterminator="\n")
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k) if r.get(k) is not None else "" for k in REGISTRY_FIELDS})


def fmt_score(x: float | None) -> str:
    return "" if x is None else f"{x:.1f}"


# ---------------------------------------------------------------- matching

class Matcher:
    def __init__(self, tax: Taxonomy, reserved_ids: set[str]):
        self.tax = tax
        self.exercises: dict[str, Ex] = {}
        self.name_index: dict[tuple[str, tuple], set[str]] = defaultdict(set)   # from record names
        self.alias_index: dict[tuple[str, tuple], set[str]] = defaultdict(set)  # from record aliases
        self.de_index: dict[tuple[str, tuple], set[str]] = defaultdict(set)
        self.by_equip: dict[tuple, set[str]] = defaultdict(set)
        self.fuzzy_names: dict[str, set[str]] = defaultdict(set)
        self.used_ids = set(reserved_ids)
        self.auto = tax.config["fuzzy"]["auto_merge"]
        self.review = tax.config["fuzzy"]["review"]
        self.default_modifiers = set(tax.config.get("default_form_modifiers") or [])

    def add(self, ex_id: str, rec: Rec) -> None:
        ex = self.exercises.get(ex_id)
        if ex is None:
            ex = self.exercises[ex_id] = Ex(ex_id)
        ex.records.append(rec)
        self.used_ids.add(ex_id)
        if rec.name_key:
            self.name_index[(rec.name_key, rec.equip_key)].add(ex_id)
            self.fuzzy_names[ex_id].add(rec.name_key)
        for k in rec.alias_keys:
            self.alias_index[(k, rec.equip_key)].add(ex_id)
        if rec.de_key:
            self.de_index[(rec.de_key, rec.equip_key)].add(ex_id)
        self.by_equip[rec.equip_key].add(ex_id)

    def classify(self, a: str, b: str, score: float) -> tuple[str | None, float, str | None]:
        """(merge | variation | review | None, score, review reason) for two keys with the same equipment."""
        A, B = set(a.split()), set(b.split())
        only_a, only_b = A - B, B - A
        extra = {x for x in only_a if not any(fuzz.ratio(x, y) >= SAME_TOKEN_RATIO for y in only_b)}
        extra |= {y for y in only_b if not any(fuzz.ratio(y, x) >= SAME_TOKEN_RATIO for x in only_a)}
        if not extra:  # same words, at most spelled differently
            if score >= self.auto:
                return "merge", score, None
            return ("review", score, REVIEW_FUZZY) if score >= self.review else (None, score, None)
        if extra <= self.tax.names.modifiers:
            if extra <= self.default_modifiers:
                # "Bent Over Rowing" vs "Row": usually the same exercise in its default form.
                return "review", score, REVIEW_DEFAULT
            return "variation", score, None  # incline vs flat etc.: separate, linked by variation_of
        # Extra words: token_set_ratio rates every subset as 100 ("dip" vs "bench dip"), so such
        # pairs are never auto-merged and are banded by token_sort_ratio instead.
        sort_score = fuzz.token_sort_ratio(a, b)
        return ("review", sort_score, REVIEW_EXTRA) if sort_score >= self.review else (None, sort_score, None)

    def match(self, rec: Rec) -> Assignment:
        eq = rec.equip_key
        if not rec.name_en:
            # Only a German name: attach on an exact German-name match, never create.
            hits = sorted(self.de_index.get((rec.de_key, eq), ())) if rec.de_key else []
            if hits:
                return Assignment(hits[0], "normalized", 100.0)
            return Assignment(None, skip_reason="no English name")

        exact = set(self.name_index.get((rec.name_key, eq), set()))
        if rec.de_key:
            exact |= self.de_index.get((rec.de_key, eq), set())
        reviews: list[tuple[float, str, str]] = []  # (-score, exercise id, reason)
        if exact:
            ex_id = min(exact)
            raw_names = {r.name_en.lower() for r in self.exercises[ex_id].records if r.name_en}
            method = "exact" if rec.name_en.lower() in raw_names else "normalized"
            # Same key: one exercise. A record whose name contradicts its own equipment is still
            # merged (a second exercise with the same key is not allowed), but flagged for review.
            return Assignment(ex_id, method, 100.0, review_reason=REVIEW_CONFLICT if rec.equipment_conflict else None)

        # Alias-based hits are never merged automatically: source aliases are noisy
        # (e.g. a two-arm row whose alias says "One Arm DB Rows").
        alias_hits = set(self.alias_index.get((rec.name_key, eq), set()))
        for k in rec.alias_keys:
            alias_hits |= self.name_index.get((k, eq), set()) | self.alias_index.get((k, eq), set())
        reviews += [(-100.0, e, REVIEW_ALIAS) for e in alias_hits]

        best_merge = None
        for ex_id in sorted(self.by_equip.get(eq, ())):
            if rec.source_id in self.exercises[ex_id].sources:
                continue  # a source's own distinct records are distinct exercises
            for other in sorted(self.fuzzy_names[ex_id]):
                score = fuzz.token_set_ratio(rec.name_key, other)
                if score < self.review:
                    continue
                kind, score, reason = self.classify(rec.name_key, other, score)
                if kind == "merge" and not rec.equipment_conflict:
                    if best_merge is None or (-score, ex_id) < best_merge:
                        best_merge = (-score, ex_id)
                elif kind in ("merge", "review"):
                    reviews.append((-score, ex_id, reason or REVIEW_CONFLICT))
        if best_merge:
            return Assignment(best_merge[1], "fuzzy", round(-best_merge[0], 1))
        if not rec.has_primary:
            return Assignment(None, skip_reason="no primary muscle")

        # Same name where one side has no equipment at all (either direction).
        if eq == ():
            same = sorted((k_eq != ("bodyweight",), e) for (k, k_eq), ids in self.name_index.items()
                          if k == rec.name_key for e in ids)
            reviews += [(-100.0, e, REVIEW_UNKNOWN) for _, e in same[:1]]  # bodyweight variant first
        else:
            reviews += [(-100.0, e, REVIEW_UNKNOWN) for e in sorted(self.name_index.get((rec.name_key, ()), set()))]

        new_id = self.new_id(rec)
        if reviews:
            score, cand, reason = min(reviews, key=lambda r: (r[0], r[1]))
            return Assignment(new_id, "new", round(-score, 1), review_candidate=cand, review_reason=reason)
        if rec.equipment_conflict:
            return Assignment(new_id, "new", review_reason=REVIEW_CONFLICT)
        return Assignment(new_id, "new")

    def new_id(self, rec: Rec) -> str:
        load = [e for e in rec.equip_key if e not in UNINFORMATIVE]
        prefix = load[0].replace("_", "-") if len(load) == 1 else None
        base = self.tax.names.slug(rec.name_en, prefix) or "exercise"
        slug = base
        n = 2
        while slug in self.used_ids:
            slug = f"{base}-{n}"
            n += 1
        self.used_ids.add(slug)
        return slug


# ---------------------------------------------------------------- rules

def rule_matches(rule: dict, tokens: set[str], category: str | None, mechanic: str | None,
                 equipment: set[str]) -> bool:
    if "any" in rule and not tokens & set(rule["any"]):
        return False
    if "all" in rule and not set(rule["all"]) <= tokens:
        return False
    if "none" in rule and tokens & set(rule["none"]):
        return False
    if "category" in rule and category not in rule["category"]:
        return False
    if "mechanic" in rule and mechanic != rule["mechanic"]:
        return False
    if "equipment" in rule and not equipment & set(rule["equipment"]):
        return False
    return True


def apply_rules(rules: list[dict], result_key: str, **ctx) -> str | None:
    for rule in rules:
        if rule_matches(rule, **ctx):
            return rule[result_key]
    return None


# ---------------------------------------------------------------- muscles

def resolve_muscles(tax: Taxonomy, recs: list[Rec]) -> tuple[list[dict], bool]:
    """exercise_muscles rows for one exercise. Returns (rows, used_no_primary_fallback)."""
    claims: dict[str, dict[str, str]] = defaultdict(dict)   # source -> muscle -> best role
    for r in recs:
        for mid, role in r.claims.items():
            cur = claims[r.source_id].get(mid)
            if cur is None or RANK[role] < RANK[cur]:
                claims[r.source_id][mid] = role
    covering = sorted(claims)
    if not covering:
        return [], False

    votes: dict[str, list[str]] = defaultdict(list)
    for s in covering:
        for mid, role in claims[s].items():
            votes[mid].append(role)

    def majority(roles: list[str]) -> str:
        c = Counter(roles)
        top = max(c.values())
        return min((r for r in c if c[r] == top), key=RANK.get)  # tie -> higher role

    resolved = {mid: majority(v) for mid, v in votes.items()}
    authoritative = [s for s in tax.config.get("authoritative_sources") or [] if s in claims]
    if authoritative:
        # Reviewed mapping (e.g. Spottr's own pipeline table): its list is final for this exercise.
        # Other sources' claims stay in the evidence table and count in confidence.
        resolved = dict(claims[authoritative[0]])

    fallback = False
    if "primary" not in resolved.values():
        # Majority voting demoted every primary claim: the muscles with the most primary votes stay
        # primary (flagged needs_review), so every exercise keeps at least one primary muscle.
        best = max(v.count("primary") for v in votes.values())
        for mid, v in votes.items():
            if best and v.count("primary") == best:
                resolved[mid] = "primary"
        fallback = True

    # Group vs specific: keep the specific muscle, drop the group row unless its role is higher.
    groups = {mid for mid in resolved if tax.muscles[mid]["level"] == "group"}
    for g in groups:
        children = [m for m in resolved if tax.muscles[m]["parent_id"] == g]
        if children and RANK[resolved[g]] >= min(RANK[resolved[c]] for c in children):
            del resolved[g]

    rows = []
    weights = tax.config["role_weights"]
    for mid in sorted(resolved):
        role = resolved[mid]
        parent = tax.muscles[mid]["parent_id"]
        support = agree = 0
        for s in covering:
            direct = claims[s].get(mid)
            if parent:  # a group-level claim also speaks for the group's muscles
                related = claims[s].get(parent)
            else:  # and a claim on a specific muscle speaks for its group
                kids = [r for m, r in claims[s].items() if tax.muscles[m]["parent_id"] == mid]
                related = min(kids, key=RANK.get) if kids else None
            claim = direct or related
            if claim:
                support += 1
                if claim == role:
                    agree += 1
        rows.append({"muscle_id": mid, "role": role, "weight": float(weights[role]),
                     "source_count": support, "confidence": round(agree / len(covering), 4)})
    return rows, fallback


# ---------------------------------------------------------------- images

def load_media_manifests(tax: Taxonomy, root: Path = ROOT) -> dict[str, dict]:
    files: dict[str, dict] = {}
    for sid in tax.config["sources"]:
        path = root / "sources" / sid / "media_manifest.json"
        if path.exists():
            files.update(json.loads(path.read_text(encoding="utf-8"))["files"])
    return files


def choose_images(tax: Taxonomy, ex_id: str, recs: list[Rec], manifest: dict[str, dict]) -> list[dict]:
    """Start and end image for one exercise, from one record when possible (same photo set).

    Ranked: undisputed sources first, then the most permissive license, then source priority."""
    disputed = set(tax.config.get("disputed_sources") or [])

    def rank(r: Rec):
        return (r.source_id in disputed, tax.license_rank(r.d["images"][0]["license"]), r.order)

    with_images = [r for r in recs if r.d.get("images")]
    pairs = [r for r in with_images if {i["position"] for i in r.d["images"]} >= set(POSITIONS)]
    chosen: dict[str, tuple[Rec, dict]] = {}
    if pairs:
        best = min(pairs, key=rank)
        for img in best.d["images"]:
            chosen.setdefault(img["position"], (best, img))
    else:
        for pos in POSITIONS:
            cands = [r for r in with_images if any(i["position"] == pos for i in r.d["images"])]
            if cands:
                best = min(cands, key=rank)
                chosen[pos] = (best, next(i for i in best.d["images"] if i["position"] == pos))
    rows = []
    for pos in POSITIONS:
        if pos in chosen:
            r, img = chosen[pos]
            rows.append({"exercise_id": ex_id, "position": pos, "source_id": r.source_id,
                         "source_record_id": r.rid, "path": img["path"], "source_url": img["url"],
                         "license": img["license"], "author": img["author"],
                         "sha256": (manifest.get(img["path"]) or {}).get("sha256")})
    return rows


# ---------------------------------------------------------------- build

def build(tax: Taxonomy, registry_path: Path, root: Path = ROOT) -> BuildResult:
    records = load_records(tax, root)
    registry = read_registry(registry_path)
    reserved = {row["exercise_id"] for row in registry.values() if row["exercise_id"]}
    matcher = Matcher(tax, reserved)
    assignments: dict[tuple[str, str], Assignment] = {}
    label_sources = set(tax.config.get("label_sources") or [])
    disputed = set(tax.config.get("disputed_sources") or [])
    coarse_category = set((tax.config.get("category_name_rules") or {}).get("sources") or [])

    by_order = sorted(records, key=lambda r: r.order)
    # 1. records with a permanent id
    for rec in by_order:
        row = registry.get(rec.ref)
        if row:
            score = float(row["match_score"]) if row["match_score"] else None
            assignments[rec.ref] = Assignment(row["exercise_id"], row["match_method"] or None, score,
                                              row["review_candidate"] or None, row.get("review_reason") or None)
            matcher.add(row["exercise_id"], rec)
    # 2. new records: those that can create an exercise first, the rest can only attach.
    # 3. records of label sources (record id = vision-pipeline label) attach through
    #    pipeline_labels.yaml, after everything else exists.
    pending = [r for r in by_order if r.ref not in assignments]
    pending.sort(key=lambda r: (r.source_id in label_sources, 0 if (r.name_en and r.has_primary) else 1, r.order))
    new_rows = 0
    for rec in pending:
        if rec.source_id in label_sources:
            target = tax.pipeline_labels.get(rec.rid)
            a = (Assignment(target, "manual") if target in matcher.exercises
                 else Assignment(None, skip_reason="pipeline label not mapped in pipeline_labels.yaml"))
        else:
            a = matcher.match(rec)
        assignments[rec.ref] = a
        if a.exercise_id:
            matcher.add(a.exercise_id, rec)
            registry[rec.ref] = {"source_id": rec.source_id, "source_record_id": rec.rid,
                                 "exercise_id": a.exercise_id, "match_method": a.match_method,
                                 "match_score": fmt_score(a.match_score),
                                 "review_candidate": a.review_candidate or "",
                                 "review_reason": a.review_reason or ""}
            new_rows += 1

    names = tax.names
    manifest = load_media_manifests(tax, root)
    exercises: dict[str, dict] = {}
    ex_records: dict[str, list[Rec]] = {}
    exercise_equipment: list[tuple[str, str]] = []
    exercise_muscles: list[dict] = []
    exercise_images: list[dict] = []
    aliases: list[dict] = []
    no_primary_fallback: list[str] = []
    non_english_instr: list[tuple[str, str, str]] = []

    for ex_id in sorted(matcher.exercises):
        ex = matcher.exercises[ex_id]
        recs = sorted(ex.records, key=lambda r: r.order)
        ex_records[ex_id] = recs
        disp = ex.display()

        def first(attr):
            for r in recs:
                v = r.d.get(attr)
                if v:
                    return v
            return None

        # Category: sources with real exercise types win over coarse ones (wger's body parts).
        category = (next((r.category for r in recs if r.category and r.source_id not in coarse_category), None)
                    or next((r.category for r in recs if r.category), None) or "other")
        mechanic, force, level = first("mechanic"), first("force"), first("level")
        # Label-source records only point at the exercise. Their equipment fills in only when no
        # other record names a load implement and they agree on one.
        equipment = sorted({e for r in recs if r.source_id not in label_sources for e in r.equipment})
        if not {e for e in equipment if tax.equipment[e]["load"]}:
            label_loads = {e for r in recs if r.source_id in label_sources for e in r.equipment
                           if tax.equipment[e]["load"] and e not in UNINFORMATIVE}
            if len(label_loads) == 1:
                equipment = sorted(set(equipment) | label_loads)
        tokset = set(names.tokens(disp.name_en or ""))
        ctx = dict(tokens=tokset, category=category, mechanic=mechanic, equipment=set(equipment))
        movement = apply_rules(tax.movement_rules, "pattern", **ctx)
        laterality = first("laterality") or apply_rules(tax.laterality_rules, "laterality", **ctx)

        # Instructions: most permissive license first; never from disputed sources; skip text that
        # is not English (some wger "English" entries are Spanish, German, ...).
        instr_rec = None
        for r in sorted((r for r in recs if r.d["instructions"] and r.source_id not in disputed),
                        key=lambda r: (tax.license_rank(r.d["license"]), r.order)):
            if looks_english(" ".join(r.d["instructions"])):
                instr_rec = r
                break
            non_english_instr.append((r.source_id, r.rid, r.name_en or ""))

        rows, fallback = resolve_muscles(tax, recs)
        if fallback:
            no_primary_fallback.append(ex_id)
        for row in rows:
            exercise_muscles.append({"exercise_id": ex_id, **row})
        exercise_images.extend(choose_images(tax, ex_id, recs, manifest))

        needs_review = fallback or any(assignments[r.ref].in_review for r in recs)
        exercises[ex_id] = {
            "id": ex_id,
            "name_en": disp.name_en,
            "name_de": next((r.name_de for r in recs if r.name_de), None),
            "category": category,
            "movement_pattern": movement,
            "mechanic": mechanic,
            "force": force,
            "laterality": laterality,
            "level": level,
            "variation_of": None,
            "instructions": json.dumps(instr_rec.d["instructions"], ensure_ascii=False) if instr_rec else None,
            "instructions_source_id": instr_rec.source_id if instr_rec else None,
            "needs_review": 1 if needs_review else 0,
        }
        for e in equipment:
            exercise_equipment.append((ex_id, e))

        seen = set()

        def add_alias(alias, kind, lang, source_id):
            alias = (alias or "").strip()
            if alias and (alias, kind) not in seen:
                seen.add((alias, kind))
                aliases.append({"exercise_id": ex_id, "alias": alias, "kind": kind, "lang": lang,
                                "source_id": source_id})

        for r in recs:
            add_alias(r.name_en, "source_name", "en", r.source_id)
        for r in recs:
            add_alias(r.name_de, "translation", "de", r.source_id)
            for a in r.d["aliases"]:
                add_alias(a["alias"], "name" if a["lang"] == "en" else "translation", a["lang"], r.source_id)
        for a in tax.exercise_aliases.get(ex_id, []):
            add_alias(a["alias"], a["kind"], a.get("lang"), None)

    # variation_of: strip modifier tokens from the display name key; base must exist with the
    # same load equipment. One level only (a variation's base is never itself a variation).
    target: dict[str, str] = {}
    for ex_id, ex in matcher.exercises.items():
        disp = ex.display()
        if not disp.name_key:
            continue
        base = names.base_key(disp.name_key)
        if base:
            cands = sorted(matcher.name_index.get((base, ex.equip_key), set()) - {ex_id})
            if cands:
                target[ex_id] = cands[0]
    for ex_id, base_id in sorted(target.items()):
        seen_chain = {ex_id}
        while base_id in target and base_id not in seen_chain:
            seen_chain.add(base_id)
            base_id = target[base_id]
        if base_id != ex_id:
            exercises[ex_id]["variation_of"] = base_id

    # pipeline labels
    for label, ex_id in sorted(tax.pipeline_labels.items()):
        if ex_id not in exercises:
            raise BuildError(f"pipeline_labels.yaml: {label} -> unknown exercise {ex_id}")
        aliases.append({"exercise_id": ex_id, "alias": label, "kind": "pipeline_label", "lang": None,
                        "source_id": None})
    for ex_id in tax.exercise_aliases:
        if ex_id not in exercises:
            raise BuildError(f"exercise_aliases.yaml: unknown exercise {ex_id}")

    evidence = [{"source_id": r.source_id, "source_record_id": r.rid, "muscle_id": mid, "role": role,
                 "raw_muscle_name": raw} for r in by_order for mid, role, raw in r.evidence]

    review_queue = []
    rec_by_ref = {r.ref: r for r in by_order}
    for ref, a in sorted(assignments.items(), key=lambda kv: (kv[0][0], natural_key(kv[0][1]))):
        if a.in_review:
            rec = rec_by_ref[ref]
            cand = exercises.get(a.review_candidate) if a.review_candidate else None
            review_queue.append({
                "source_id": ref[0], "source_record_id": ref[1], "record_name": rec.name_en,
                "equipment": " ".join(rec.equip_key) or "(unknown)", "exercise_id": a.exercise_id,
                "candidate_exercise_id": a.review_candidate or "",
                "candidate_name": cand["name_en"] if cand else ("(retired)" if a.review_candidate else ""),
                "score": fmt_score(a.match_score), "reason": a.review_reason,
            })

    suspect = []
    for r in by_order:
        if not r.name_en or r.source_id in label_sources:
            continue
        instr = " ".join(r.d["instructions"])
        if set(r.tokens) & NON_ENGLISH_NAME_WORDS or (instr and not looks_english(instr)):
            suspect.append((r.source_id, r.rid, r.name_en))

    registry_rows = [registry[k] for k in registry]
    return BuildResult(tax=tax, records=by_order, assignments=assignments, exercises=exercises,
                       ex_records=ex_records, exercise_equipment=sorted(exercise_equipment),
                       exercise_aliases=sorted(aliases, key=lambda a: (a["exercise_id"], a["kind"], a["alias"])),
                       exercise_muscles=exercise_muscles, exercise_images=exercise_images, evidence=evidence,
                       registry_rows=registry_rows, new_registry_rows=new_rows, review_queue=review_queue,
                       no_primary_fallback=no_primary_fallback, suspect_names=suspect,
                       non_english_instructions=sorted(set(non_english_instr)))
