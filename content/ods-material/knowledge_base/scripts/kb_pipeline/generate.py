"""阶段 4：逐知识点生成（校验 + 原子装配）。

正文草稿由 AI 按 prompts/concept_writing.md 撰写，存放于
authoring/drafts/<chapter>.jsonl（每行一个 concept JSON）。

本模块逐条执行：JSON 解析 → Schema 校验 → ID 唯一性 → 引用格式检查 →
source_record_ids 存在性 → 追加写入 internal（支持断点续跑与 --force-ids）。
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Sequence, Set

from .config import KBConfig
from .io_utils import log, read_json, read_jsonl, write_json_atomic, write_jsonl_atomic
from .schema_validator import validate_schema

ID_RE = re.compile(r"^[a-z][a-z0-9]*(-[a-z0-9]+)+$")


def validate_concept(
    concept: Dict[str, Any],
    schema: Dict[str, Any],
    source_ids: Set[str],
    valid_section_ids: Set[str],
    course_id: str,
    chapter_id: str,
) -> List[str]:
    """单个知识点的全部静态检查，返回错误列表。"""
    errors = validate_schema(concept, schema)
    cid = concept.get("id", "")
    if cid and not ID_RE.match(cid):
        errors.append(f"id 格式非法: {cid!r}")
    loc = concept.get("location", {})
    if loc.get("course_id") != course_id:
        errors.append(f"location.course_id 应为 {course_id!r}，实际 {loc.get('course_id')!r}")
    if loc.get("chapter_id") != chapter_id:
        errors.append(f"location.chapter_id 应为 {chapter_id!r}，实际 {loc.get('chapter_id')!r}")
    sec = loc.get("section_id")
    if sec is not None and sec not in valid_section_ids:
        errors.append(f"location.section_id {sec!r} 不在 taxonomy 中")
    # 引用格式与自引用
    if cid in concept.get("prerequisite_ids", []):
        errors.append("prerequisite_ids 不得引用自己")
    for rel in concept.get("relations", []):
        if rel.get("target_id") == cid:
            errors.append("relations 不得引用自己")
        if rel.get("target_id") in concept.get("prerequisite_ids", []):
            errors.append(
                f"关系 {rel.get('type')}→{rel.get('target_id')} 与前置重复"
            )
    # 核心问题唯一
    cq = concept.get("core_question", "")
    if cq.count("？") + cq.count("?") != 1:
        errors.append(f"core_question 必须恰好包含一个问句: {cq!r}")
    # 来源记录存在
    unknown = [i for i in concept.get("source_record_ids", []) if i not in source_ids]
    if unknown:
        errors.append(f"source_record_ids 引用不存在的记录: {unknown}")
    return errors


def generate(
    cfg: KBConfig,
    chapter: str,
    force_ids: Optional[Sequence[str]] = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    from .taxonomy import chapter_entry, course_entry_for_chapter, section_ids

    drafts_path = cfg.authored_drafts(chapter)
    if not drafts_path.exists():
        raise FileNotFoundError(
            f"缺少草稿文件 {drafts_path}；请先按 prompts/concept_writing.md 撰写。"
        )
    schema = read_json(cfg.schemas_dir / "concept.schema.json")
    taxonomy = read_json(cfg.taxonomy_path)
    ch = chapter_entry(taxonomy, chapter)
    course = course_entry_for_chapter(taxonomy, chapter)
    valid_secs = set(section_ids(taxonomy, chapter))
    source_ids = {r["id"] for r in read_jsonl(cfg.chapter_source(chapter))}

    internal_path = cfg.internal_concepts(chapter)
    existing: List[Dict[str, Any]] = (
        read_jsonl(internal_path) if internal_path.exists() else []
    )
    existing_by_id = {c["id"]: c for c in existing}
    force = set(force_ids or [])

    drafts = read_jsonl(drafts_path)
    accepted: List[str] = []
    skipped: List[str] = []
    rejected: List[Dict[str, Any]] = []
    seen_draft_ids: Set[str] = set()

    for concept in drafts:
        cid = concept.get("id", "<missing>")
        if cid in seen_draft_ids:
            rejected.append({"id": cid, "errors": ["草稿中 ID 重复"]})
            continue
        seen_draft_ids.add(cid)
        # 断点续跑：已存在且未被 --force-ids 指定的跳过
        if cid in existing_by_id and cid not in force:
            skipped.append(cid)
            continue
        errors = validate_concept(
            concept,
            schema,
            source_ids,
            valid_secs,
            course["course_id"],
            ch["id"],
        )
        if errors:
            rejected.append({"id": cid, "errors": errors})
            log.warning("拒绝 %s: %s", cid, "; ".join(errors[:3]))
            continue
        existing_by_id[cid] = concept
        accepted.append(cid)
        # 逐个知识点原子重写文件（文件小，代价可接受，保证任意中断点数据完整）
        ordered = sorted(
            existing_by_id.values(),
            key=lambda c: (c["location"].get("order", 0), c["id"]),
        )
        write_jsonl_atomic(internal_path, ordered, dry_run)

    if not rejected:
        from .taxonomy import sync_taxonomy_concepts
        ordered = sorted(
            existing_by_id.values(),
            key=lambda c: (c["location"].get("order", 0), c["id"]),
        )
        sync_taxonomy_concepts(taxonomy, chapter, ordered)
        write_json_atomic(cfg.taxonomy_path, taxonomy, dry_run)

    result = {
        "chapter": chapter,
        "accepted": accepted,
        "skipped_existing": skipped,
        "rejected": rejected,
        "total_internal": len(existing_by_id) if not dry_run else len(existing),
    }
    log.info(
        "generate 完成：新增 %d，跳过 %d，拒绝 %d",
        len(accepted), len(skipped), len(rejected),
    )
    return result
