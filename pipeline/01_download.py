"""Download every source in sources.py into data/raw/ and write data/raw/MANIFEST.csv.

Re-running skips files already on disk, so data/raw/ is a frozen snapshot; delete a file to refresh it.
Run: uv run python pipeline/01_download.py
"""
import csv
import hashlib
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from sources import all_sources

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data/raw"
MANIFEST = RAW / "MANIFEST.csv"
# SEC asks automated clients to identify themselves; other sites get a normal browser string.
UA = {"sec": "DataAnalyticsPortfolio research (personal portfolio project)", "default": "Mozilla/5.0"}
MAGIC = {".json": (b"{", b"["), ".xls": (b"\xd0\xcf",), ".xlsx": (b"PK",), ".csv": (b'"', b"Series")}


def fetch(url: str, dest: Path) -> None:
    ua = UA["sec"] if "sec.gov" in url else UA["default"]
    req = urllib.request.Request(url, headers={"User-Agent": ua})
    with urllib.request.urlopen(req, timeout=120) as r:
        body = r.read()
    # Some sites answer errors or bot checks with an HTML page and status 200.
    if not body.lstrip().startswith(MAGIC[dest.suffix]):
        raise ValueError(f"unexpected content for {dest.suffix}: {body[:80]!r}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(body)


def main() -> int:
    old = {}
    if MANIFEST.exists():
        with open(MANIFEST, newline="") as f:
            old = {r["file"]: r for r in csv.DictReader(f)}
    rows, failed = [], []
    for rel, url, purpose in all_sources():
        dest = RAW / rel
        if not dest.exists():
            try:
                print(f"get  {rel}", flush=True)
                fetch(url, dest)
                time.sleep(0.5)
            except Exception as e:
                failed.append((rel, str(e)))
                continue
        data = dest.read_bytes()
        rows.append({"file": rel, "url": url, "purpose": purpose, "bytes": len(data),
                     "sha256": hashlib.sha256(data).hexdigest(),
                     "downloaded_utc": old.get(rel, {}).get("downloaded_utc")
                     or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")})
    with open(MANIFEST, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} files in manifest, {len(failed)} failed")
    for rel, err in failed:
        print(f"FAILED {rel}: {err}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
