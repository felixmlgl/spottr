"""Download longhaul-fitness/exercises data files at the current commit into raw/.

The commit is resolved with `git ls-remote` (no clone); files come from raw.githubusercontent.com
pinned to that SHA, through PoliteClient (robots.txt, <= 1 request/s). Data files only, no media.
"""

import subprocess
import sys

from spottr_exdb.adapter import PoliteClient, source_dir, utc_now_iso, write_snapshot_meta

SOURCE_ID = "longhaul-fitness"
REPO = "https://github.com/longhaul-fitness/exercises"
FILES = ("LICENSE", "README.md", "strength.json", "flexibility.json", "cardio.json")


def main() -> int:
    out = subprocess.run(["git", "ls-remote", REPO, "HEAD"], capture_output=True, text=True, check=True).stdout
    sha = out.split()[0]
    raw = source_dir(SOURCE_ID) / "raw"
    raw.mkdir(parents=True, exist_ok=True)
    for p in raw.iterdir():
        p.unlink()
    client = PoliteClient()
    try:
        for name in FILES:
            resp = client.get(f"https://raw.githubusercontent.com/longhaul-fitness/exercises/{sha}/{name}")
            (raw / name).write_bytes(resp.content)
    finally:
        client.close()
    write_snapshot_meta(SOURCE_ID, retrieved_at=utc_now_iso(), version=sha, url=REPO)
    print(f"snapshot of {REPO} at {sha}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
