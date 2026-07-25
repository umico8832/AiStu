"""阶段 5：从 internal 知识点汇总跨知识点关系，输出 relations/relations.jsonl。

检查项：目标 ID 存在、前置 DAG 无环、无自引用、often_confused_with 双向性、
part_of 与目录父子不冲突。未解决项写入 reports/unresolved_relations.jsonl。
"""
from __future__ import annotations

from typing import Any, Dict, List, Set

from .config import KBConfig
from .io_utils import log, read_json, read_jsonl, write_jsonl_atomic
from .schema_validator import validate_schema


def detect_cycle(edges: Dict[str, List[str]]) -> List[str]:
    """返回一个环（节点序列），无环返回空列表。"""
    WHITE, GRAY, BLACK = 0, 1, 2
    color: Dict[str, int] = {}
    stack: List[str] = []

    def dfs(u: str) -> List[str]:
        color[u] = GRAY
        stack.append(u)
        for v in edges.get(u, []):
            c = color.get(v, WHITE)
            if c == GRAY:
                return stack[stack.index(v):] + [v]
            if c == WHITE:
                found = dfs(v)
                if found:
                    return found
        stack.pop()
        color[u] = BLACK
        return []

    for node in list(edges):
        if color.get(node, WHITE) == WHITE:
            cyc = dfs(node)
            if cyc:
                return cyc
    return []


def load_all_concepts(cfg: KBConfig) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    for ch in cfg.internal_chapters():
        for c in read_jsonl(cfg.internal_concepts(ch)):
            out[c["id"]] = c
    return out


def build_relations(cfg: KBConfig, chapter: str, dry_run: bool = False) -> Dict[str, Any]:
    concepts = load_all_concepts(cfg)
    chapter_concepts = read_jsonl(cfg.internal_concepts(chapter))
    known_ids: Set[str] = set(concepts)
    rel_schema = read_json(cfg.schemas_dir / "relation.schema.json")

    rows: List[Dict[str, Any]] = []
    unresolved: List[Dict[str, Any]] = []

    for c in chapter_concepts:
        cid = c["id"]
        for pid in c.get("prerequisite_ids", []):
            row = {
                "source_id": cid, "type": "prerequisite", "target_id": pid,
                "description": (
                    f"《{concepts[pid]['title']}》提供理解《{c['title']}》"
                    "所需的直接概念、表示或操作基础。"
                    if pid in concepts
                    else f"学习《{c['title']}》之前需要先理解该目标知识点。"
                ),
            }
            if pid not in known_ids:
                unresolved.append({**row, "reason": "target 不存在"})
            else:
                rows.append(row)
        for rel in c.get("relations", []):
            row = {
                "source_id": cid, "type": rel["type"],
                "target_id": rel["target_id"], "description": rel["description"],
            }
            if rel["target_id"] not in known_ids:
                unresolved.append({**row, "reason": "target 不存在"})
                continue
            rows.append(row)

    # often_confused_with 双向检查
    confused = {(r["source_id"], r["target_id"]) for r in rows if r["type"] == "often_confused_with"}
    for a, b in sorted(confused):
        if (b, a) not in confused:
            unresolved.append({
                "source_id": a, "type": "often_confused_with", "target_id": b,
                "description": "", "reason": "缺少反向 often_confused_with（原则上应双向）",
            })

    # part_of 与目录父子关系冲突检查
    for c in chapter_concepts:
        parent = c["location"].get("parent_id")
        for rel in c.get("relations", []):
            if rel["type"] == "part_of" and parent and rel["target_id"] != parent:
                unresolved.append({
                    "source_id": c["id"], "type": "part_of",
                    "target_id": rel["target_id"], "description": rel["description"],
                    "reason": f"part_of 与 location.parent_id={parent!r} 冲突",
                })

    # 前置 DAG 检查（全库范围）
    edges: Dict[str, List[str]] = {}
    for c in concepts.values():
        edges.setdefault(c["id"], []).extend(
            p for p in c.get("prerequisite_ids", []) if p in known_ids
        )
    cycle = detect_cycle(edges)
    if cycle:
        unresolved.append({
            "source_id": cycle[0], "type": "prerequisite", "target_id": cycle[-1],
            "description": "", "reason": f"前置关系存在环: {' -> '.join(cycle)}",
        })

    for row in rows:
        errs = validate_schema(row, rel_schema)
        if errs:
            raise ValueError(f"关系行未通过 Schema: {row} -> {errs}")

    # 幂等：替换本章的关系，保留其他章
    out_path = cfg.relations_path
    existing = read_jsonl(out_path) if out_path.exists() else []
    chapter_ids = {c["id"] for c in chapter_concepts}
    merged = [r for r in existing if r["source_id"] not in chapter_ids] + rows
    write_jsonl_atomic(out_path, merged, dry_run)

    unres_path = cfg.reports_dir / "unresolved_relations.jsonl"
    existing_unres = read_jsonl(unres_path) if unres_path.exists() else []
    merged_unres = [r for r in existing_unres if r.get("source_id") not in chapter_ids]
    merged_unres += unresolved
    write_jsonl_atomic(unres_path, merged_unres, dry_run)

    log.info("关系构建完成：%d 条，未解决 %d 条", len(rows), len(unresolved))
    return {"relations": len(rows), "unresolved": len(unresolved), "cycle": cycle}
