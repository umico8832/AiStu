"""阶段 2/3：知识点规划校验与章节级去重报告。

规划正文由 AI 按 prompts/concept_planning.md 撰写，存放于
authoring/plans/<chapter>.json。本模块负责确定性校验：
- source_record_ids 均存在于该章语料；
- 正文记录（paragraph/algorithm/theorem/lemma）覆盖情况统计；
- 核心问题唯一（不允许并列问号）；
- 去重决策文件 authoring/dedup/<chapter>.jsonl 同步到 reports。
"""
from __future__ import annotations

import datetime
from typing import Any, Dict, List, Set

from .config import EXCLUDED_TYPES, KBConfig, STRUCTURE_TYPES
from .io_utils import log, read_json, read_jsonl, write_json_atomic, write_jsonl_atomic

# 默认应被知识点覆盖的"正文承载"类型（figure_caption/footnote/exercise 等除外）
CONTENT_BEARING = {"paragraph", "algorithm", "theorem", "lemma", "corollary"}
ALLOWED_CONTENT_TYPES = {
    "concept", "mechanism", "algorithm", "formula", "theorem", "comparison", "application",
}


def _is_noise_paragraph(rec: Dict[str, Any]) -> bool:
    """纯排版残留（如 \\vspace）不要求覆盖。"""
    content = rec.get("content", "").strip()
    return len(content) < 40 and content.startswith("\\")


def check_plan(cfg: KBConfig, chapter: str, dry_run: bool = False) -> Dict[str, Any]:
    source = read_jsonl(cfg.chapter_source(chapter))
    source_ids: Set[str] = {r["id"] for r in source}
    plan_path = cfg.authored_plan(chapter)
    if not plan_path.exists():
        raise FileNotFoundError(
            f"缺少规划文件 {plan_path}；请先按 prompts/concept_planning.md 撰写。"
        )
    plan = read_json(plan_path)

    problems: List[Dict[str, Any]] = []
    covered: Set[str] = set()
    seen_tmp_ids: Set[str] = set()
    n_candidates = 0
    for sec in plan.get("sections", []):
        for cand in sec.get("proposed_concepts", []):
            n_candidates += 1
            tid = cand.get("temporary_id", "")
            if tid in seen_tmp_ids:
                problems.append({"candidate": tid, "issue": "temporary_id 重复"})
            seen_tmp_ids.add(tid)
            if cand.get("content_type") not in ALLOWED_CONTENT_TYPES:
                problems.append({
                    "candidate": tid,
                    "issue": f"content_type 非法: {cand.get('content_type')!r}",
                })
            cq = cand.get("core_question", "")
            if cq.count("？") + cq.count("?") != 1:
                problems.append({
                    "candidate": tid,
                    "issue": f"core_question 必须恰好一个问题: {cq!r}",
                })
            unknown = [i for i in cand.get("source_record_ids", []) if i not in source_ids]
            if unknown:
                problems.append({"candidate": tid, "issue": f"引用不存在的记录: {unknown}"})
            covered.update(cand.get("source_record_ids", []))

    uncovered = [
        r["id"] for r in source
        if r["type"] in CONTENT_BEARING
        and not _is_noise_paragraph(r)
        and r["id"] not in covered
    ]

    report = {
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "chapter": chapter,
        "candidate_count": n_candidates,
        "problems": problems,
        "uncovered_content_records": uncovered,
        "covered_record_count": len(covered),
        "verdict": "pass" if not problems and not uncovered else "needs_attention",
    }
    write_json_atomic(cfg.reports_dir / f"plan_check_{chapter}.json", report, dry_run)
    log.info(
        "规划校验 %s：候选 %d 个，问题 %d 个，未覆盖正文记录 %d 条",
        report["verdict"], n_candidates, len(problems), len(uncovered),
    )
    return report


def sync_duplicates(cfg: KBConfig, chapter: str, dry_run: bool = False) -> int:
    """把章节去重决策合并进 reports/duplicate_candidates.jsonl（按 chapter 幂等替换）。"""
    dedup_path = cfg.authored_duplicates(chapter)
    rows: List[Dict[str, Any]] = []
    if dedup_path.exists():
        rows = read_jsonl(dedup_path)
        for row in rows:
            row.setdefault("chapter", chapter)
    out_path = cfg.reports_dir / "duplicate_candidates.jsonl"
    existing = read_jsonl(out_path) if out_path.exists() else []
    merged = [r for r in existing if r.get("chapter") != chapter] + rows
    write_jsonl_atomic(out_path, merged, dry_run)
    return len(rows)
