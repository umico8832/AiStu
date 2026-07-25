# Kaleidoscope ODS source asset

This repository-owned content domain preserves the pinned Open Data Structures
source snapshot, its deterministic machine-readable corpus, and Kaleidoscope's
authoritative standard knowledge base. It is a long-term product asset, not a
temporary development dependency.

The ODS corpus is a deterministic extraction of Pat Morin's official *Open Data
Structures* pseudocode/Python edition.

Rebuild from the pinned official source:

```bash
python3 scripts/build_corpus.py
```

The primary downstream input is `corpus/records.jsonl`.  Each JSONL line is
an independent UTF-8 JSON object.  `corpus/chapters/` contains an exact
partition of those same records, with unchanged IDs.  Build provenance is
in `corpus/manifest.json`, and the complete check results are in
`reports/validation.json`.

No language model, OCR, PDF, EPUB, or HTML source is used by the build.

The authoritative knowledge assets, review records, schemas, prompts, and
maintenance pipeline are documented in `knowledge_base/README.md`. Local
virtual environments and caches are intentionally excluded because they are
recreated from `knowledge_base/requirements.txt`.
