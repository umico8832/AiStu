from __future__ import annotations

import json
from pathlib import Path

from knowledge_base.scripts.kb_pipeline.config import KBConfig
from knowledge_base.scripts.kb_pipeline.io_utils import read_json, read_jsonl
from knowledge_base.scripts.kb_pipeline.plan import check_plan
from knowledge_base.scripts.kb_pipeline.publish import to_published
from knowledge_base.scripts.kb_pipeline.rag import derive_chunks
from knowledge_base.scripts.kb_pipeline.validate import validate_all


ROOT = Path(__file__).resolve().parents[2]
CHAPTER = "02-array-based-lists"
GUIDE_CHAPTER = "408-data-structures-exam-guide"
FULL_408_CHAPTERS = [
    "408-basic-concepts",
    "408-linear-lists",
    "408-stacks-queues-arrays",
    "408-trees",
    "408-graphs",
    "408-searching",
    "408-sorting",
]
CFG = KBConfig(ROOT)


def test_pilot_plan_covers_all_content_records() -> None:
    report = check_plan(CFG, CHAPTER, dry_run=True)
    assert report["verdict"] == "pass"
    assert report["candidate_count"] == 30
    assert report["uncovered_content_records"] == []


def test_all_pipeline_checks_pass() -> None:
    report = validate_all(CFG, dry_run=True)
    assert report["all_passed"], [
        item for item in report["checks"] if not item["passed"]
    ]
    assert report["total_concepts_internal"] == 169
    assert report["total_concepts_published"] == 169


def test_published_is_exact_sanitized_projection() -> None:
    internal = read_jsonl(CFG.internal_concepts(CHAPTER))
    published = read_jsonl(CFG.published_concepts(CHAPTER))
    assert [to_published(row) for row in internal] == published
    serialized = json.dumps(published, ensure_ascii=False)
    assert "source_record_ids" not in serialized
    assert "/Users/" not in serialized
    assert "source_snapshot/" not in serialized


def test_rag_is_rebuildable_from_published() -> None:
    published = [
        concept
        for chapter in CFG.internal_chapters()
        for concept in read_jsonl(CFG.published_concepts(chapter))
    ]
    titles = {row["id"]: row["title"] for row in published}
    expected = [
        chunk for concept in published for chunk in derive_chunks(concept, titles)
    ]
    actual = read_jsonl(CFG.rag_chunks_path)
    assert actual == expected
    assert len({row["chunk_id"] for row in actual}) == len(actual)


def test_taxonomy_ids_unique_and_all_concepts_attached_once() -> None:
    taxonomy = read_json(CFG.taxonomy_path)
    node_ids: list[str] = []
    attached: list[str] = []
    for course in taxonomy["courses"]:
        for chapter in course["chapters"]:
            for section in chapter["sections"]:
                node_ids.append(section["id"])
                attached.extend(section.get("concept_ids", []))
                for subsection in section.get("subsections", []):
                    node_ids.append(subsection["id"])
                    attached.extend(subsection.get("concept_ids", []))
    concept_ids = {
        row["id"]
        for chapter in CFG.internal_chapters()
        for row in read_jsonl(CFG.internal_concepts(chapter))
    }
    assert len(node_ids) == len(set(node_ids))
    assert len(attached) == len(set(attached))
    assert set(attached) == concept_ids


def test_review_packages_are_source_grounded() -> None:
    source_ids = {
        row["id"] for row in read_jsonl(CFG.chapter_source(CHAPTER))
    }
    concept_ids = {
        row["id"] for row in read_jsonl(CFG.internal_concepts(CHAPTER))
    }
    packages = [
        CFG.review_input_dir / f"{concept_id}.json"
        for concept_id in sorted(concept_ids)
    ]
    assert len(packages) == 30
    for path in packages:
        payload = read_json(path)
        assert payload["concept"]["id"] == path.stem
        assert payload["source_records"]
        assert {row["id"] for row in payload["source_records"]} <= source_ids


def test_408_guide_plan_and_review_packages_are_source_grounded() -> None:
    report = check_plan(CFG, GUIDE_CHAPTER, dry_run=True)
    assert report["verdict"] == "pass"
    assert report["candidate_count"] == 17
    assert report["uncovered_content_records"] == []

    source_ids = {
        row["id"] for row in read_jsonl(CFG.chapter_source(GUIDE_CHAPTER))
    }
    concepts = read_jsonl(CFG.internal_concepts(GUIDE_CHAPTER))
    assert len(concepts) == 17
    for concept in concepts:
        package = read_json(CFG.review_input_dir / f"{concept['id']}.json")
        assert package["concept"]["id"] == concept["id"]
        assert package["source_records"]
        assert {row["id"] for row in package["source_records"]} <= source_ids


def test_full_408_syllabus_has_zero_gap_coverage_and_review_packages() -> None:
    coverage = read_json(
        CFG.root
        / "knowledge_base"
        / "authoring"
        / "coverage"
        / "408-data-structures-2026.json"
    )
    assert coverage["official_leaf_count"] == 56
    assert coverage["content_concept_count"] == 122
    assert coverage["uncovered_item_ids"] == []
    assert len(coverage["items"]) == 56
    assert all(item["concept_ids"] for item in coverage["items"])

    concept_ids: set[str] = set()
    for chapter in FULL_408_CHAPTERS:
        report = check_plan(CFG, chapter, dry_run=True)
        assert report["verdict"] == "pass"
        assert report["uncovered_content_records"] == []
        source_ids = {
            row["id"] for row in read_jsonl(CFG.chapter_source(chapter))
        }
        concepts = read_jsonl(CFG.internal_concepts(chapter))
        for concept in concepts:
            concept_ids.add(concept["id"])
            package = read_json(CFG.review_input_dir / f"{concept['id']}.json")
            assert package["concept"]["id"] == concept["id"]
            assert package["source_records"]
            assert {row["id"] for row in package["source_records"]} <= source_ids

    covered_concept_ids = {
        concept_id
        for item in coverage["items"]
        for concept_id in item["concept_ids"]
    }
    assert len(concept_ids) == 122
    assert concept_ids == covered_concept_ids
