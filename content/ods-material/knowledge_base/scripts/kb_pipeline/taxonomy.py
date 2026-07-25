"""阶段 1：确定性恢复课程树 taxonomy.json。

只依赖 chapter_number / section_number / subsection_number / heading_path /
document_order / type，不依赖模型猜测。
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from .config import (
    CHAPTER_TITLE_ZH,
    COURSE_ID,
    COURSE_TITLE,
    COURSE_TITLE_ZH,
    KBConfig,
    SECTION_TITLE_ZH,
)
from .io_utils import iter_jsonl, log, read_json, write_json_atomic
from .schema_validator import validate_schema


def slugify(title: str) -> str:
    """确定性 slug：优先取冒号前的结构名，否则取全标题。"""
    head = title.split(":")[0].strip()
    slug = re.sub(r"[^a-z0-9]+", "-", head.lower()).strip("-")
    return slug or re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def numbered_node_id(number: Optional[str], title: str, parent_id: str) -> str:
    """生成全课程唯一且稳定的目录节点 ID。"""
    if number:
        prefix = re.sub(r"[^0-9a-z]+", "-", str(number).lower()).strip("-")
        return f"{prefix}-{slugify(title)}"
    return f"{parent_id}-{slugify(title)}"


def sync_taxonomy_concepts(
    taxonomy: Dict[str, Any],
    chapter_slug: str,
    concepts: List[Dict[str, Any]],
) -> None:
    """把知识点按 location.section_id 回填到章/节/小节树。"""
    chapter = chapter_entry(taxonomy, chapter_slug)
    nodes: Dict[str, Dict[str, Any]] = {}
    for section in chapter["sections"]:
        section["concept_ids"] = []
        nodes[section["id"]] = section
        for subsection in section.get("subsections", []):
            subsection["concept_ids"] = []
            nodes[subsection["id"]] = subsection
    for concept in sorted(concepts, key=lambda c: (c["location"]["order"], c["id"])):
        section_id = concept["location"].get("section_id")
        if section_id not in nodes:
            raise KeyError(
                f"{concept['id']}: taxonomy 中找不到 section_id {section_id!r}"
            )
        nodes[section_id]["concept_ids"].append(concept["id"])


def build_taxonomy(cfg: KBConfig, dry_run: bool = False) -> Dict[str, Any]:
    chapters: List[Dict[str, Any]] = []
    cur_chapter: Optional[Dict[str, Any]] = None
    cur_section: Optional[Dict[str, Any]] = None
    used_chapter_ids: Dict[str, int] = {}

    for rec in iter_jsonl(cfg.corpus_records):
        rtype = rec["type"]
        if rtype not in ("chapter", "section", "subsection"):
            continue
        title = rec["content"].strip()
        if rtype == "chapter":
            num = rec.get("chapter_number")
            cid = slugify(title)
            if cid in used_chapter_ids:  # 保证章 ID 唯一
                used_chapter_ids[cid] += 1
                cid = f"{cid}-{used_chapter_ids[cid]}"
            else:
                used_chapter_ids[cid] = 1
            cur_chapter = {
                "id": cid,
                "title": title,
                "title_zh": CHAPTER_TITLE_ZH.get(num, title) if num else title,
                "order": num if num is not None else 0,
                "source_chapter_number": num,
                "sections": [],
            }
            chapters.append(cur_chapter)
            cur_section = None
        elif rtype == "section" and cur_chapter is not None:
            snum = rec.get("section_number")
            cur_section = {
                "id": numbered_node_id(snum, title, cur_chapter["id"]),
                "title": title,
                "title_zh": SECTION_TITLE_ZH.get(snum or "", title),
                "order": len(cur_chapter["sections"]) + 1,
                "source_section_number": snum,
                "subsections": [],
                "concept_ids": [],
            }
            cur_chapter["sections"].append(cur_section)
        elif rtype == "subsection" and cur_section is not None:
            ssnum = rec.get("subsection_number")
            sub_id = numbered_node_id(ssnum, title, cur_section["id"])
            cur_section["subsections"].append({
                "id": sub_id,
                "title": title,
                "title_zh": SECTION_TITLE_ZH.get(ssnum or "", title),
                "order": len(cur_section["subsections"]) + 1,
                "source_subsection_number": ssnum,
                "concept_ids": [],
            })

    ods_course = {
        "course_id": COURSE_ID,
        "title": COURSE_TITLE,
        "title_zh": COURSE_TITLE_ZH,
        "source_edition": "pseudocode/Python",
        "chapters": chapters,
    }
    authored_courses = [
        read_json(path)
        for path in sorted(cfg.authored_taxonomy_dir.glob("*.json"))
    ]
    taxonomy = {
        "version": 2,
        "courses": [ods_course, *authored_courses],
    }
    for chapter_slug in cfg.internal_chapters():
        from .io_utils import read_jsonl
        sync_taxonomy_concepts(
            taxonomy,
            chapter_slug,
            read_jsonl(cfg.internal_concepts(chapter_slug)),
        )

    schema = read_json(cfg.schemas_dir / "taxonomy.schema.json")
    errors = validate_schema(taxonomy, schema)
    if errors:
        raise ValueError("taxonomy 未通过 Schema 校验:\n" + "\n".join(errors[:10]))

    write_json_atomic(cfg.taxonomy_path, taxonomy, dry_run)
    log.info(
        "课程树恢复完成：%d 门课程、%d 章",
        len(taxonomy["courses"]),
        sum(len(course["chapters"]) for course in taxonomy["courses"]),
    )
    return taxonomy


def chapter_entry(taxonomy: Dict[str, Any], chapter_slug: str) -> Dict[str, Any]:
    """按语料文件名（如 02-array-based-lists）定位章节点。"""
    m = re.match(r"^(\d+)-(.+)$", chapter_slug)
    for course in taxonomy["courses"]:
        for ch in course["chapters"]:
            if m and ch.get("source_chapter_number") == int(m.group(1)):
                return ch
            if ch["id"] == chapter_slug:
                return ch
    raise KeyError(f"taxonomy 中找不到章节 {chapter_slug!r}")


def course_entry_for_chapter(
    taxonomy: Dict[str, Any],
    chapter_slug: str,
) -> Dict[str, Any]:
    """返回拥有指定章节的课程节点。"""
    chapter = chapter_entry(taxonomy, chapter_slug)
    for course in taxonomy["courses"]:
        if any(candidate is chapter for candidate in course["chapters"]):
            return course
    raise KeyError(f"taxonomy 中找不到章节 {chapter_slug!r} 所属课程")


def section_ids(taxonomy: Dict[str, Any], chapter_slug: str) -> List[str]:
    ch = chapter_entry(taxonomy, chapter_slug)
    out: List[str] = []
    for sec in ch["sections"]:
        out.append(sec["id"])
        out.extend(sub["id"] for sub in sec.get("subsections", []))
    return out
