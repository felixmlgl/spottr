"""Normalize the wger raw snapshot (sources/wger/raw/) into sources/wger/normalized.jsonl.

Reads raw/ only (no network). Deterministic: same raw/ in, byte-identical output out.

raw/ holds wger's Django fixtures (see fetch.py). One output record per `exercises.exercise`
object (the same id as /api/v2/exerciseinfo/<id>/ and the wger.de exercise page). Its `raw` field
groups the untouched fixture objects that belong to the exercise:
    {"exercise": {...}, "translations": [...], "aliases": [...], "comments": [...]}
(translations of every language, sorted by pk; aliases and comments of those translations).

Run from exercise-db/: uv run python -I sources/wger/normalize.py
"""

from __future__ import annotations

import html
import json
from collections import defaultdict
from html.parser import HTMLParser

from spottr_exdb.adapter import make_record, source_dir, write_normalized

SOURCE_ID = "wger"
RAW = source_dir(SOURCE_ID) / "raw"
EXERCISE_URL = "https://wger.de/en/exercise/{id}/view"

# wger license short_name -> (SPDX id, fragment the license URL must contain)
SPDX = {
    "CC-BY-SA 3": ("CC-BY-SA-3.0", "creativecommons.org/licenses/by-sa/3.0"),
    "CC-BY-SA 4": ("CC-BY-SA-4.0", "creativecommons.org/licenses/by-sa/4.0"),
    "CC0": ("CC0-1.0", "creativecommons.org/publicdomain/zero/1.0"),
    "CC-BY 4": ("CC-BY-4.0", "creativecommons.org/licenses/by/4.0"),
    "ODbL": ("ODbL-1.0", "opendatacommons.org/licenses/odbl"),
}


def load(name: str, models: set[str]) -> list[dict]:
    data = json.loads((RAW / name).read_text(encoding="utf-8"))
    found = {obj["model"] for obj in data}
    if not found <= models:
        raise ValueError(f"{name}: unexpected models {sorted(found - models)}")
    return data


def by_pk(objs: list[dict], model: str) -> dict[int, dict]:
    return {o["pk"]: o["fields"] for o in objs if o["model"] == model}


def clean(text: str | None) -> str:
    return " ".join((text or "").split())


# --- HTML description -> plain-text steps -------------------------------------------------------

BLOCK_TAGS = {"p", "div", "ul", "ol", "dl", "dt", "dd", "table", "tr", "blockquote", "pre",
              "h1", "h2", "h3", "h4", "h5", "h6", "section", "article", "header", "footer", "hr"}


class _StepParser(HTMLParser):
    """Splits HTML into steps: each <li> is one step; outside lists, each paragraph / block / <br>
    separated line is one step. Text order is kept."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.steps: list[str] = []
        self.buf: list[str] = []
        self.li_depth = 0
        self.skip = 0
        self.tags = 0

    def flush(self):
        text = clean("".join(self.buf))
        if text:
            self.steps.append(text)
        self.buf = []

    def handle_starttag(self, tag, attrs):
        self.tags += 1
        if tag in ("script", "style"):
            self.skip += 1
        elif tag == "li":
            self.flush()
            self.li_depth += 1
        elif tag == "br":
            if self.li_depth:
                self.buf.append(" ")
            else:
                self.flush()
        elif tag in BLOCK_TAGS:
            self.flush()

    def handle_endtag(self, tag):
        self.tags += 1
        if tag in ("script", "style"):
            self.skip = max(0, self.skip - 1)
        elif tag == "li":
            self.flush()
            self.li_depth = max(0, self.li_depth - 1)
        elif tag in BLOCK_TAGS:
            self.flush()

    def handle_data(self, data):
        if not self.skip:
            self.buf.append(data)


def html_to_steps(description: str | None) -> list[str]:
    if not description or not description.strip():
        return []
    parser = _StepParser()
    parser.feed(description)
    parser.close()
    parser.flush()
    if parser.tags == 0:
        # Plain text without markup: lines are the steps.
        return [s for s in (clean(line) for line in html.unescape(description).splitlines()) if s]
    return parser.steps


# --- records --------------------------------------------------------------------------------------

def main() -> None:
    licenses = by_pk(load("licenses.json", {"core.license"}), "core.license")
    languages = by_pk(load("languages.json", {"core.language"}), "core.language")
    muscles = by_pk(load("muscles.json", {"exercises.muscle"}), "exercises.muscle")
    equipment = by_pk(load("equipment.json", {"exercises.equipment"}), "exercises.equipment")
    categories = by_pk(load("categories.json", {"exercises.exercisecategory"}), "exercises.exercisecategory")
    base = load("exercise-base-data.json", {"exercises.exercise"})
    tr_objs = load("translations.json", {"exercises.translation", "exercises.alias", "exercises.exercisecomment"})

    spdx = {}
    for pk, lic in licenses.items():
        if lic["short_name"] not in SPDX:
            raise ValueError(f"unmapped wger license {pk}: {lic['short_name']!r}")
        spdx_id, url_part = SPDX[lic["short_name"]]
        if url_part not in lic["url"]:
            raise ValueError(f"wger license {pk} {lic['short_name']!r}: url {lic['url']!r} does not match {spdx_id}")
        spdx[pk] = spdx_id

    lang_id = {f["short_name"]: pk for pk, f in languages.items()}
    en, de = lang_id["en"], lang_id["de"]

    translations = sorted((o for o in tr_objs if o["model"] == "exercises.translation"), key=lambda o: o["pk"])
    tr_exercise = {o["pk"]: o["fields"]["exercise"] for o in translations}
    tr_by_ex: dict[int, list[dict]] = defaultdict(list)
    for o in translations:
        tr_by_ex[o["fields"]["exercise"]].append(o)
    aliases_by_tr: dict[int, list[dict]] = defaultdict(list)
    comments_by_ex: dict[int, list[dict]] = defaultdict(list)
    aliases_by_ex: dict[int, list[dict]] = defaultdict(list)
    for o in sorted((o for o in tr_objs if o["model"] != "exercises.translation"), key=lambda o: o["pk"]):
        tr_pk = o["fields"]["translation"]
        if tr_pk not in tr_exercise:
            raise ValueError(f"{o['model']} {o['pk']} points to missing translation {tr_pk}")
        if o["model"] == "exercises.alias":
            aliases_by_tr[tr_pk].append(o)
            aliases_by_ex[tr_exercise[tr_pk]].append(o)
        else:
            comments_by_ex[tr_exercise[tr_pk]].append(o)

    ex_ids = {o["pk"] for o in base}
    orphans = sorted(set(tr_by_ex) - ex_ids)
    if orphans:
        raise ValueError(f"translations point to missing exercises: {orphans[:10]}")

    records = []
    for obj in sorted(base, key=lambda o: o["pk"]):
        ex_id, f = obj["pk"], obj["fields"]
        trs = tr_by_ex.get(ex_id, [])
        lang_trs = {lang: [t for t in trs if t["fields"]["language"] == lang_pk]
                    for lang, lang_pk in (("en", en), ("de", de))}
        names = {lang: (clean(t[0]["fields"]["name"]) or None) if t else None for lang, t in lang_trs.items()}

        aliases, seen = [], set()
        for lang, ts in lang_trs.items():
            if names[lang]:
                seen.add((lang, names[lang].casefold()))
            for i, t in enumerate(ts):
                candidates = [] if i == 0 else [t["fields"]["name"]]
                candidates += [a["fields"]["alias"] for a in aliases_by_tr.get(t["pk"], [])]
                for cand in candidates:
                    alias = clean(cand)
                    if alias and (lang, alias.casefold()) not in seen:
                        seen.add((lang, alias.casefold()))
                        aliases.append({"alias": alias, "lang": lang})

        authors = []
        for author in [f["license_author"]] + [t["fields"]["license_author"] for t in lang_trs["en"] + lang_trs["de"]]:
            author = clean(author)
            if author and author not in authors:
                authors.append(author)

        en_tr = lang_trs["en"][0]["fields"] if lang_trs["en"] else None
        records.append(make_record(
            source_id=SOURCE_ID,
            source_record_id=ex_id,
            source_url=EXERCISE_URL.format(id=ex_id),
            license=spdx[f["license"]],
            author="; ".join(authors) or None,
            name_en=names["en"],
            name_de=names["de"],
            aliases=aliases,
            category=categories[f["category"]]["name"] if f["category"] is not None else None,
            equipment=[equipment[e]["name"] for e in f["equipment"]],
            primary_muscles_raw=[muscles[m]["name"] for m in f["muscles"]],
            secondary_muscles_raw=[muscles[m]["name"] for m in f["muscles_secondary"]],
            stabilizer_muscles_raw=[],
            instructions=html_to_steps(en_tr["description"]) if en_tr else [],
            raw={"exercise": obj, "translations": trs, "aliases": aliases_by_ex.get(ex_id, []),
                 "comments": comments_by_ex.get(ex_id, [])},
        ))

    out = write_normalized(SOURCE_ID, records)
    print(f"wrote {len(records)} records to {out}")


if __name__ == "__main__":
    main()
