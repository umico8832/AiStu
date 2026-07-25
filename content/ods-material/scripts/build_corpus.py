#!/usr/bin/env python3
"""Complete reproducible build entry point for the ODS pseudocode corpus."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

sys.dont_write_bytecode = True

from config import ROOT
from download_source import download_and_unpack
from extract_corpus import extract
from preprocess import preprocess
from validate import run_validation


def clean_outputs() -> None:
    for relative in ("corpus", "reports", "source_snapshot"):
        target = ROOT / relative
        if target.exists():
            shutil.rmtree(target)
        target.mkdir(parents=True)
    (ROOT / "corpus/chapters").mkdir()
    (ROOT / "source_snapshot/original_tex").mkdir()
    (ROOT / "source_snapshot/generated_python_tex").mkdir()
    (ROOT / "source_snapshot/referenced_python_code").mkdir()
    for cache in ROOT.rglob("__pycache__"):
        shutil.rmtree(cache)
    for compiled in ROOT.rglob("*.pyc"):
        compiled.unlink()


def append_log(message: str) -> None:
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    with (ROOT / "reports/extraction.log").open("a", encoding="utf-8") as out:
        out.write(f"{timestamp} {message}\n")


def run() -> dict:
    clean_outputs()
    append_log("build started; no language-model, OCR, PDF, EPUB, or HTML extraction used")
    with tempfile.TemporaryDirectory(prefix="ods-material-build-") as temporary:
        work_dir = Path(temporary)
        append_log("resolving refs/heads/master and downloading pinned codeload ZIP")
        download = download_and_unpack(work_dir / "download")
        source_root = Path(download["source_root"])
        (ROOT / "corpus/manifest.json").write_text(
            json.dumps(download["manifest"], ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        append_log(
            f"downloaded commit={download['manifest']['commit']} "
            f"archive_sha256={download['manifest']['archive_sha256']}"
        )

        test_environment = dict(os.environ)
        test_environment["PYTHONDONTWRITEBYTECODE"] = "1"
        subprocess.run(
            [sys.executable, "-m", "unittest", "discover", "-s", "scripts/tests", "-v"],
            cwd=ROOT,
            env=test_environment,
            check=True,
        )
        append_log(
            "vendor compatibility regression tests passed; changes: Python 3 print syntax, "
            "UTF-8 I/O, regex literal/replacement escaping required by Python 3"
        )

        preprocess(source_root, work_dir)
        append_log("generated exactly ods-python.tex and fourteen requested *-python.tex files")
        extract(source_root, work_dir)
        append_log("records, chapter partitions, bibliography, source snapshot, and reports extracted")

        for cache in ROOT.rglob("__pycache__"):
            shutil.rmtree(cache)
        for compiled in ROOT.rglob("*.pyc"):
            compiled.unlink()

        validation = run_validation()
        append_log(f"validation status={validation['status']} records={validation['records_total']}")

    for cache in ROOT.rglob("__pycache__"):
        shutil.rmtree(cache)
    for compiled in ROOT.rglob("*.pyc"):
        compiled.unlink()
    return validation


if __name__ == "__main__":
    result = run()
    print(json.dumps({
        "status": result["status"],
        "records_total": result["records_total"],
        "chapters_total": result["record_counts_by_type"].get("chapter", 0),
        "paragraphs_total": result["record_counts_by_type"].get("paragraph", 0),
        "equations_total": result["equations_total"],
        "code_blocks_total": result["code_blocks_total"],
        "tables_total": result["tables_total"],
        "figures_omitted_total": result["figures_omitted_total"],
        "unresolved_commands_total": result["unresolved_commands_total"],
    }, ensure_ascii=False, indent=2))
