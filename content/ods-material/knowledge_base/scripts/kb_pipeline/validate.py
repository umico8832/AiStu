"""阶段 9：全库自动化验证，生成 validation_report.json 与 quality_report.jsonl。"""
from __future__ import annotations

import datetime
import json
from typing import Any, Dict, List, Set

from .config import (
    CONTEXT_DEPENDENT_PHRASES,
    INTERNAL_LEAK_PATTERNS,
    KBConfig,
    USER_STATE_FIELD_NAMES,
)
from .io_utils import log, read_json, read_jsonl, write_json_atomic, write_jsonl_atomic
from .relations import detect_cycle
from .publish import to_published
from .rag import derive_chunks
from .schema_validator import validate_schema


def _collect_keys(obj: Any, acc: Set[str]) -> None:
    if isinstance(obj, dict):
        for k, v in obj.items():
            acc.add(k)
            _collect_keys(v, acc)
    elif isinstance(obj, list):
        for v in obj:
            _collect_keys(v, acc)


def _scan_context_phrases(concept: Dict[str, Any]) -> List[str]:
    hits: List[str] = []
    fields = {
        "summary": concept.get("summary", ""),
        "definition": concept.get("definition", ""),
        "analogy": concept.get("rookie_explanation", {}).get("analogy", ""),
        "boundary": concept.get("rookie_explanation", {}).get("boundary", ""),
    }
    for fname, text in fields.items():
        for phrase in CONTEXT_DEPENDENT_PHRASES:
            if phrase in text:
                hits.append(f"{fname} 含上下文依赖表达 {phrase!r}")
    return hits


def validate_all(cfg: KBConfig, dry_run: bool = False) -> Dict[str, Any]:
    checks: List[Dict[str, Any]] = []
    quality_rows: List[Dict[str, Any]] = []

    def check(name: str, passed: bool, details: Any = None) -> None:
        checks.append({"check": name, "passed": bool(passed), "details": details or []})

    concept_schema = read_json(cfg.schemas_dir / "concept.schema.json")
    rel_schema = read_json(cfg.schemas_dir / "relation.schema.json")
    chunk_schema = read_json(cfg.schemas_dir / "rag_chunk.schema.json")
    tax_schema = read_json(cfg.schemas_dir / "taxonomy.schema.json")
    check(
        "taxonomy_exists",
        cfg.taxonomy_path.exists(),
        [str(cfg.taxonomy_path.relative_to(cfg.root))],
    )

    # 1. JSONL 可解析（read_jsonl 遇错抛异常）
    parse_errors: List[str] = []
    internal: Dict[str, Dict[str, Any]] = {}
    internal_by_chapter: Dict[str, List[Dict[str, Any]]] = {}
    published: Dict[str, Dict[str, Any]] = {}
    for ch in cfg.internal_chapters():
        try:
            rows = read_jsonl(cfg.internal_concepts(ch))
            internal_by_chapter[ch] = rows
            for c in rows:
                internal[c["id"]] = c
        except ValueError as exc:
            parse_errors.append(str(exc))
        pub_path = cfg.published_concepts(ch)
        if pub_path.exists():
            try:
                for c in read_jsonl(pub_path):
                    published[c["id"]] = c
            except ValueError as exc:
                parse_errors.append(str(exc))
    check(
        "internal_concepts_present",
        bool(internal),
        [] if internal else ["没有任何 internal 知识点"],
    )
    for path in (cfg.relations_path, cfg.rag_chunks_path, cfg.viz_candidates_path):
        if path.exists():
            try:
                read_jsonl(path)
            except ValueError as exc:
                parse_errors.append(str(exc))
    check("all_jsonl_parseable", not parse_errors, parse_errors)

    # 2. Schema 校验
    schema_fail: List[str] = []
    for cid, c in internal.items():
        errs = validate_schema(c, concept_schema)
        if errs:
            schema_fail.append(f"internal/{cid}: {errs[:3]}")
    for cid, c in published.items():
        errs = validate_schema(c, concept_schema)
        if errs:
            schema_fail.append(f"published/{cid}: {errs[:3]}")
    taxonomy = read_json(cfg.taxonomy_path) if cfg.taxonomy_path.exists() else None
    if taxonomy:
        errs = validate_schema(taxonomy, tax_schema)
        if errs:
            schema_fail.append(f"taxonomy: {errs[:3]}")
    relations = read_jsonl(cfg.relations_path) if cfg.relations_path.exists() else []
    for r in relations:
        errs = validate_schema(r, rel_schema)
        if errs:
            schema_fail.append(f"relation {r.get('source_id')}→{r.get('target_id')}: {errs[:2]}")
    chunks = read_jsonl(cfg.rag_chunks_path) if cfg.rag_chunks_path.exists() else []
    for r in chunks:
        errs = validate_schema(r, chunk_schema)
        if errs:
            schema_fail.append(f"chunk {r.get('chunk_id')}: {errs[:2]}")
    check("all_objects_pass_schema", not schema_fail, schema_fail[:20])

    # 3. concept ID 全局唯一
    all_ids: List[str] = []
    for rows in internal_by_chapter.values():
        all_ids.extend(c["id"] for c in rows)
    dup = sorted({i for i in all_ids if all_ids.count(i) > 1})
    check("concept_ids_globally_unique", not dup, dup)

    # internal → published 必须完整、精确且没有人工漂移
    projection_issues: List[str] = []
    if set(internal) != set(published):
        projection_issues.append(
            f"ID 集不一致：internal-only={sorted(set(internal) - set(published))}, "
            f"published-only={sorted(set(published) - set(internal))}"
        )
    for cid in sorted(set(internal) & set(published)):
        if published[cid] != to_published(internal[cid]):
            projection_issues.append(f"{cid}: published 不是 internal 的标准投影")
    check("published_is_exact_internal_projection", not projection_issues, projection_issues)

    known = set(internal)
    # 4/5. relation target 与 prerequisite 存在
    bad_targets = [
        f"{r['source_id']}→{r['target_id']}" for r in relations
        if r["target_id"] not in known or r["source_id"] not in known
    ]
    check("relation_targets_exist", not bad_targets, bad_targets)
    bad_prereq = [
        f"{c['id']}→{p}" for c in internal.values()
        for p in c.get("prerequisite_ids", []) if p not in known
    ]
    check("prerequisite_ids_exist", not bad_prereq, bad_prereq)

    # 6. 前置无环
    edges = {c["id"]: [p for p in c.get("prerequisite_ids", []) if p in known]
             for c in internal.values()}
    cycle = detect_cycle(edges)
    check("prerequisites_acyclic", not cycle, cycle)

    # 7. 无自引用
    self_refs = [
        c["id"] for c in internal.values()
        if c["id"] in c.get("prerequisite_ids", [])
        or any(r["target_id"] == c["id"] for r in c.get("relations", []))
    ]
    check("no_self_reference", not self_refs, self_refs)

    # 8. 单一核心问题
    multi_q = [
        c["id"] for c in internal.values()
        if c.get("core_question", "").count("？") + c.get("core_question", "").count("?") != 1
    ]
    check("single_core_question", not multi_q, multi_q)

    # 9-11. 关键字段非空
    empty_def = [c["id"] for c in internal.values() if not c.get("definition", "").strip()]
    check("definition_not_empty", not empty_def, empty_def)
    empty_analogy = [
        c["id"] for c in internal.values()
        if not c.get("rookie_explanation", {}).get("analogy", "").strip()
    ]
    check("analogy_not_empty", not empty_analogy, empty_analogy)
    empty_boundary = [
        c["id"] for c in internal.values()
        if not c.get("rookie_explanation", {}).get("boundary", "").strip()
    ]
    check("boundary_not_empty", not empty_boundary, empty_boundary)

    # 12. query_examples ≥ 3
    few_queries = [
        c["id"] for c in internal.values()
        if len(c.get("retrieval", {}).get("query_examples", [])) < 3
    ]
    check("query_examples_at_least_3", not few_queries, few_queries)

    # 13. published 不含内部源路径 / source_record_ids
    leaks: List[str] = []
    for cid, c in published.items():
        text = json.dumps(c, ensure_ascii=False)
        found = [p for p in INTERNAL_LEAK_PATTERNS if p in text]
        if found:
            leaks.append(f"{cid}: {found}")
    check("published_free_of_internal_paths", not leaks, leaks)

    # 14. RAG 块能关联到存在的 concept
    orphan_chunks = [r["chunk_id"] for r in chunks if r["concept_id"] not in published]
    check("rag_chunks_link_to_published_concepts", not orphan_chunks, orphan_chunks)

    # RAG 必须可由 published 精确重建，防止陈旧或手工编辑的索引混入。
    titles = {cid: c["title"] for cid, c in published.items()}
    expected_chunks = {
        chunk["chunk_id"]: chunk
        for concept in published.values()
        for chunk in derive_chunks(concept, titles)
    }
    actual_chunks: Dict[str, Dict[str, Any]] = {}
    duplicate_chunk_ids: List[str] = []
    for chunk in chunks:
        cid = chunk["chunk_id"]
        if cid in actual_chunks:
            duplicate_chunk_ids.append(cid)
        actual_chunks[cid] = chunk
    rag_issues: List[str] = []
    if duplicate_chunk_ids:
        rag_issues.append(f"重复 chunk_id: {sorted(set(duplicate_chunk_ids))}")
    if set(expected_chunks) != set(actual_chunks):
        rag_issues.append(
            f"chunk 集不一致：missing={sorted(set(expected_chunks) - set(actual_chunks))}, "
            f"extra={sorted(set(actual_chunks) - set(expected_chunks))}"
        )
    for chunk_id in sorted(set(expected_chunks) & set(actual_chunks)):
        if expected_chunks[chunk_id] != actual_chunks[chunk_id]:
            rag_issues.append(f"{chunk_id}: 内容不是从 published 当前版本派生")
    check("rag_is_exact_published_derivative", not rag_issues, rag_issues[:20])

    # 15. taxonomy 引用有效（章节/小节 ID 唯一 + concept 的 section 有效）
    tax_issues: List[str] = []
    if taxonomy:
        seen_sec: Set[str] = set()
        seen_chapters: Set[str] = set()
        seen_courses: Set[str] = set()
        valid_secs_by_chapter: Dict[str, Set[str]] = {}
        course_by_chapter: Dict[str, str] = {}
        attached: Dict[str, str] = {}
        for course in taxonomy["courses"]:
            course_id = course["course_id"]
            if course_id in seen_courses:
                tax_issues.append(f"course id 重复: {course_id}")
            seen_courses.add(course_id)
            for ch_node in course["chapters"]:
                chapter_id = ch_node["id"]
                if chapter_id in seen_chapters:
                    tax_issues.append(f"chapter id 重复: {chapter_id}")
                seen_chapters.add(chapter_id)
                course_by_chapter[chapter_id] = course_id
                secs: Set[str] = set()
                for sec in ch_node["sections"]:
                    if sec["id"] in seen_sec:
                        tax_issues.append(f"section id 重复: {sec['id']}")
                    seen_sec.add(sec["id"])
                    secs.add(sec["id"])
                    for cid in sec.get("concept_ids", []):
                        if cid in attached:
                            tax_issues.append(f"concept 重复挂载: {cid}")
                        attached[cid] = sec["id"]
                    for sub in sec.get("subsections", []):
                        if sub["id"] in seen_sec:
                            tax_issues.append(f"subsection id 重复: {sub['id']}")
                        seen_sec.add(sub["id"])
                        secs.add(sub["id"])
                        for cid in sub.get("concept_ids", []):
                            if cid in attached:
                                tax_issues.append(f"concept 重复挂载: {cid}")
                            attached[cid] = sub["id"]
                valid_secs_by_chapter[chapter_id] = secs
        for c in internal.values():
            loc = c["location"]
            secs = valid_secs_by_chapter.get(loc["chapter_id"])
            if secs is None:
                tax_issues.append(f"{c['id']}: chapter_id {loc['chapter_id']!r} 不在 taxonomy")
            elif loc["course_id"] != course_by_chapter.get(loc["chapter_id"]):
                tax_issues.append(
                    f"{c['id']}: course_id {loc['course_id']!r} "
                    f"与章节所属课程 {course_by_chapter.get(loc['chapter_id'])!r} 不一致"
                )
            elif loc.get("section_id") is not None and loc["section_id"] not in secs:
                tax_issues.append(f"{c['id']}: section_id {loc['section_id']!r} 不在 taxonomy")
            elif attached.get(c["id"]) != loc.get("section_id"):
                tax_issues.append(
                    f"{c['id']}: taxonomy 挂载 {attached.get(c['id'])!r} "
                    f"与 location.section_id {loc.get('section_id')!r} 不一致"
                )
        unknown_attachments = sorted(set(attached) - set(internal))
        if unknown_attachments:
            tax_issues.append(f"taxonomy 引用了不存在的 concept: {unknown_attachments}")
    check("taxonomy_references_valid", not tax_issues, tax_issues)

    # 16. 无用户学习状态字段
    keys: Set[str] = set()
    for c in internal.values():
        _collect_keys(c, keys)
    user_fields = sorted(keys & set(USER_STATE_FIELD_NAMES))
    check("no_user_state_fields", not user_fields, user_fields)

    # 17. 无上下文依赖表达；18. 无已删除图片引用
    ctx_hits: List[str] = []
    fig_refs: List[str] = []
    for c in internal.values():
        for hit in _scan_context_phrases(c):
            ctx_hits.append(f"{c['id']}: {hit}")
        text = c.get("summary", "") + c.get("definition", "") + \
            c.get("rookie_explanation", {}).get("analogy", "")
        for token in ("\\figref", "figref{", "如图", "见下图"):
            if token in text:
                fig_refs.append(f"{c['id']}: 含图片引用 {token!r}")
    check("no_context_dependent_phrases", not ctx_hits, ctx_hits)
    check("no_deleted_figure_references", not fig_refs, fig_refs)

    # ---- quality_report.jsonl：逐知识点规则化体检 ----
    for c in internal.values():
        flags: List[str] = []
        if len(c.get("summary", "")) > 160:
            flags.append("summary 偏长（建议 30~100 中文字符）")
        if not c.get("aliases"):
            flags.append("aliases 为空")
        if len(c.get("retrieval", {}).get("keywords", [])) < 3:
            flags.append("keywords 少于 3 个")
        flags.extend(_scan_context_phrases(c))
        quality_rows.append({
            "concept_id": c["id"],
            "status": c.get("quality", {}).get("status"),
            "automated_flags": flags,
            "needs_external_review": c.get("quality", {}).get("status")
            in ("review_pending", "revision_required"),
        })

    passed = all(item["passed"] for item in checks)
    report = {
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "total_concepts_internal": len(internal),
        "total_concepts_published": len(published),
        "total_relations": len(relations),
        "total_rag_chunks": len(chunks),
        "checks": checks,
        "all_passed": passed,
    }
    write_json_atomic(cfg.reports_dir / "validation_report.json", report, dry_run)
    write_jsonl_atomic(cfg.reports_dir / "quality_report.jsonl", quality_rows, dry_run)
    log.info("验证完成：%s（%d 项检查）", "全部通过" if passed else "存在失败项",
             len(checks))
    return report
