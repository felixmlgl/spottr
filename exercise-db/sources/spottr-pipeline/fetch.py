"""Snapshot the vision pipeline's exercise vocabulary at git HEAD:
backend/vision/exercises.py (EXERCISES: label -> muscle weights) and backend/vision/classify.py
(EQUIPMENT: the equipment values the classifier outputs next to the label).

Reads the committed files with `git show` (never the working copy, never modifies backend/).
"""

import subprocess
import sys

from spottr_exdb.adapter import ROOT, source_dir, utc_now_iso, write_snapshot_meta

SOURCE_ID = "spottr-pipeline"
PATHS = ("backend/vision/exercises.py", "backend/vision/classify.py")


def git(*args: str) -> str:
    top = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=ROOT, capture_output=True, text=True,
                         check=True).stdout.strip()
    return subprocess.run(["git", *args], cwd=top, capture_output=True, text=True, check=True).stdout


def main() -> int:
    raw = source_dir(SOURCE_ID) / "raw"
    raw.mkdir(parents=True, exist_ok=True)
    for p in raw.iterdir():
        p.unlink()
    sha = git("log", "-1", "--format=%H", "HEAD", "--", *PATHS).strip()
    if not sha:
        print(f"{PATHS} not found in git history", file=sys.stderr)
        return 1
    for path in PATHS:
        (raw / path.rsplit("/", 1)[1]).write_text(git("show", f"{sha}:{path}"), encoding="utf-8")
    commit_date = git("log", "-1", "--format=%cI", sha).strip()
    write_snapshot_meta(SOURCE_ID, retrieved_at=utc_now_iso(), version=sha, url="backend/vision/",
                        extra={"commit_date": commit_date, "paths": list(PATHS)})
    print(f"snapshot of {PATHS} at {sha}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
