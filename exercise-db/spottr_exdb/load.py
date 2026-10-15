"""`make load`: load schema + seed into Postgres (e.g. Supabase). Only runs when DATABASE_URL is set.

Creates the tables from schema/schema.sql if `exercises` does not exist yet, then runs
dist/seed.sql (one transaction that replaces all rows). Uses `psql` if it is installed,
otherwise psycopg (`uv run --with 'psycopg[binary]' python -I -m spottr_exdb.load`).
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys

from .adapter import ROOT

SCHEMA = ROOT / "schema" / "schema.sql"
SEED = ROOT / "dist" / "seed.sql"
EXISTS_SQL = "SELECT to_regclass('public.exercises') IS NOT NULL"


def via_psql(url: str) -> None:
    exists = subprocess.run(["psql", url, "-tAc", EXISTS_SQL], capture_output=True, text=True, check=True).stdout.strip()
    if exists != "t":
        subprocess.run(["psql", url, "-v", "ON_ERROR_STOP=1", "-1", "-f", str(SCHEMA)], check=True)
    subprocess.run(["psql", url, "-v", "ON_ERROR_STOP=1", "-f", str(SEED)], check=True)


def via_psycopg(url: str) -> None:
    import psycopg  # type: ignore[import-not-found]

    with psycopg.connect(url, autocommit=True) as con:
        exists = con.execute(EXISTS_SQL).fetchone()[0]
        if not exists:
            with con.transaction():
                con.execute(SCHEMA.read_text(encoding="utf-8"))
        con.execute(SEED.read_text(encoding="utf-8"))  # seed.sql has its own BEGIN/COMMIT


def main() -> int:
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set: skipping load.")
        return 0
    if not SEED.exists():
        print("dist/seed.sql missing: run `make build` first.", file=sys.stderr)
        return 1
    if shutil.which("psql"):
        via_psql(url)
    else:
        try:
            via_psycopg(url)
        except ImportError:
            print("Neither psql nor psycopg is available. Install psql, or run:\n"
                  "  uv run --with 'psycopg[binary]' python -I -m spottr_exdb.load", file=sys.stderr)
            return 1
    print("Loaded schema/schema.sql + dist/seed.sql into DATABASE_URL.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
