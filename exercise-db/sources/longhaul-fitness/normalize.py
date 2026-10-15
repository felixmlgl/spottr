"""raw/{strength,flexibility,cardio}.json -> normalized.jsonl.

- source_record_id: the record's `pk` (uuid).
- category: the file it comes from (strength / flexibility / cardio), mapped in config.yaml.
- equipment: the name suffix after " – " ("Squat – Barbell" -> "Barbell"), raw; mapped in
  taxonomy/equipment.yaml. Names without a suffix have no equipment field.
- instructions: `steps` (strength, flexibility) or `instructions` (cardio).
"""

import json
import re
import sys

from spottr_exdb.adapter import make_record, read_snapshot_meta, source_dir, write_normalized

SOURCE_ID = "longhaul-fitness"
FILES = ("strength", "flexibility", "cardio")
SUFFIX = re.compile(r"\s[–-]\s([^–]+)$")


def main() -> int:
    raw_dir = source_dir(SOURCE_ID) / "raw"
    sha = read_snapshot_meta(SOURCE_ID)["version"]
    records = []
    for stem in FILES:
        for rec in json.loads((raw_dir / f"{stem}.json").read_text(encoding="utf-8")):
            name = rec["name"].strip()
            m = SUFFIX.search(name)
            steps = rec.get("steps") or rec.get("instructions") or []
            if isinstance(steps, str):
                steps = [steps]
            records.append(make_record(
                source_id=SOURCE_ID, source_record_id=rec["pk"],
                source_url=f"https://github.com/longhaul-fitness/exercises/blob/{sha}/{stem}.json",
                license="MIT", author="Longhaul Fitness",
                name_en=name, category=stem,
                equipment=[m.group(1).strip()] if m else [],
                primary_muscles_raw=list(rec.get("primaryMuscles") or []),
                secondary_muscles_raw=list(rec.get("secondaryMuscles") or []),
                instructions=[s.strip() for s in steps if s and s.strip()],
                raw=rec,
            ))
    out = write_normalized(SOURCE_ID, records)
    print(f"wrote {len(records)} records to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
