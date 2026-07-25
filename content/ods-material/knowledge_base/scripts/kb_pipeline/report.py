"""试点/章节报告生成：统计数据（确定性）+ AI 分析（authoring/pilot_analysis.md）。"""
from __future__ import annotations

import datetime
from collections import Counter
from typing import Any, Dict, List

from .config import KBConfig
from .io_utils import log, read_json, read_jsonl
from .plan import CONTENT_BEARING, _is_noise_paragraph

PILOT_CHAPTER = "02-array-based-lists"


def build_report(cfg: KBConfig, chapter: str = PILOT_CHAPTER, dry_run: bool = False) -> str:
    source = read_jsonl(cfg.chapter_source(chapter))
    content_records = [
        r for r in source
        if r["type"] in CONTENT_BEARING and not _is_noise_paragraph(r)
    ]
    internal = read_jsonl(cfg.internal_concepts(chapter))
    pub_path = cfg.published_concepts(chapter)
    published = read_jsonl(pub_path) if pub_path.exists() else []
    relations = read_jsonl(cfg.relations_path) if cfg.relations_path.exists() else []
    chapter_ids = {c["id"] for c in internal}
    ch_relations = [r for r in relations if r["source_id"] in chapter_ids]
    chunks = read_jsonl(cfg.rag_chunks_path) if cfg.rag_chunks_path.exists() else []
    ch_chunks = [r for r in chunks if r["concept_id"] in chapter_ids]
    viz = read_jsonl(cfg.viz_candidates_path) if cfg.viz_candidates_path.exists() else []
    ch_viz = [v for v in viz if v["concept_id"] in chapter_ids]
    dup_path = cfg.reports_dir / "duplicate_candidates.jsonl"
    dups = [d for d in (read_jsonl(dup_path) if dup_path.exists() else [])
            if d.get("chapter") == chapter]
    unres_path = cfg.reports_dir / "unresolved_relations.jsonl"
    unresolved = [u for u in (read_jsonl(unres_path) if unres_path.exists() else [])
                  if u.get("source_id") in chapter_ids]
    val_path = cfg.reports_dir / "validation_report.json"
    validation = read_json(val_path) if val_path.exists() else None

    type_counts = Counter(c["content_type"] for c in internal)
    src_per_concept = [len(c.get("source_record_ids", [])) for c in internal]
    avg_src = sum(src_per_concept) / len(src_per_concept) if src_per_concept else 0
    prereq_count = sum(len(c.get("prerequisite_ids", [])) for c in internal)
    review_pending = [c["id"] for c in internal
                      if c.get("quality", {}).get("status") == "review_pending"]
    revision_required = [c["id"] for c in internal
                         if c.get("quality", {}).get("status") == "revision_required"]
    high_viz = [v["concept_id"] for v in ch_viz
                if v.get("recommended") and v.get("priority") == "high"]

    lines: List[str] = []
    lines.append(f"# 知识库章节报告：{chapter}")
    lines.append("")
    lines.append(f"生成时间：{datetime.datetime.utcnow().isoformat()}Z")
    lines.append("")
    lines.append("## 一、数量统计")
    lines.append("")
    lines.append(
        f"- 源记录总数：{len(source)}（规划强制覆盖的正文承载类 "
        f"{len(content_records)} 条）"
    )
    lines.append(f"- 生成知识点：internal {len(internal)} 个，published {len(published)} 个")
    lines.append("- 各类型知识点数量：")
    for t, n in sorted(type_counts.items(), key=lambda x: -x[1]):
        lines.append(f"  - {t}: {n}")
    lines.append(f"- 平均每个知识点引用源记录：{avg_src:.1f} 条")
    lines.append(f"- 重复候选处理记录：{len(dups)} 条")
    lines.append(f"- 前置关系（prerequisite 边）：{prereq_count} 条；"
                 f"关系总数（含前置）：{len(ch_relations)} 条")
    lines.append(f"- 未解决关系：{len(unresolved)} 条")
    lines.append(f"- RAG 检索块：{len(ch_chunks)} 个（每知识点 3～4 块）")
    lines.append(f"- 可视化候选：{len(ch_viz)} 条，其中 high 优先级 {len(high_viz)} 条")
    lines.append("")
    lines.append("## 二、自动化验证结果")
    lines.append("")
    if validation:
        lines.append(f"- 结论：{'全部通过' if validation.get('all_passed') else '存在失败项'}")
        for item in validation.get("checks", []):
            mark = "✅" if item["passed"] else "❌"
            lines.append(f"  - {mark} {item['check']}")
    else:
        lines.append("- 尚未运行 validate。")
    lines.append("")
    lines.append("## 三、最适合可视化的知识点")
    lines.append("")
    for v in sorted(ch_viz, key=lambda x: (x.get("priority") != "high", x["concept_id"])):
        if v.get("recommended"):
            lines.append(f"- `{v['concept_id']}`（{v['priority']} / {v['suggested_type']}）：{v['reason']}")
    lines.append("")
    lines.append("## 四、仍需人工或第二个 AI 审查的内容")
    lines.append("")
    lines.append(f"- 全部 {len(review_pending)} 个 `review_pending` 知识点均需外部审查"
                 "（本流水线不自行判定通过）。")
    if revision_required:
        lines.append(f"- `revision_required`（源材料不足或存疑）：{revision_required}")
    else:
        lines.append("- 无 `revision_required` 条目。")
    lines.append("")

    # AI 撰写的分析部分（结论、建议）
    if chapter == PILOT_CHAPTER and cfg.pilot_analysis.exists():
        lines.append(cfg.pilot_analysis.read_text(encoding="utf-8").strip())
        lines.append("")

    content = "\n".join(lines)
    out = (
        cfg.reports_dir / "pilot_report.md"
        if chapter == PILOT_CHAPTER
        else cfg.reports_dir / f"{chapter}_report.md"
    )
    if not dry_run:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(content, encoding="utf-8")
        log.info("已写入 %s", out)
    return content
