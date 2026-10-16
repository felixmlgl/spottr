"""raw/exercises.json + positions.yaml -> normalized.jsonl.

- source_record_id: the record's numeric `id` (`id_num` is not unique: 0020 is used twice).
- Names, equipment and steps are passed through. Muscles and `type` are not emitted (unreliable,
  see source.yaml), so these records only attach to existing exercises.
- images: dist/png/<id_num>-relaxation.png and -tension.png, ordered start/end by positions.yaml
  (checked by eye). No images when the id_num is shared, a drawing is missing, or positions.yaml
  has no usable entry.
"""

import json
import sys
from collections import Counter

import yaml

from spottr_exdb.adapter import make_record, read_snapshot_meta, source_dir, write_normalized

SOURCE_ID = "everkinetic"
LICENSE = "CC-BY-SA-4.0"
AUTHOR = "Everkinetic"
RAW_URL = "https://raw.githubusercontent.com/everkinetic/data/{sha}/dist/png/{name}"
DATA_URL = "https://github.com/everkinetic/data/blob/{sha}/exercises.json"


def main() -> int:
    sdir = source_dir(SOURCE_ID)
    sha = read_snapshot_meta(SOURCE_ID)["version"]
    recs = json.loads((sdir / "raw" / "exercises.json").read_text(encoding="utf-8"))
    pngs = {line.rsplit("/", 1)[-1] for line in (sdir / "raw" / "ls-tree-dist-png.txt").read_text().split()}
    pos_path = sdir / "positions.yaml"
    positions = {str(k): v for k, v in (yaml.safe_load(pos_path.read_text(encoding="utf-8")) or {}).items()} \
        if pos_path.exists() else {}
    shared = {k for k, n in Counter(r["id_num"] for r in recs).items() if n > 1}

    records = []
    for r in recs:
        images = []
        start = (positions.get(r["id_num"]) or {}).get("start")
        files = {kind: f"{r['id_num']}-{kind}.png" for kind in ("relaxation", "tension")}
        if r["id_num"] not in shared and start in files and all(f in pngs for f in files.values()):
            end = "tension" if start == "relaxation" else "relaxation"
            for position, kind in (("start", start), ("end", end)):
                images.append({"position": position, "path": f"{SOURCE_ID}/{files[kind]}",
                               "url": RAW_URL.format(sha=sha, name=files[kind]), "license": LICENSE,
                               "author": AUTHOR})
        records.append(make_record(
            source_id=SOURCE_ID, source_record_id=r["id"], source_url=DATA_URL.format(sha=sha),
            license=LICENSE, author=AUTHOR, name_en=r["title"].strip(),
            equipment=list(r.get("equipment") or []),
            instructions=[s.strip() for s in r.get("steps") or [] if s and s.strip()],
            images=images, raw=r,
        ))
    out = write_normalized(SOURCE_ID, records)
    print(f"wrote {len(records)} records ({sum(1 for r in records if r['images'])} with images) to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
