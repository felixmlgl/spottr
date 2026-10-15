"""Helpers shared by the source adapters (sources/<source_id>/fetch.py and normalize.py).

See PLAN.md for the adapter contract.
"""

from __future__ import annotations

import hashlib
import json
import time
import urllib.robotparser
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

import httpx

ROOT = Path(__file__).resolve().parent.parent
SOURCES_DIR = ROOT / "sources"
MEDIA_DIR = ROOT / "media"  # downloaded images; gitignored, never committed
USER_AGENT = "spottr-exercise-db/0.1 (+https://tryspottr.app; dataset build, 1 req/s)"

# Key order of one normalized.jsonl line.
RECORD_KEYS = (
    "source_id", "source_record_id", "source_url", "license", "author",
    "name_en", "name_de", "aliases", "category", "equipment",
    "mechanic", "force", "level", "laterality",
    "primary_muscles_raw", "secondary_muscles_raw", "stabilizer_muscles_raw",
    "instructions", "images", "raw",
)
LIST_KEYS = {"aliases", "equipment", "primary_muscles_raw", "secondary_muscles_raw",
             "stabilizer_muscles_raw", "instructions", "images"}
IMAGE_KEYS = {"position", "path", "url", "license", "author"}

ENUMS = {
    "mechanic": {"compound", "isolation"},
    "force": {"push", "pull", "static", "other"},
    "level": {"beginner", "intermediate", "advanced"},
    "laterality": {"bilateral", "unilateral", "alternating"},
}


def source_dir(source_id: str) -> Path:
    return SOURCES_DIR / source_id


def make_record(**fields) -> dict:
    """One normalized record with every contract key, in contract order."""
    unknown = set(fields) - set(RECORD_KEYS)
    if unknown:
        raise ValueError(f"unknown record keys: {sorted(unknown)}")
    rec = {}
    for key in RECORD_KEYS:
        rec[key] = fields.get(key, [] if key in LIST_KEYS else ({} if key == "raw" else None))
    for key, allowed in ENUMS.items():
        if rec[key] is not None and rec[key] not in allowed:
            raise ValueError(f"{rec['source_id']}/{rec['source_record_id']}: {key}={rec[key]!r} not in {sorted(allowed)}")
    for alias in rec["aliases"]:
        if not (isinstance(alias, dict) and set(alias) == {"alias", "lang"}):
            raise ValueError(f"alias must be {{'alias', 'lang'}}: {alias!r}")
    for img in rec["images"]:
        if not (isinstance(img, dict) and set(img) == IMAGE_KEYS and img["position"] in ("start", "end")):
            raise ValueError(f"image must be {sorted(IMAGE_KEYS)} with position start|end: {img!r}")
    rec["source_record_id"] = str(rec["source_record_id"])
    return rec


def _record_sort_key(rec: dict):
    rid = rec["source_record_id"]
    return (0, int(rid), "") if rid.isdigit() else (1, 0, rid)


def write_normalized(source_id: str, records: list[dict]) -> Path:
    """Write sources/<source_id>/normalized.jsonl, sorted, deterministic."""
    ids = [r["source_record_id"] for r in records]
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    if dupes:
        raise ValueError(f"duplicate source_record_id in {source_id}: {dupes[:10]}")
    out = source_dir(source_id) / "normalized.jsonl"
    with out.open("w", encoding="utf-8", newline="\n") as fh:
        for rec in sorted(records, key=_record_sort_key):
            fh.write(json.dumps(rec, ensure_ascii=False, separators=(", ", ": ")) + "\n")
    return out


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def write_snapshot_meta(source_id: str, *, retrieved_at: str, version: str | None, url: str,
                        extra: dict | None = None) -> Path:
    """Write raw/SNAPSHOT.json listing every file in raw/ with size and sha256."""
    raw = source_dir(source_id) / "raw"
    files = [
        {"path": p.relative_to(raw).as_posix(), "bytes": p.stat().st_size, "sha256": sha256_file(p)}
        for p in sorted(raw.rglob("*")) if p.is_file() and p.name != "SNAPSHOT.json"
    ]
    meta = {"source_id": source_id, "retrieved_at": retrieved_at, "version": version, "url": url,
            "files": files}
    if extra:
        meta.update(extra)
    out = raw / "SNAPSHOT.json"
    out.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out


def read_snapshot_meta(source_id: str) -> dict:
    return json.loads((source_dir(source_id) / "raw" / "SNAPSHOT.json").read_text(encoding="utf-8"))


class PoliteClient:
    """httpx client that checks robots.txt and keeps at most one request per `min_interval` seconds."""

    def __init__(self, min_interval: float = 1.0, timeout: float = 60.0):
        self.min_interval = min_interval
        self._last = 0.0
        self._robots: dict[str, urllib.robotparser.RobotFileParser] = {}
        self.client = httpx.Client(headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
                                   timeout=timeout, follow_redirects=True)

    def _wait(self):
        delta = time.monotonic() - self._last
        if delta < self.min_interval:
            time.sleep(self.min_interval - delta)
        self._last = time.monotonic()

    def allowed(self, url: str) -> bool:
        parts = urlsplit(url)
        origin = f"{parts.scheme}://{parts.netloc}"
        if origin not in self._robots:
            rp = urllib.robotparser.RobotFileParser()
            self._wait()
            resp = self.client.get(origin + "/robots.txt")
            rp.parse(resp.text.splitlines() if resp.status_code == 200 else [])
            self._robots[origin] = rp
        return self._robots[origin].can_fetch(USER_AGENT, url)

    def get(self, url: str, **kw) -> httpx.Response:
        if not self.allowed(url):
            raise PermissionError(f"robots.txt disallows {url}")
        for attempt in range(4):
            self._wait()
            resp = self.client.get(url, **kw)
            if resp.status_code in (429, 502, 503, 504):
                time.sleep(5 * (attempt + 1))
                continue
            resp.raise_for_status()
            return resp
        resp.raise_for_status()
        return resp

    def close(self):
        self.client.close()
