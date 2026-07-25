"""阶段 8：可视化候选识别。

候选判断由 AI 按内容特征撰写（authoring/viz/<chapter>.jsonl），
本模块做确定性校验（concept 存在、字段完整、priority/type 合法）后
合并写入 visualization/candidates.jsonl。不生成任何可视化页面。
"""
from __future__ import annotations

from typing import Any, Dict, List

from .config import KBConfig
from .io_utils import log, read_jsonl, write_jsonl_atomic

ALLOWED_PRIORITIES = {"high", "medium", "low"}
ALLOWED_TYPES = {
    "state_transition", "algorithm_execution", "structure_layout",
    "comparison", "math_relation", "process_flow",
}
REQUIRED_FIELDS = ["concept_id", "recommended", "priority", "suggested_type", "reason", "possible_scenes"]


def find_viz_candidates(cfg: KBConfig, chapter: str, dry_run: bool = False) -> Dict[str, Any]:
    src = cfg.authored_viz(chapter)
    if not src.exists():
        raise FileNotFoundError(f"缺少可视化候选草稿 {src}")
    concepts = {c["id"] for c in read_jsonl(cfg.internal_concepts(chapter))}

    rows: List[Dict[str, Any]] = []
    errors: List[str] = []
    for row in read_jsonl(src):
        missing = [f for f in REQUIRED_FIELDS if f not in row]
        if missing:
            errors.append(f"{row.get('concept_id')}: 缺字段 {missing}")
            continue
        if row["concept_id"] not in concepts:
            errors.append(f"{row['concept_id']}: 知识点不存在")
            continue
        if row["priority"] not in ALLOWED_PRIORITIES:
            errors.append(f"{row['concept_id']}: priority 非法 {row['priority']!r}")
            continue
        if row["suggested_type"] not in ALLOWED_TYPES:
            errors.append(f"{row['concept_id']}: suggested_type 非法 {row['suggested_type']!r}")
            continue
        rows.append(row)
    if errors:
        raise ValueError("可视化候选校验失败:\n" + "\n".join(errors))

    out_path = cfg.viz_candidates_path
    existing = read_jsonl(out_path) if out_path.exists() else []
    merged = [r for r in existing if r["concept_id"] not in concepts] + rows
    write_jsonl_atomic(out_path, merged, dry_run)
    log.info("可视化候选完成：%d 条", len(rows))
    return {"candidates": len(rows)}
