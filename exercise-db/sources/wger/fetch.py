"""Download the wger raw snapshot into sources/wger/raw/.

Data channel: the official wger repository on GitHub, pinned to a commit SHA.

The wger REST API (https://wger.de/api/v2/) is off-limits for this build: https://wger.de/robots.txt
has `User-Agent: *` / `Disallow: /api/v2`, and the HTML site sits behind an Anubis bot wall. wger
ships the same exercise data as Django fixtures in its repository (`wger/exercises/fixtures/`,
produced from a `dumpdata` of the wger.de exercise tables by `extras/scripts/filter-fixtures.py`;
reference lists in `wger/core/fixtures/`). Those files are downloaded byte for byte, unaltered.

Requests (all through PoliteClient, <= 1/s, robots.txt checked):
- wger.de/robots.txt (only to record whether the API is still disallowed),
- api.github.com: resolve `master` to a commit SHA, find the commit that last touched each file,
- raw.githubusercontent.com: wger/version.py and the fixture files at that SHA.
No images or videos are downloaded (the fixtures contain none).

Run from exercise-db/: uv run python -I sources/wger/fetch.py
"""

from __future__ import annotations

import json
import re

from spottr_exdb.adapter import (
    PoliteClient,
    source_dir,
    utc_now_iso,
    write_snapshot_meta,
)

SOURCE_ID = "wger"
REPO = "wger-project/wger"
REF = "master"
API_PROBE_URL = "https://wger.de/api/v2/exerciseinfo/"

# raw/<file name> -> (path in the wger repository, Django models the file must contain)
FILES = {
    "exercise-base-data.json": ("wger/exercises/fixtures/exercise-base-data.json", {"exercises.exercise"}),
    "translations.json": ("wger/exercises/fixtures/translations.json",
                          {"exercises.translation", "exercises.alias", "exercises.exercisecomment"}),
    "muscles.json": ("wger/exercises/fixtures/muscles.json", {"exercises.muscle"}),
    "equipment.json": ("wger/exercises/fixtures/equipment.json", {"exercises.equipment"}),
    "categories.json": ("wger/exercises/fixtures/categories.json", {"exercises.exercisecategory"}),
    "languages.json": ("wger/core/fixtures/languages.json", {"core.language"}),
    "licenses.json": ("wger/core/fixtures/licenses.json", {"core.license"}),
}


def raw_url(sha: str, path: str) -> str:
    return f"https://raw.githubusercontent.com/{REPO}/{sha}/{path}"


def check_fixture(name: str, body: bytes, models: set[str]) -> int:
    """Fail loudly if a file is not the Django fixture we expect. Returns the object count."""
    data = json.loads(body.decode("utf-8"))
    if not isinstance(data, list) or not data:
        raise ValueError(f"{name}: expected a non-empty JSON list")
    found = {obj.get("model") for obj in data}
    if not found <= models:
        raise ValueError(f"{name}: unexpected models {sorted(found - models)}")
    if any(not isinstance(obj.get("pk"), int) or not isinstance(obj.get("fields"), dict) for obj in data):
        raise ValueError(f"{name}: object without integer pk or fields")
    return len(data)


def main() -> None:
    raw_dir = source_dir(SOURCE_ID) / "raw"
    client = PoliteClient()
    try:
        api_allowed = client.allowed(API_PROBE_URL)
        if api_allowed:
            print(f"note: robots.txt now allows {API_PROBE_URL}; the REST API could be used instead")

        retrieved_at = utc_now_iso()
        head = client.get(f"https://api.github.com/repos/{REPO}/commits/{REF}").json()
        sha = head["sha"]
        print(f"{REPO}@{REF} = {sha} ({head['commit']['committer']['date']})")

        # Last upstream commit per file (for the exercise files: the last dump from wger.de).
        data_commits = {}
        for name, (path, _) in FILES.items():
            last = client.get(f"https://api.github.com/repos/{REPO}/commits",
                              params={"path": path, "sha": sha, "per_page": 1}).json()[0]
            data_commits[name] = {"sha": last["sha"], "date": last["commit"]["committer"]["date"],
                                  "message": last["commit"]["message"].splitlines()[0]}

        version_py = client.get(raw_url(sha, "wger/version.py")).text
        m = re.search(r"^VERSION_STRING\s*=\s*['\"]([^'\"]+)['\"]", version_py, re.M)
        wger_version = m.group(1) if m else None

        bodies = {}
        for name, (path, models) in FILES.items():
            body = client.get(raw_url(sha, path)).content
            count = check_fixture(name, body, models)
            bodies[name] = body
            print(f"{name}: {count} objects, {len(body)} bytes")
    finally:
        client.close()

    # Replace the snapshot only after everything downloaded and validated.
    raw_dir.mkdir(parents=True, exist_ok=True)
    for old in raw_dir.iterdir():
        if old.is_file():
            old.unlink()
    for name, body in bodies.items():
        (raw_dir / name).write_bytes(body)

    out = write_snapshot_meta(
        SOURCE_ID,
        retrieved_at=retrieved_at,
        version=sha,
        url=f"https://github.com/{REPO}/tree/{sha}",
        extra={
            "channel": "official wger repository fixtures (Django dumpdata of the wger.de exercise tables)",
            "repo": f"https://github.com/{REPO}",
            "ref": REF,
            "commit_date": head["commit"]["committer"]["date"],
            "wger_version": wger_version,
            "data_commits": data_commits,
            "upstream": {name: raw_url(sha, path) for name, (path, _) in FILES.items()},
            "rest_api_robots_allowed": api_allowed,
            "rest_api_note": "https://wger.de/robots.txt disallows /api/v2 for all user agents",
        },
    )
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
