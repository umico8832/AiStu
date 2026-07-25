"""外部 AI 审查接口：导出审查输入 / 回写审查结果（定向修复，不整体重写）。"""
from __future__ import annotations

import json
from typing import Any, Dict, List

from .config import KBConfig
from .io_utils import log, read_json, read_jsonl, write_json_atomic, write_jsonl_atomic

ALLOWED_DECISIONS = {"approve", "revise", "reject"}
ALLOWED_SEVERITIES = {"low", "medium", "high", "critical"}
_RELATED_FIELDS = ["id", "title", "core_question", "summary", "definition", "content_type"]


def export_review(cfg: KBConfig, chapter: str, dry_run: bool = False) -> int:
    concepts = read_jsonl(cfg.internal_concepts(chapter))
    by_id = {c["id"]: c for c in concepts}
    # 跨章引用也要可见
    for ch in cfg.internal_chapters():
        if ch == chapter:
            continue
        for c in read_jsonl(cfg.internal_concepts(ch)):
            by_id.setdefault(c["id"], c)
    source = {r["id"]: r for r in read_jsonl(cfg.chapter_source(chapter))}

    count = 0
    for c in concepts:
        related_ids = list(c.get("prerequisite_ids", [])) + [
            r["target_id"] for r in c.get("relations", [])
        ]
        payload = {
            "concept": c,
            "related_concepts": [
                {k: by_id[rid][k] for k in _RELATED_FIELDS if k in by_id[rid]}
                for rid in related_ids if rid in by_id
            ],
            "source_records": [
                {"id": rid, "type": source[rid]["type"], "content": source[rid]["content"]}
                for rid in c.get("source_record_ids", []) if rid in source
            ],
        }
        write_json_atomic(cfg.review_input_dir / f"{c['id']}.json", payload, dry_run)
        count += 1
    log.info("已导出 %d 份审查输入到 %s", count, cfg.review_input_dir)
    return count


def apply_review(cfg: KBConfig, chapter: str, dry_run: bool = False) -> Dict[str, Any]:
    """读取 review/output/<concept_id>.json，把结果定向写回 internal。"""
    internal_path = cfg.internal_concepts(chapter)
    concepts = read_jsonl(internal_path)
    by_id = {c["id"]: c for c in concepts}

    applied: List[str] = []
    skipped: List[str] = []
    invalid: List[str] = []
    for out_file in sorted(cfg.review_output_dir.glob("*.json")):
        result = read_json(out_file)
        cid = result.get("concept_id")
        if cid not in by_id:
            skipped.append(f"{out_file.name}: concept 不在本章")
            continue
        decision = result.get("decision")
        if decision not in ALLOWED_DECISIONS:
            invalid.append(f"{cid}: decision 非法 {decision!r}")
            continue
        issues = result.get("issues", [])
        bad = [i for i in issues if i.get("severity") not in ALLOWED_SEVERITIES]
        if bad:
            invalid.append(f"{cid}: issues 中 severity 非法")
            continue
        concept = by_id[cid]
        new_issues = [
            {
                "severity": i["severity"],
                "type": i.get("type", "unspecified"),
                "field": i.get("field", ""),
                "description": i.get("description", ""),
                "suggested_fix": i.get("suggested_fix", ""),
            }
            for i in issues
        ]
        new_status = (
            "reviewed" if decision == "approve" else "revision_required"
        )
        if (
            concept["quality"].get("status") == new_status
            and concept["quality"].get("issues", []) == new_issues
        ):
            skipped.append(f"{out_file.name}: 审查结果已应用")
            continue
        concept["quality"]["issues"] = new_issues
        concept["quality"]["status"] = new_status
        concept["version"] = concept.get("version", 1) + 1
        applied.append(cid)

    if applied:
        write_jsonl_atomic(internal_path, concepts, dry_run)
    log.info("审查回写：应用 %d，跳过 %d，非法 %d", len(applied), len(skipped), len(invalid))
    return {"applied": applied, "skipped": skipped, "invalid": invalid}
