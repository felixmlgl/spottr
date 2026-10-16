"""Download the Everkinetic drawings (dist/png/NNNN-relaxation.png, NNNN-tension.png) at the pinned commit.

Files go to exercise-db/media/everkinetic/ (gitignored, never committed). One blobless clone +
sparse checkout. Writes media_manifest.json (path, bytes, sha256), which is committed.

Run from exercise-db/:  uv run python -I sources/everkinetic/fetch_media.py
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from spottr_exdb.adapter import MEDIA_DIR, read_snapshot_meta, sha256_file, source_dir

SOURCE_ID = "everkinetic"
REPO_URL = "https://github.com/everkinetic/data"


def git(*args: str, cwd: Path | None = None) -> str:
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    return subprocess.run(["git", *args], cwd=cwd, env=env, check=True, capture_output=True, text=True).stdout


def main() -> int:
    sha = read_snapshot_meta(SOURCE_ID)["version"]
    out = MEDIA_DIR / SOURCE_ID
    with tempfile.TemporaryDirectory(prefix="spottr-ek-media-") as tmp:
        clone = Path(tmp) / "repo"
        git("clone", "--filter=blob:none", "--no-checkout", REPO_URL, str(clone))
        git("sparse-checkout", "set", "--no-cone", "dist/png/*.png", cwd=clone)
        git("checkout", sha, cwd=clone)
        if out.exists():
            shutil.rmtree(out)
        out.mkdir(parents=True)
        files = {}
        for src in sorted((clone / "dist" / "png").glob("*.png")):
            dst = out / src.name
            shutil.copyfile(src, dst)
            files[f"{SOURCE_ID}/{src.name}"] = {"bytes": dst.stat().st_size, "sha256": sha256_file(dst)}
    manifest = {"source_id": SOURCE_ID, "version": sha, "files": files}
    (source_dir(SOURCE_ID) / "media_manifest.json").write_text(
        json.dumps(manifest, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print(f"{len(files)} images ({sum(f['bytes'] for f in files.values()) / 1e6:.1f} MB) -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
