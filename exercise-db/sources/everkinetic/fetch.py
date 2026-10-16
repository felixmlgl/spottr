"""Snapshot everkinetic/data metadata at the current commit into raw/ (no images).

Commit resolved with `git ls-remote`; files from raw.githubusercontent.com pinned to that SHA via
PoliteClient. Also stores the list of drawings in dist/png (`git ls-tree`, names only, no blobs) so
normalize.py knows which images exist without network access.
"""

import subprocess
import sys
import tempfile
from pathlib import Path

from spottr_exdb.adapter import PoliteClient, source_dir, utc_now_iso, write_snapshot_meta

SOURCE_ID = "everkinetic"
REPO = "https://github.com/everkinetic/data"
FILES = ("exercises.json", "LICENSE.md", "README.md")


def main() -> int:
    sha = subprocess.run(["git", "ls-remote", REPO, "HEAD"], capture_output=True, text=True, check=True).stdout.split()[0]
    raw = source_dir(SOURCE_ID) / "raw"
    raw.mkdir(parents=True, exist_ok=True)
    for p in raw.iterdir():
        p.unlink()
    client = PoliteClient()
    try:
        for name in FILES:
            (raw / name).write_bytes(client.get(f"https://raw.githubusercontent.com/everkinetic/data/{sha}/{name}").content)
    finally:
        client.close()
    with tempfile.TemporaryDirectory(prefix="spottr-ek-") as tmp:
        clone = Path(tmp) / "repo"
        subprocess.run(["git", "clone", "-q", "--filter=blob:none", "--no-checkout", REPO, str(clone)], check=True)
        listing = subprocess.run(["git", "ls-tree", "--name-only", sha, "dist/png/"], cwd=clone, capture_output=True,
                                 text=True, check=True).stdout
    (raw / "ls-tree-dist-png.txt").write_text(listing, encoding="utf-8")
    write_snapshot_meta(SOURCE_ID, retrieved_at=utc_now_iso(), version=sha, url=REPO)
    print(f"snapshot of {REPO} at {sha}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
