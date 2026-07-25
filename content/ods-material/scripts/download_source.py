#!/usr/bin/env python3
"""Download and unpack the pinned ODS source archive without creating a Git repo."""

import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from config import (
    ARCHIVE_URL,
    BRANCH_REF,
    EXTRACTOR_VERSION,
    PINNED_COMMIT,
    REPOSITORY,
    ROOT,
    SCHEMA_VERSION,
    SELECTED_EDITION,
)


def remote_commit() -> str:
    result = subprocess.run(
        ["git", "ls-remote", REPOSITORY, BRANCH_REF],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.split()[0]


def safe_extract(archive: Path, destination: Path) -> Path:
    with zipfile.ZipFile(archive) as zf:
        for member in zf.infolist():
            target = (destination / member.filename).resolve()
            if destination.resolve() not in target.parents and target != destination.resolve():
                raise RuntimeError(f"unsafe archive member: {member.filename}")
        zf.extractall(destination)
    roots = [p for p in destination.iterdir() if p.is_dir()]
    if len(roots) != 1:
        raise RuntimeError("archive did not contain exactly one source root")
    return roots[0]


def download_and_unpack(work_dir: Path) -> dict:
    current = remote_commit()
    if current != PINNED_COMMIT:
        raise RuntimeError(
            f"master moved: configured {PINNED_COMMIT}, current {current}; "
            "update the pinned commit intentionally"
        )
    work_dir.mkdir(parents=True, exist_ok=True)
    archive = work_dir / "ods.zip"
    with urllib.request.urlopen(ARCHIVE_URL) as response, archive.open("wb") as out:
        shutil.copyfileobj(response, out)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    unpack_dir = work_dir / "unpacked"
    unpack_dir.mkdir()
    source_root = safe_extract(archive, unpack_dir)
    archive.unlink()
    copying = source_root / "COPYING"
    if not copying.is_file():
        raise RuntimeError("official COPYING file is missing")
    manifest = {
        "repository": REPOSITORY,
        "commit": PINNED_COMMIT,
        "downloaded_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "archive_sha256": digest,
        "source_license": "Creative Commons Attribution 2.5 Canada (see retained COPYING)",
        "selected_edition": SELECTED_EDITION,
        "extractor_version": EXTRACTOR_VERSION,
        "schema_version": SCHEMA_VERSION,
    }
    return {"source_root": str(source_root), "manifest": manifest}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--work-dir", type=Path)
    parser.add_argument("--result", type=Path)
    args = parser.parse_args()
    owned = args.work_dir is None
    work_dir = args.work_dir or Path(tempfile.mkdtemp(prefix="ods-source-"))
    result = download_and_unpack(work_dir)
    if args.result:
        args.result.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    else:
        print(json.dumps(result, indent=2))
    if owned:
        print(f"temporary source retained at {work_dir}")


if __name__ == "__main__":
    main()
