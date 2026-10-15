"""Download the free-exercise-db exercise photos (exercises/<id>/0.jpg, 1.jpg) at the pinned commit.

The photos go to exercise-db/media/free-exercise-db/<id>/<n>.jpg, which is gitignored: they are
never committed (public repo; provenance disputed, see PROVENANCE.md). The commit is the one in
raw/SNAPSHOT.json, so images always match the ingested data. One blobless clone + sparse checkout
(a single git fetch for the image blobs). Writes media_manifest.json (path, bytes, sha256), which
is small and committed, so the build can record each image's hash without the files.

Run from exercise-db/:  uv run python -I sources/free-exercise-db/fetch_media.py
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from spottr_exdb.adapter import MEDIA_DIR, read_snapshot_meta, sha256_file, source_dir  # noqa: E402

SOURCE_ID = "free-exercise-db"
REPO_URL = "https://github.com/yuhonas/free-exercise-db"


def git(*args: str, cwd: Path | None = None) -> str:
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GIT_LFS_SKIP_SMUDGE": "1"}
    return subprocess.run(["git", *args], cwd=cwd, env=env, check=True, capture_output=True, text=True).stdout


def main() -> int:
    sha = read_snapshot_meta(SOURCE_ID)["version"]
    out = MEDIA_DIR / SOURCE_ID
    with tempfile.TemporaryDirectory(prefix="spottr-fedb-media-") as tmp:
        clone = Path(tmp) / "repo"
        git("clone", "--filter=blob:none", "--no-checkout", REPO_URL, str(clone))
        git("sparse-checkout", "set", "--no-cone", "exercises/*/*.jpg", cwd=clone)
        git("checkout", sha, cwd=clone)
        if out.exists():
            shutil.rmtree(out)
        files = {}
        for src in sorted((clone / "exercises").glob("*/*.jpg")):
            rel = src.relative_to(clone / "exercises").as_posix()
            dst = out / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dst)
            files[f"{SOURCE_ID}/{rel}"] = {"bytes": dst.stat().st_size, "sha256": sha256_file(dst)}
    manifest = {"source_id": SOURCE_ID, "version": sha, "files": files}
    (source_dir(SOURCE_ID) / "media_manifest.json").write_text(
        json.dumps(manifest, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    total = sum(f["bytes"] for f in files.values())
    print(f"{len(files)} images ({total / 1e6:.1f} MB) -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
