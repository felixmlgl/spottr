"""`make build`: merge the normalized sources and write dist/ and reports/.

    python -I -m spottr_exdb.build [--out DIR] [--reports DIR] [--registry-readonly] [--sources a,b]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .adapter import ROOT
from .export import write_all
from .merge import build, write_registry
from .report import write_reports
from .taxonomy import BuildError, load_taxonomy

REGISTRY = ROOT / "taxonomy" / "id_registry.csv"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", type=Path, default=ROOT / "dist")
    ap.add_argument("--reports", type=Path, default=ROOT / "reports")
    ap.add_argument("--registry", type=Path, default=REGISTRY)
    ap.add_argument("--registry-readonly", action="store_true",
                    help="fail instead of adding new ids to the registry (used by validate)")
    ap.add_argument("--sources", help="comma-separated source list instead of config.yaml (experiments)")
    args = ap.parse_args(argv)

    try:
        tax = load_taxonomy(ROOT, args.sources.split(",") if args.sources else None)
        res = build(tax, args.registry)
    except BuildError as exc:
        print(f"BUILD FAILED\n{exc}", file=sys.stderr)
        return 1

    if res.new_registry_rows:
        if args.registry_readonly:
            print(f"BUILD FAILED\nid_registry.csv is missing {res.new_registry_rows} records; run `make build`.",
                  file=sys.stderr)
            return 1
        write_registry(args.registry, res.registry_rows)

    tables = write_all(res, args.out)
    write_reports(res, tables, args.reports)
    n_ex = len(res.exercises)
    n_rec = len(res.records)
    linked = sum(1 for a in res.assignments.values() if a.exercise_id)
    print(f"built {n_ex} exercises from {linked}/{n_rec} source records "
          f"({res.new_registry_rows} new ids, {len(res.review_queue)} in review) -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
