"""Fetch the raw free-exercise-db snapshot into sources/free-exercise-db/raw/.

The repository also holds ~1,750 exercise photos under exercises/<id>/*.jpg. We must not
download any images, so this does a blobless, shallow, no-checkout clone (only commits and
trees are transferred) and then checks out just the few text files we need; git fetches
only those blobs. A guard afterwards fails if any other blob ended up in the object store.

raw/ afterwards contains (repo-relative paths kept, files byte-identical to the repo):
  dist/exercises.json      the combined dataset (what normalize.py reads)
  LICENSE.md, README.md    license and provenance evidence
  schema.json              the repo's JSON schema (field vocabularies)
  ls-tree-exercises.txt    verbatim `git ls-tree HEAD exercises/` (names of the per-exercise
                           JSON files, used for stable per-record source URLs; no blobs needed)
  SNAPSHOT.json            commit SHA, commit date, file sizes and hashes

Run from exercise-db/:  uv run python -I sources/free-exercise-db/fetch.py
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from spottr_exdb.adapter import source_dir, utc_now_iso, write_snapshot_meta  # noqa: E402

SOURCE_ID = "free-exercise-db"
REPO_URL = "https://github.com/yuhonas/free-exercise-db"
# Text files to check out. Never add anything under exercises/ (images live there).
REPO_FILES = ("dist/exercises.json", "LICENSE.md", "README.md", "schema.json")
LS_TREE_FILE = "ls-tree-exercises.txt"


def git(*args: str, cwd: Path | None = None) -> str:
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GIT_LFS_SKIP_SMUDGE": "1"}
    out = subprocess.run(["git", *args], cwd=cwd, env=env, check=True,
                         capture_output=True, text=True)
    time.sleep(1.0)  # keep network-touching git calls >= 1 s apart
    return out.stdout


def main() -> None:
    for f in REPO_FILES:
        if f.startswith("exercises/") or f.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".mp4")):
            raise SystemExit(f"refusing to check out media path: {f}")

    raw = source_dir(SOURCE_ID) / "raw"
    with tempfile.TemporaryDirectory(prefix="spottr-fedb-") as tmp:
        clone = Path(tmp) / "repo"
        git("clone", "--filter=blob:none", "--no-checkout", "--depth", "1", REPO_URL, str(clone))
        sha = git("rev-parse", "HEAD", cwd=clone).strip()
        commit_date = git("log", "-1", "--format=%cI", "HEAD", cwd=clone).strip()

        missing = [f for f in REPO_FILES
                   if not git("ls-tree", "HEAD", "--", f, cwd=clone).strip()]
        if missing:
            raise SystemExit(f"not in repo at {sha}: {missing}")

        ls_tree = git("ls-tree", "HEAD", "exercises/", cwd=clone)  # trees only, no blob fetch
        git("checkout", "HEAD", "--", *REPO_FILES, cwd=clone)

        # Guard: the only blobs present locally must be the ones we asked for.
        objects = git("cat-file", "--batch-all-objects", "--batch-check=%(objecttype) %(objectname)",
                      cwd=clone)
        local_blobs = {line.split()[1] for line in objects.splitlines() if line.startswith("blob ")}
        wanted = {git("rev-parse", f"HEAD:{f}", cwd=clone).strip() for f in REPO_FILES}
        extra = local_blobs - wanted
        if extra:
            raise SystemExit(f"unexpected blobs downloaded ({len(extra)}), aborting")

        if raw.exists():
            shutil.rmtree(raw)
        raw.mkdir(parents=True)
        for f in REPO_FILES:
            dest = raw / f
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(clone / f, dest)
        (raw / LS_TREE_FILE).write_text(ls_tree, encoding="utf-8", newline="\n")

    meta = write_snapshot_meta(
        SOURCE_ID, retrieved_at=utc_now_iso(), version=sha, url=REPO_URL,
        extra={
            "commit_date": commit_date,
            "method": "git clone --filter=blob:none --no-checkout --depth 1; "
                      f"git checkout HEAD -- {' '.join(REPO_FILES)}",
            "ls_tree_file": f"{LS_TREE_FILE} = git ls-tree HEAD exercises/",
        },
    )
    print(f"{SOURCE_ID}: {sha} ({commit_date}) -> {meta.relative_to(source_dir(SOURCE_ID).parent.parent)}")


if __name__ == "__main__":
    main()
