"""阶段 0：源数据检查，生成 reports/source_inspection.json。"""
from __future__ import annotations

import datetime
import json
from collections import Counter
from typing import Any, Dict, List

from .config import KBConfig, EXCLUDED_TYPES
from .io_utils import log, read_json, write_json_atomic
from .schema_validator import validate_schema


def inspect_source(cfg: KBConfig, dry_run: bool = False) -> Dict[str, Any]:
    path = cfg.corpus_records
    record_schema_path = cfg.root / "schema" / "record.schema.json"
    record_schema = read_json(record_schema_path) if record_schema_path.exists() else None

    records: List[Dict[str, Any]] = []
    invalid_json: List[Dict[str, Any]] = []
    with open(path, "r", encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as exc:
                invalid_json.append({"line": lineno, "error": str(exc)})

    ids = [r.get("id") for r in records]
    id_counts = Counter(ids)
    duplicate_ids = sorted(i for i, c in id_counts.items() if c > 1)

    missing_fields: List[Dict[str, Any]] = []
    schema_errors: List[Dict[str, Any]] = []
    required = record_schema.get("required", []) if record_schema else []
    for r in records:
        miss = [k for k in required if k not in r]
        if miss:
            missing_fields.append({"id": r.get("id"), "missing": miss})
        if record_schema:
            errs = validate_schema(r, record_schema)
            if errs:
                schema_errors.append({"id": r.get("id"), "errors": errs[:5]})

    # heading_path 检查：非空且首元素与章标题一致性由 taxonomy 阶段处理，这里查空路径
    bad_heading = [
        r["id"] for r in records
        if r.get("type") not in ("metadata",) and not r.get("heading_path")
    ]
    # document_order 应严格递增
    order_anomalies = []
    prev = 0
    for r in records:
        cur = r.get("document_order", 0)
        if cur <= prev:
            order_anomalies.append({"id": r.get("id"), "document_order": cur, "prev": prev})
        prev = cur

    # 章节文件与 records.jsonl 分区一致性
    chapter_files = cfg.list_chapters()
    chapter_file_ids: Counter = Counter()
    for ch in chapter_files:
        with open(cfg.chapter_source(ch), "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    chapter_file_ids[json.loads(line)["id"]] += 1
    partition_ok = set(chapter_file_ids) == set(ids) and all(v == 1 for v in chapter_file_ids.values())

    type_counts = Counter(r["type"] for r in records)
    chapter_counts = Counter(
        str(r.get("chapter_number")) for r in records
    )

    report = {
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "source": str(path.relative_to(cfg.root)),
        "total_records": len(records),
        "invalid_json_lines": invalid_json,
        "duplicate_ids": duplicate_ids,
        "records_missing_required_fields": missing_fields,
        "record_schema_errors": schema_errors[:20],
        "record_schema_error_count": len(schema_errors),
        "records_with_empty_heading_path": bad_heading,
        "document_order_anomalies": order_anomalies,
        "chapter_partition_consistent": partition_ok,
        "type_counts": dict(type_counts.most_common()),
        "records_per_chapter": dict(sorted(chapter_counts.items())),
        "content_bearing_records": sum(
            c for t, c in type_counts.items() if t not in EXCLUDED_TYPES
        ),
        "excluded_types": sorted(EXCLUDED_TYPES),
        "verdict": (
            "pass"
            if not invalid_json and not duplicate_ids and not missing_fields
            and not bad_heading and not order_anomalies and partition_ok
            else "fail"
        ),
    }
    write_json_atomic(cfg.reports_dir / "source_inspection.json", report, dry_run)
    log.info("源数据检查完成：%s（%d 条记录）", report["verdict"], report["total_records"])
    return report
