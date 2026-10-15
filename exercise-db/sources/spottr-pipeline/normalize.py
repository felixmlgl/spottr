"""raw/ -> normalized.jsonl: one record per pipeline output (exercise label x equipment).

The classifier outputs an exercise label (exercises.py EXERCISES) plus an equipment value
(classify.py EQUIPMENT); record id = "<label>:<equipment>", the same string as the
pipeline_label alias. The muscle weights belong to the label; they become roles:
>= 0.8 primary, >= 0.4 secondary, otherwise stabilizer. The label "other" (no muscles) is skipped.
Files are parsed with `ast` (never imported or executed).
"""

import ast
import sys

from spottr_exdb.adapter import make_record, source_dir, write_normalized

SOURCE_ID = "spottr-pipeline"
PRIMARY, SECONDARY = 0.8, 0.4


def read_constant(filename: str, name: str):
    tree = ast.parse((source_dir(SOURCE_ID) / "raw" / filename).read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise ValueError(f"{name} not found in raw/{filename}")


def main() -> int:
    exercises = read_constant("exercises.py", "EXERCISES")
    equipment = read_constant("classify.py", "EQUIPMENT")
    records = []
    for label, weights in exercises.items():
        if not weights:
            continue
        roles = {"primary": [], "secondary": [], "stabilizer": []}
        for muscle, w in sorted(weights.items(), key=lambda kv: (-kv[1], kv[0])):
            role = "primary" if w >= PRIMARY else "secondary" if w >= SECONDARY else "stabilizer"
            roles[role].append(muscle)
        for eq in equipment:
            records.append(make_record(
                source_id=SOURCE_ID, source_record_id=f"{label}:{eq}",
                source_url="backend/vision/exercises.py#EXERCISES",
                license="LicenseRef-Spottr-Internal", author="Spottr",
                name_en=f"{label.replace('_', ' ').capitalize()} ({eq.replace('_', ' ')})",
                equipment=[eq],
                primary_muscles_raw=roles["primary"], secondary_muscles_raw=roles["secondary"],
                stabilizer_muscles_raw=roles["stabilizer"],
                raw={"label": label, "equipment": eq, "weights": weights},
            ))
    out = write_normalized(SOURCE_ID, records)
    print(f"wrote {len(records)} records to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
