#!/usr/bin/env python3
"""Validate the extracted corpus and write reports/validation.json."""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from typing import Iterator, Optional

from config import CHAPTER_FILES, CHAPTER_STEMS, GENERATED_FILES, ROOT
from extract_corpus import (
    CUSTOM_LABELS,
    CUSTOM_REFS,
    GROUP_MATH_ENVS,
    MATH_ENVS,
)
from latex_state import (
    find_environment_end,
    is_escaped,
    mask_comments,
    read_command_with_arguments,
)


REQUIRED_FIELDS = {
    "id", "document_order", "type", "chapter_number", "section_number",
    "heading_path", "content_format", "content", "raw_latex", "source_file",
    "source_line_start", "source_line_end", "labels", "references",
    "citations", "language",
}
SELECTED_FILES = ["ack.tex", "why.tex"] + [f"{stem}-python.tex" for stem in CHAPTER_STEMS]
EXCLUDED_WRAPPERS = {"notpcode", "javaonly", "cpponly", "htmlonly"}


def read_jsonl(path: Path) -> list[dict]:
    objects = []
    with path.open("r", encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            try:
                value = json.loads(line)
            except json.JSONDecodeError as error:
                raise AssertionError(f"{path}:{line_number}: {error}") from error
            if not isinstance(value, dict):
                raise AssertionError(f"{path}:{line_number}: line is not an object")
            objects.append(value)
    return objects


def selected_commands(text: str, start: int = 0, end: Optional[int] = None) -> Iterator[tuple[int, str, list[str], int]]:
    end = len(text) if end is None else end
    masked = mask_comments(text)
    i = start
    while i < end:
        if masked[i] != "\\" or is_escaped(masked, i):
            i += 1
            continue
        try:
            name, args, command_end = read_command_with_arguments(masked, i)
        except ValueError:
            i += 1
            continue
        if name == "pcodeonly" and args:
            open_brace = masked.find("{", i, command_end)
            if open_brace >= 0:
                yield from selected_commands(text, open_brace + 1, command_end - 1)
            i = command_end
            continue
        if name in EXCLUDED_WRAPPERS and args:
            i = command_end
            continue
        yield i, name, args, command_end
        i += 1


def source_semantics(sources: dict[str, str]) -> tuple[set[str], set[str], set[str]]:
    labels, references, citations = set(), set(), set()
    for text in sources.values():
        for _, name, args, _ in selected_commands(text):
            if not args:
                continue
            if name == "label":
                labels.add(args[-1].strip())
            elif name in CUSTOM_LABELS:
                labels.add(CUSTOM_LABELS[name] + args[-1].strip())
            elif name in {"ref", "eqref", "pageref", "autoref"}:
                references.add(args[-1].strip())
            elif name in CUSTOM_REFS:
                references.add(CUSTOM_REFS[name] + args[-1].strip())
            elif name.lower().startswith("cite"):
                citations.update(x.strip() for x in args[-1].split(",") if x.strip())
    return labels, references, citations


def formula_occurrences(
    text: str, start: int = 0, end: Optional[int] = None
) -> tuple[list[tuple[int, int, str]], list[tuple[int, int, str]]]:
    """Return display and inline formula spans from the selected edition."""
    end = len(text) if end is None else end
    masked = mask_comments(text)
    display: list[tuple[int, int, str]] = []
    inline: list[tuple[int, int, str]] = []
    i = start
    while i < end:
        if masked.startswith("$$", i) and not is_escaped(masked, i):
            close = masked.find("$$", i + 2, end)
            if close >= 0:
                display.append((i, close + 2, text[i:close + 2]))
                i = close + 2
                continue
        if masked[i] == "$" and not is_escaped(masked, i):
            close = i + 1
            while close < end and (masked[close] != "$" or is_escaped(masked, close)):
                close += 1
            if close < end:
                inline.append((i, close + 1, text[i:close + 1]))
                i = close + 1
                continue
        if masked[i] != "\\" or is_escaped(masked, i):
            i += 1
            continue
        try:
            name, args, command_end = read_command_with_arguments(masked, i)
        except ValueError:
            i += 1
            continue
        if name == "pcodeonly" and args:
            open_brace = masked.find("{", i, command_end)
            if open_brace >= 0:
                nested_display, nested_inline = formula_occurrences(
                    text, open_brace + 1, command_end - 1
                )
                display.extend(nested_display)
                inline.extend(nested_inline)
            i = command_end
            continue
        if name in EXCLUDED_WRAPPERS and args:
            i = command_end
            continue
        if name == "[":
            close = masked.find(r"\]", command_end, end)
            if close >= 0:
                display.append((i, close + 2, text[i:close + 2]))
                i = close + 2
                continue
        if name == "(":
            close = masked.find(r"\)", command_end, end)
            if close >= 0:
                inline.append((i, close + 2, text[i:close + 2]))
                i = close + 2
                continue
        if name == "begin" and args:
            env = args[0]
            try:
                env_end_start, env_end = find_environment_end(masked, i, env)
            except ValueError:
                i = command_end
                continue
            if env_end <= end:
                if env in MATH_ENVS:
                    display.append((i, env_end, text[i:env_end]))
                elif env == "figure":
                    for caption_start, caption_name, caption_args, caption_end in selected_commands(
                        text, command_end, env_end_start
                    ):
                        if caption_name == "caption" and caption_args:
                            open_brace = masked.find("{", caption_start, caption_end)
                            if open_brace >= 0:
                                nested_display, nested_inline = formula_occurrences(
                                    text, open_brace + 1, caption_end - 1
                                )
                                display.extend(nested_display)
                                inline.extend(nested_inline)
                else:
                    nested_display, nested_inline = formula_occurrences(
                        text, command_end, env_end_start
                    )
                    display.extend(nested_display)
                    inline.extend(nested_inline)
                i = env_end
                continue
        i += 1
    return display, inline


def locate_source_texts() -> dict[str, str]:
    result = {}
    original = ROOT / "source_snapshot/original_tex"
    generated = ROOT / "source_snapshot/generated_python_tex"
    for filename in SELECTED_FILES:
        if filename in {"ack.tex", "why.tex"}:
            path = original / filename
            display = f"source_snapshot/original_tex/{filename}"
        else:
            path = generated / filename
            display = f"source_snapshot/generated_python_tex/{filename}"
        result[display] = path.read_text(encoding="utf-8")
    return result


def inline_formula_is_covered(
    display_name: str, text: str, occurrence: tuple[int, int, str], records: list[dict]
) -> bool:
    offset, _, raw = occurrence
    line = text.count("\n", 0, offset) + 1
    for record in records:
        if record["source_file"] != display_name:
            continue
        if record["source_line_start"] <= line <= record["source_line_end"] and raw in record["raw_latex"]:
            return True
    return False


def run_validation() -> dict:
    checks: dict[str, dict] = {}
    failures = []

    def check(name: str, passed: bool, **details) -> None:
        checks[name] = {"passed": bool(passed), **details}
        if not passed:
            failures.append(name)

    records_path = ROOT / "corpus/records.jsonl"
    records = read_jsonl(records_path)
    chapter_paths = sorted((ROOT / "corpus/chapters").glob("*.jsonl"))
    chapter_records = [item for path in chapter_paths for item in read_jsonl(path)]
    bibliography = read_jsonl(ROOT / "corpus/bibliography.jsonl")
    unresolved = read_jsonl(ROOT / "reports/unresolved_commands.jsonl")
    omitted = read_jsonl(ROOT / "reports/omitted_figures.jsonl")

    expected_titles = [
        "Introduction", "Array-Based Lists", "Linked Lists", "Skiplists",
        "Hash Tables", "Binary Trees", "Random Binary Search Trees",
        "Scapegoat Trees", "Red-Black Trees", "Heaps", "Sorting Algorithms",
        "Graphs", "Data Structures for Integers", "External Memory Searching",
    ]
    actual_titles = [
        x["content"] for x in records
        if x["type"] == "chapter" and x["chapter_number"] is not None
    ]
    check("all_main_chapters_present", actual_titles == expected_titles, actual=actual_titles)

    generated_main = (ROOT / "source_snapshot/generated_python_tex/ods-python.tex").read_text(encoding="utf-8")
    include_order = [
        args[-1] for _, name, args, _ in selected_commands(generated_main)
        if name in {"input", "include"} and args and (
            args[-1] in {"ack", "why"} or args[-1].endswith("-python")
        )
    ]
    expected_order = ["ack", "why"] + [f"{stem}-python" for stem in CHAPTER_STEMS]
    check("chapter_order_matches_main", include_order == expected_order, actual=include_order)

    check("all_jsonl_lines_parse", True, files=len(chapter_paths) + 4)
    ids = [x["id"] for x in records]
    check("record_ids_unique", len(ids) == len(set(ids)), total=len(ids))
    orders = [x["document_order"] for x in records]
    check("document_order_strictly_increasing", orders == list(range(1, len(records) + 1)))

    missing_fields = [
        x.get("id", "<missing-id>") for x in records if not REQUIRED_FIELDS.issubset(x)
    ]
    invalid_locations = [
        x["id"] for x in records
        if not isinstance(x.get("source_line_start"), int)
        or not isinstance(x.get("source_line_end"), int)
        or x.get("source_line_start", 0) < 1
        or x.get("source_line_end", 0) < x.get("source_line_start", 0)
        or not (ROOT / x.get("source_file", "")).is_file()
    ]
    check("all_records_have_schema_fields", not missing_fields, missing=missing_fields[:20])
    check("all_records_have_source_locations", not invalid_locations, invalid=invalid_locations[:20])

    unprocessed = []
    for record in records:
        for _, name, _, _ in selected_commands(record["raw_latex"]):
            if name in {"input", "include"}:
                unprocessed.append(record["id"])
    check("no_unprocessed_input_or_include", not unprocessed, records=unprocessed[:20])

    image_suffixes = {".png", ".jpg", ".jpeg", ".svg", ".eps", ".ipe"}
    image_files = [str(p.relative_to(ROOT)) for p in ROOT.rglob("*") if p.is_file() and p.suffix.lower() in image_suffixes]
    check("no_image_files", not image_files, files=image_files)
    git_dirs = [str(p.relative_to(ROOT)) for p in ROOT.rglob(".git")]
    check("no_git_repository", not git_dirs, paths=git_dirs)
    forbidden_outputs = [
        str(p.relative_to(ROOT)) for p in ROOT.rglob("*")
        if p.is_file() and p.suffix.lower() in {".pdf", ".html", ".htm", ".epub"}
    ]
    check("no_pdf_html_or_epub", not forbidden_outputs, files=forbidden_outputs)

    empty_equations = [x["id"] for x in records if x["type"] in {"equation", "equation_group"} and not x["content"].strip()]
    empty_code = [x["id"] for x in records if x["type"] in {"code", "algorithm"} and not x["content"].strip()]
    check("no_empty_equation_records", not empty_equations, records=empty_equations)
    check("no_empty_code_records", not empty_code, records=empty_code)

    sources = locate_source_texts()
    source_labels, source_refs, source_cites = source_semantics(sources)
    output_labels = {value for x in records for value in x["labels"]}
    output_refs = {value for x in records for value in x["references"]}
    output_cites = {value for x in records for value in x["citations"]}
    check("all_labels_collected", source_labels <= output_labels,
          missing=sorted(source_labels - output_labels))
    check("all_references_collected", source_refs <= output_refs,
          missing=sorted(source_refs - output_refs))
    check("all_citation_keys_collected", source_cites <= output_cites,
          missing=sorted(source_cites - output_cites))

    unresolved_commands = {x.get("command") for x in unresolved if x.get("kind") == "unresolved_command"}
    check("unresolved_commands_reported", all(x.get("reason") for x in unresolved),
          unique_commands=len(unresolved_commands), report_entries=len(unresolved))

    display_total = 0
    inline_total = 0
    uncovered_inline = []
    for display_name, text in sources.items():
        displays, inlines = formula_occurrences(text)
        display_total += len(displays)
        inline_total += len(inlines)
        for occurrence in inlines:
            if not inline_formula_is_covered(display_name, text, occurrence, records):
                uncovered_inline.append({
                    "source_file": display_name,
                    "source_line": text.count("\n", 0, occurrence[0]) + 1,
                    "formula": occurrence[2],
                })
    equation_records = sum(x["type"] in {"equation", "equation_group"} for x in records)
    check("display_formula_count_matches", display_total == equation_records,
          source=display_total, output=equation_records)
    check("inline_formulas_preserved", not uncovered_inline,
          source=inline_total, uncovered=uncovered_inline[:20])

    stats = json.loads((ROOT / "reports/extraction_stats.json").read_text(encoding="utf-8"))
    code_records = sum(x["type"] in {"code", "algorithm"} for x in records)
    check("code_import_count_matches", stats["code_imports_source"] == code_records,
          source=stats["code_imports_source"], output=code_records)
    check("chapter_title_count_matches",
          stats["chapter_titles_source"] == stats["chapter_titles_output"] == 14,
          source=stats["chapter_titles_source"], output=stats["chapter_titles_output"])

    main_id_set = set(ids)
    chapter_ids = [x["id"] for x in chapter_records]
    check("main_and_chapter_id_sets_match",
          main_id_set == set(chapter_ids) and len(chapter_ids) == len(main_id_set),
          main=len(main_id_set), chapters=len(chapter_ids))

    utf8_failures = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or "__pycache__" in path.parts:
            continue
        try:
            path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            utf8_failures.append(str(path.relative_to(ROOT)))
    check("all_outputs_utf8", not utf8_failures, files=utf8_failures)

    check("bibliography_entries_present", len(bibliography) > 0, total=len(bibliography))
    check("generated_file_set_exact",
          sorted(p.name for p in (ROOT / "source_snapshot/generated_python_tex").glob("*"))
          == sorted(GENERATED_FILES))
    check("chapter_file_set_exact",
          [p.name for p in chapter_paths]
          == sorted(["00-frontmatter.jsonl"] + CHAPTER_FILES + [
              "90-bibliography.jsonl", "91-index.jsonl"
          ]))

    counts = Counter(x["type"] for x in records)
    validation = {
        "status": "passed" if not failures else "failed",
        "checks": checks,
        "record_counts_by_type": dict(sorted(counts.items())),
        "records_total": len(records),
        "equations_total": equation_records,
        "inline_formulas_total": inline_total,
        "code_blocks_total": code_records,
        "tables_total": counts["table"],
        "figures_omitted_total": counts["figure_caption"],
        "graphics_commands_omitted_total": len(omitted),
        "unresolved_commands_total": len(unresolved),
    }
    (ROOT / "reports/validation.json").write_text(
        json.dumps(validation, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    if failures:
        raise AssertionError("validation failed: " + ", ".join(failures))
    return validation


if __name__ == "__main__":
    result = run_validation()
    print(json.dumps({
        "status": result["status"],
        "records_total": result["records_total"],
        "equations_total": result["equations_total"],
        "code_blocks_total": result["code_blocks_total"],
    }, indent=2))
