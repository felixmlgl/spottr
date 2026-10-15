"""Exercise-name normalization, match keys and slugs (rules in taxonomy/name_rules.yaml)."""

from __future__ import annotations

import re
import unicodedata


def ascii_lower(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return text.lower()


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", ascii_lower(text)).strip("-")


class NameRules:
    def __init__(self, data: dict):
        for key in ("filler", "modifiers", "equipment_tokens", "suffix_words"):
            bad = [v for v in data[key] if not isinstance(v, str)]
            if bad:  # e.g. YAML reads an unquoted `on` as True
                raise ValueError(f"name_rules.yaml {key}: non-string entries {bad}; quote them")
        phrases = [(tuple(k.split()), tuple(str(v).split())) for k, v in data["phrases"].items()]
        # Longest phrase first, then alphabetical, so replacement is deterministic.
        self.phrases = sorted(phrases, key=lambda kv: (-len(kv[0]), kv[0]))
        self.abbreviations = {k: tuple(str(v).split()) for k, v in data["abbreviations"].items()}
        self.plurals = dict(data["plurals"])
        self.filler = set(data["filler"])
        self.modifiers = set(data["modifiers"])
        self.equipment_tokens = set(data["equipment_tokens"])
        self.suffix_words = set(data.get("suffix_words") or [])
        slug = data["slug"]
        self.slug_words = {k: tuple(v.split()) for k, v in slug["words"].items()}
        self.slug_plurals = {**self.plurals, **slug["plurals"]}
        self.slug_filler = set(slug["filler"])
        self.slug_filler_phrases = [tuple(p.split()) for p in slug["filler_phrases"]]
        self.slug_keep_phrases = sorted((tuple(p.split()) for p in slug.get("keep_phrases") or []), key=lambda p: -len(p))
        self.slug_equipment = sorted(((tuple(k.split()), v) for k, v in slug["equipment"].items()),
                                     key=lambda kv: (-len(kv[0]), kv[0]))

    def _replace_phrases(self, toks: list[str]) -> list[str]:
        for _ in range(4):
            changed = False
            out: list[str] = []
            i = 0
            while i < len(toks):
                for src, dst in self.phrases:
                    n = len(src)
                    if tuple(toks[i:i + n]) == src:
                        out.extend(dst)
                        i += n
                        changed = True
                        break
                else:
                    out.append(toks[i])
                    i += 1
            toks = out
            if not changed:
                break
        return toks

    def tokens(self, name: str) -> list[str]:
        """Canonical tokens in original order (abbreviations expanded, phrases joined)."""
        s = ascii_lower(name).replace("&", " and ").replace("'", "").replace("’", "")
        s = re.sub(r"[^a-z0-9]+", " ", s)
        toks = self._replace_phrases(s.split())
        expanded: list[str] = []
        for t in toks:
            expanded.extend(self.abbreviations.get(t, (t,)))
        return self._replace_phrases([self.plurals.get(t, t) for t in expanded])

    def key_tokens(self, name: str) -> list[str]:
        """Tokens that identify the exercise: no filler, no equipment words; sorted, unique."""
        toks = [t for t in self.tokens(name) if t not in self.filler and t not in self.equipment_tokens]
        toks = self._replace_phrases(toks)
        if not toks:  # name made only of equipment/filler words: keep what there is
            toks = [t for t in self.tokens(name) if t not in self.filler] or self.tokens(name)
        return sorted(set(toks))

    def key(self, name: str) -> str:
        return " ".join(self.key_tokens(name))

    def base_key(self, key: str) -> str | None:
        """Key with variation modifiers removed, or None if it has none."""
        toks = key.split()
        base = [t for t in toks if t not in self.modifiers]
        if len(base) == len(toks) or not base:
            return None
        return " ".join(sorted(set(self._replace_phrases(base))))

    def slug(self, name: str, prefix: str | None = None) -> str:
        """Permanent-id slug for a display name (see name_rules.yaml `slug`)."""
        s = ascii_lower(name).replace("&", " and ").replace("'", "").replace("\u2019", "")
        toks: list[str] = []
        for t in re.sub(r"[^a-z0-9]+", " ", s).split():
            toks.extend(self.abbreviations.get(t, (t,)) if t in ("db", "dbs", "bb", "kb", "kbs", "rdl", "rdls",
                                                                  "dumbell", "dumbells", "dumbbells", "barbells",
                                                                  "kettlebells", "cables", "machines", "bands") else (t,))
        toks = [w for t in toks for w in self.slug_words.get(t, (t,))]
        toks = [self.slug_plurals.get(t, t) for t in toks]
        equipment: list[str] = []
        rest: list[str] = []
        i = 0
        while i < len(toks):
            keep = next((p for p in self.slug_keep_phrases if tuple(toks[i:i + len(p)]) == p), None)
            if keep:
                rest.extend(keep)
                i += len(keep)
                continue
            for src, dst in self.slug_equipment:
                if tuple(toks[i:i + len(src)]) == src:
                    if dst not in equipment:
                        equipment.append(dst)
                    i += len(src)
                    break
            else:
                for src in self.slug_filler_phrases:
                    if tuple(toks[i:i + len(src)]) == src:
                        i += len(src)
                        break
                else:
                    if toks[i] not in self.slug_filler:
                        rest.append(toks[i])
                    i += 1
        if not equipment and prefix:
            equipment = [prefix]
        rest = list(dict.fromkeys(rest))  # "Romanian Deadlift (RDL)" -> romanian-deadlift
        return slugify(" ".join(equipment + rest))

    def is_equipment_suffix(self, suffix: str) -> bool:
        """True if a name suffix like "Cable With Rope" only names equipment / attachments."""
        toks = self.tokens(suffix)
        return bool(toks) and all(t in self.equipment_tokens or t in self.suffix_words or t in self.filler
                                  for t in toks)
