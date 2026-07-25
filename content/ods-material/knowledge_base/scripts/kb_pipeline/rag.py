"""阶段 7：从 published 知识点派生 RAG 检索块（core/relations/rookie/recall）。"""
from __future__ import annotations

from typing import Any, Dict, List

from .config import KBConfig
from .io_utils import log, read_json, read_jsonl, write_jsonl_atomic
from .schema_validator import validate_schema


def _metadata(c: Dict[str, Any]) -> Dict[str, Any]:
    loc = c["location"]
    return {
        "course_id": loc["course_id"],
        "chapter_id": loc["chapter_id"],
        "section_id": loc.get("section_id"),
        "content_type": c["content_type"],
        "knowledge_version": c["version"],
    }


def derive_chunks(c: Dict[str, Any], titles: Dict[str, str]) -> List[Dict[str, Any]]:
    """titles: 全库 concept_id → title，用于把关系块写成可读文本。"""
    cid = c["id"]
    meta = _metadata(c)
    chunks: List[Dict[str, Any]] = []

    # 1) 核心块：标题 + 别名 + 核心问题 + summary + definition
    core_text = (
        f"知识点：{c['title']}\n"
        f"别名：{'、'.join(c['aliases']) if c['aliases'] else '无'}\n"
        f"核心问题：{c['core_question']}\n"
        f"摘要：{c['summary']}\n"
        f"定义：{c['definition']}"
    )
    chunks.append({
        "chunk_id": f"rag-{cid}-core", "concept_id": cid, "chunk_type": "core",
        "title": c["title"], "text": core_text, "metadata": meta,
    })

    # 2) 前置和关系块
    lines: List[str] = [f"知识点《{c['title']}》的知识关系："]
    for pid in c.get("prerequisite_ids", []):
        lines.append(f"- 必要前置：{titles.get(pid, pid)}")
    for rel in c.get("relations", []):
        label = {
            "part_of": "属于", "leads_to": "可继续学习",
            "often_confused_with": "容易混淆", "related": "相关",
        }[rel["type"]]
        lines.append(f"- {label}：{titles.get(rel['target_id'], rel['target_id'])}。{rel['description']}")
    if len(lines) > 1:
        chunks.append({
            "chunk_id": f"rag-{cid}-relations", "concept_id": cid,
            "chunk_type": "relations", "title": c["title"],
            "text": "\n".join(lines), "metadata": meta,
        })

    # 3) 新手解释块
    rk = c["rookie_explanation"]
    mapping_lines = [f"- {k} ↔ {v}" for k, v in rk.get("mapping", {}).items()]
    rookie_text = (
        f"《{c['title']}》的新手类比：{rk['analogy']}\n"
        + ("对应关系：\n" + "\n".join(mapping_lines) + "\n" if mapping_lines else "")
        + f"类比边界：{rk['boundary']}"
    )
    chunks.append({
        "chunk_id": f"rag-{cid}-rookie", "concept_id": cid, "chunk_type": "rookie",
        "title": c["title"], "text": rookie_text, "metadata": meta,
    })

    # 4) 查询召回块
    rt = c["retrieval"]
    recall_text = (
        f"《{c['title']}》相关关键词：{'、'.join(rt['keywords'])}\n"
        f"用户可能这样提问：\n" + "\n".join(f"- {q}" for q in rt["query_examples"])
    )
    chunks.append({
        "chunk_id": f"rag-{cid}-recall", "concept_id": cid, "chunk_type": "recall",
        "title": c["title"], "text": recall_text, "metadata": meta,
    })
    return chunks


def build_rag(cfg: KBConfig, chapter: str, dry_run: bool = False) -> Dict[str, Any]:
    concepts = read_jsonl(cfg.published_concepts(chapter))
    # 标题映射需覆盖全库 published，以便跨章引用可读
    titles: Dict[str, str] = {}
    concept_order: Dict[str, int] = {}
    pub_dir = cfg.kb_dir / "concepts" / "published"
    for path in sorted(pub_dir.glob("*.jsonl")):
        for c in read_jsonl(path):
            titles[c["id"]] = c["title"]
            concept_order[c["id"]] = len(concept_order)

    schema = read_json(cfg.schemas_dir / "rag_chunk.schema.json")
    chunks: List[Dict[str, Any]] = []
    for c in concepts:
        for chunk in derive_chunks(c, titles):
            errs = validate_schema(chunk, schema)
            if errs:
                raise ValueError(f"RAG 块未通过 Schema: {chunk['chunk_id']} -> {errs}")
            chunks.append(chunk)

    # 幂等：替换本章块，保留其他章
    out_path = cfg.rag_chunks_path
    existing = read_jsonl(out_path) if out_path.exists() else []
    chapter_ids = {c["id"] for c in concepts}
    merged = [r for r in existing if r["concept_id"] not in chapter_ids] + chunks
    chunk_type_order = {"core": 0, "relations": 1, "rookie": 2, "recall": 3}
    merged.sort(
        key=lambda row: (
            concept_order[row["concept_id"]],
            chunk_type_order[row["chunk_type"]],
        )
    )
    write_jsonl_atomic(out_path, merged, dry_run)
    log.info("RAG 块生成完成：%d 个（%d 个知识点）", len(chunks), len(concepts))
    return {"chunks": len(chunks), "concepts": len(concepts)}
