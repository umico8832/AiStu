#!/usr/bin/env python3
"""Extract the pseudocode edition into deterministic JSONL records."""

from __future__ import annotations

import argparse
import ast
import json
import re
import shutil
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Optional

from bibtex_parser import parse_bibtex
from config import CHAPTER_FILES, CHAPTER_STEMS, ROOT
from latex_state import (
    SourceText,
    find_environment_end,
    is_escaped,
    iter_commands,
    iter_commands_deep,
    mask_comments,
    read_command_with_arguments,
)


HEADING_COMMANDS = {
    "part": "part",
    "part*": "part",
    "chapter": "chapter",
    "chapter*": "chapter",
    "section": "section",
    "section*": "section",
    "subsection": "subsection",
    "subsection*": "subsection",
    "subsubsection": "subsubsection",
    "subsubsection*": "subsubsection",
}
MATH_ENVS = {
    "equation",
    "equation*",
    "displaymath",
    "align",
    "align*",
    "eqnarray",
    "eqnarray*",
    "gather",
    "gather*",
    "multline",
    "multline*",
    "array",
    "cases",
}
GROUP_MATH_ENVS = {
    "align",
    "align*",
    "eqnarray",
    "eqnarray*",
    "gather",
    "gather*",
    "multline",
    "multline*",
}
THEOREM_ENVS = {
    "thm": "theorem",
    "theorem": "theorem",
    "lem": "lemma",
    "lemma": "lemma",
    "cor": "corollary",
    "corollary": "corollary",
    "proof": "proof",
    "definition": "definition",
    "defn": "definition",
    "example": "example",
    "exc": "exercise",
    "exercise": "exercise",
    "prp": "theorem",
}
LIST_ENVS = {"enumerate", "itemize", "description"}
TABLE_ENVS = {"table", "table*", "tabular", "tabularx", "longtable", "threeparttable"}
CODE_ENVS = {"oframed", "leftbar", "verbatim", "Verbatim", "lstlisting", "alltt"}
WRAPPER_ENVS = {"center", "flushleft", "flushright", "minipage", "titlepage"}
DROP_ONLY_COMMANDS = {
    "centering", "cleardoublepage", "newpage", "thispagestyle", "smallskip",
    "medskip", "bigskip", "noindent", "vfill", "clearpage",
}
CUSTOM_LABELS = {
    "chaplabel": "chap:", "seclabel": "sec:", "alglabel": "alg:",
    "applabel": "app:", "tablabel": "tab:", "figlabel": "fig:",
    "eqlabel": "eq:", "thmlabel": "thm:", "lemlabel": "lem:",
    "corlabel": "cor:", "exclabel": "exc:", "prplabel": "prp:",
}
CUSTOM_REFS = {
    "Chapref": "chap:", "chapref": "chap:", "Secref": "sec:",
    "secref": "sec:", "sref": "sec:", "Algref": "alg:", "algref": "alg:",
    "Appref": "app:", "appref": "app:", "Tabref": "tab:", "tabref": "tab:",
    "Figref": "fig:", "figref": "fig:", "Eqref": "eq:", "myeqref": "eq:",
    "thmref": "thm:", "lemref": "lem:", "corref": "cor:",
    "excref": "exc:", "prpref": "prp:",
}


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text).strip("-")
    return slug[:60] or "record"


def strip_comments(text: str) -> str:
    masked = mask_comments(text)
    return "".join(original if masked_char != " " or original.isspace() else " "
                   for original, masked_char in zip(text, masked))


def collect_semantics(raw: str) -> tuple[list[str], list[str], list[str]]:
    labels, references, citations = [], [], []
    for _, name, args, _ in iter_commands_deep(raw):
        if not args:
            continue
        if name == "label":
            labels.append(args[-1].strip())
        elif name in CUSTOM_LABELS:
            labels.append(CUSTOM_LABELS[name] + args[-1].strip())
        elif name in {"ref", "eqref", "pageref", "autoref"}:
            references.append(args[-1].strip())
        elif name in CUSTOM_REFS:
            references.append(CUSTOM_REFS[name] + args[-1].strip())
        elif name.lower().startswith("cite"):
            citations.extend(x.strip() for x in args[-1].split(",") if x.strip())
    return list(dict.fromkeys(labels)), list(dict.fromkeys(references)), list(dict.fromkeys(citations))


def remove_graphics(raw: str) -> str:
    """Remove graphics commands and pure graphics environments with balanced scanning."""
    masked = mask_comments(raw)
    pieces = []
    cursor = 0
    i = 0
    while i < len(masked):
        if masked[i] != "\\" or is_escaped(masked, i):
            i += 1
            continue
        try:
            name, args, end = read_command_with_arguments(masked, i)
        except ValueError:
            i += 1
            continue
        if name in {"includegraphics", "includesvg", "includeipe"}:
            pieces.append(raw[cursor:i])
            cursor = end
            i = end
            continue
        if name == "begin" and args and args[0] in {"tikzpicture", "picture", "pspicture"}:
            try:
                _, env_end = find_environment_end(masked, i, args[0])
            except ValueError:
                env_end = end
            pieces.append(raw[cursor:i])
            cursor = env_end
            i = env_end
            continue
        i = max(i + 1, end)
    pieces.append(raw[cursor:])
    return "".join(pieces)


class Extractor:
    def __init__(self, source_root: Path, work_dir: Path):
        self.source_root = source_root
        self.latex_dir = source_root / "latex"
        self.python_dir = source_root / "python/ods"
        self.work_dir = work_dir
        self.generated_dir = work_dir / "generated"
        self.map_dir = work_dir / "maps"
        self.records: list[dict] = []
        self.index_occurrences: list[dict] = []
        self.omitted: list[dict] = []
        self.unresolved: list[dict] = []
        self.chapter_number: Optional[int] = None
        self.section_number: Optional[str] = None
        self.subsection_number: Optional[str] = None
        self.subsubsection_number: Optional[str] = None
        self.heading_titles: dict[str, Optional[str]] = {
            "part": None, "chapter": None, "section": None,
            "subsection": None, "subsubsection": None,
        }
        self.section_counter = self.subsection_counter = self.subsubsection_counter = 0
        self.chapter_bucket = "00-frontmatter.jsonl"
        self.order = 0
        self.referenced_python: set[Path] = set()
        self.seen_footnotes: set[tuple[str, int]] = set()
        self.seen_index: set[tuple[str, int]] = set()
        self.seen_structures: set[tuple[str, int, str]] = set()
        self.source_stats = Counter()
        self.output_stats = Counter()

    def heading_path(self) -> list[str]:
        return [x for x in (
            self.heading_titles["part"],
            self.heading_titles["chapter"],
            self.heading_titles["section"],
            self.heading_titles["subsection"],
            self.heading_titles["subsubsection"],
        ) if x]

    def add_record(
        self,
        record_type: str,
        content: str,
        raw: str,
        source: SourceText,
        start: int,
        end: int,
        extra: Optional[dict] = None,
        bucket: Optional[str] = None,
    ) -> dict:
        self.order += 1
        labels, references, citations = collect_semantics(raw)
        record = {
            "id": f"ods-{self.order:06d}-{record_type}-{slugify(content)[:36]}",
            "document_order": self.order,
            "type": record_type,
            "chapter_number": self.chapter_number,
            "section_number": self.section_number,
            "heading_path": self.heading_path(),
            "content_format": "latex",
            "content": content,
            "raw_latex": raw,
            **source.span(start, end),
            "labels": labels,
            "references": references,
            "citations": citations,
            "language": "en",
            "_chapter_file": bucket or self.chapter_bucket,
        }
        if self.subsection_number:
            record["subsection_number"] = self.subsection_number
        if self.subsubsection_number:
            record["subsubsection_number"] = self.subsubsection_number
        if extra:
            record.update(extra)
        if record.get("generated_source_file") and record.get("code_source_file"):
            record["source_spans"] = [
                {
                    "source_file": record["source_file"],
                    "source_line_start": record["source_line_start"],
                    "source_line_end": record["source_line_end"],
                    "role": "generated_pseudocode",
                },
                {
                    "source_file": record["original_source_file"],
                    "source_line_start": record["original_source_line_start"],
                    "source_line_end": record["original_source_line_end"],
                    "role": "original_import_command",
                },
            ] + [
                {**span, "role": "python_implementation"}
                for span in record.get("code_source_spans", [])
            ]
        self.records.append(record)
        self.output_stats[record_type] += 1
        if record_type not in {"footnote", "index_entry", "bibliography_entry"}:
            self.collect_embedded_inline(source, start, end)
        return record

    def collect_embedded_inline(self, source: SourceText, start: int, end: int) -> None:
        original = source.text[start:end]
        for offset, name, args, command_end in iter_commands(original):
            if not args:
                continue
            absolute = start + offset
            key = (source.display_name, absolute)
            if name == "footnote" and key not in self.seen_footnotes:
                self.seen_footnotes.add(key)
                self.add_record(
                    "footnote", normalize_space(args[-1]), original[offset:command_end],
                    source, absolute, start + command_end,
                )
            elif name == "index" and key not in self.seen_index:
                self.seen_index.add(key)
                self.index_occurrences.append({
                    "content": normalize_space(args[-1]),
                    "raw": original[offset:command_end],
                    "source": source,
                    "start": absolute,
                    "end": start + command_end,
                })

    def scan_omitted_graphics(self, source: SourceText) -> None:
        for offset, name, args, end in iter_commands(source.text):
            if name not in {"includegraphics", "includesvg", "includeipe"}:
                continue
            span = source.span(offset, end)
            self.omitted.append({
                "command": source.text[offset:end],
                "path": args[-1] if args else None,
                **span,
                "reason": "graphics omitted; caption and labels retained separately",
            })

    def parse_heading(self, source: SourceText, start: int, name: str, args: list[str], end: int) -> None:
        title = normalize_space(args[-1]) if args else ""
        kind = HEADING_COMMANDS[name]
        if kind == "chapter":
            if name.endswith("*"):
                self.chapter_number = None
                self.chapter_bucket = "00-frontmatter.jsonl"
            else:
                self.chapter_number = (self.chapter_number or 0) + 1
                if self.chapter_number > len(CHAPTER_FILES):
                    raise RuntimeError("more numbered chapters than configured")
                self.chapter_bucket = CHAPTER_FILES[self.chapter_number - 1]
            self.section_counter = self.subsection_counter = self.subsubsection_counter = 0
            self.section_number = self.subsection_number = self.subsubsection_number = None
            self.heading_titles.update({
                "chapter": title, "section": None, "subsection": None, "subsubsection": None
            })
        elif kind == "section":
            self.section_counter += 1
            self.subsection_counter = self.subsubsection_counter = 0
            self.section_number = (
                f"{self.chapter_number}.{self.section_counter}"
                if self.chapter_number else None
            )
            self.subsection_number = self.subsubsection_number = None
            self.heading_titles.update({"section": title, "subsection": None, "subsubsection": None})
        elif kind == "subsection":
            self.subsection_counter += 1
            self.subsubsection_counter = 0
            self.subsection_number = (
                f"{self.section_number}.{self.subsection_counter}"
                if self.section_number else None
            )
            self.subsubsection_number = None
            self.heading_titles.update({"subsection": title, "subsubsection": None})
        elif kind == "subsubsection":
            self.subsubsection_counter += 1
            self.subsubsection_number = (
                f"{self.subsection_number}.{self.subsubsection_counter}"
                if self.subsection_number else None
            )
            self.heading_titles["subsubsection"] = title
        else:
            self.heading_titles["part"] = title
        self.add_record(kind, title, source.text[start:end], source, start, end)

    def split_items(self, raw: str, absolute_start: int) -> list[tuple[str, int, int]]:
        masked = mask_comments(raw)
        positions = []
        depth = 0
        i = 0
        while i < len(masked):
            if masked[i] == "\\" and not is_escaped(masked, i):
                try:
                    name, args, end = read_command_with_arguments(masked, i)
                except ValueError:
                    i += 1
                    continue
                if name == "begin":
                    depth += 1
                elif name == "end":
                    depth = max(0, depth - 1)
                elif name == "item" and depth <= 1:
                    positions.append((i, end))
                i = max(i + 1, end)
            else:
                i += 1
        result = []
        for index, (item_start, content_start) in enumerate(positions):
            item_end = positions[index + 1][0] if index + 1 < len(positions) else len(raw)
            content = raw[content_start:item_end]
            content = re.sub(r"\\end\s*\{[^}]+\}\s*$", "", content, flags=re.S)
            result.append((content, absolute_start + item_start, absolute_start + item_end))
        return result

    def extract_caption(self, raw: str) -> tuple[str, str]:
        for offset, name, args, end in iter_commands(raw):
            if name == "caption" and args:
                caption = args[-1]
                label_bits = []
                for lo, other, other_args, hi in iter_commands(raw):
                    if other == "label" or other in CUSTOM_LABELS:
                        label_bits.append(raw[lo:hi])
                return normalize_space(caption), raw[offset:end] + "".join(label_bits)
        return "", ""

    def code_metadata(self, source: SourceText, start: int) -> dict:
        provenance = source.provenance_at(start) or {}
        command = provenance.get("import_command")
        if not command:
            line = source.line_number(start)
            for candidate in range(line - 1, max(0, line - 6), -1):
                item = source.provenance[candidate - 1] if source.provenance else {}
                if item.get("import_command"):
                    command = item["import_command"]
                    break
        extra = {
            "language_or_format": "Open Data Structures pseudocode (LaTeX)",
            "original_import_command": command,
        }
        if not command:
            return extra
        match = re.search(r"\{ods/(\w+)([^}]*)\}", command)
        if not match:
            return extra
        class_name, suffix = match.groups()
        path = self.python_dir / f"{class_name.lower()}.py"
        extra["code_source_file"] = f"python/ods/{path.name}"
        extra["code_method_names"] = [
            value for value in suffix.lstrip(".").split(".") if value
        ]
        if path.is_file():
            self.referenced_python.add(path)
            spans = self.python_spans(path, extra["code_method_names"])
            if spans:
                extra["code_source_line_start"] = min(a for a, _ in spans)
                extra["code_source_line_end"] = max(b for _, b in spans)
                extra["code_source_spans"] = [
                    {"source_file": extra["code_source_file"], "source_line_start": a, "source_line_end": b}
                    for a, b in spans
                ]
        return extra

    @staticmethod
    def python_spans(path: Path, requested: list[str]) -> list[tuple[int, int]]:
        text = path.read_text(encoding="utf-8")
        try:
            tree = ast.parse(text)
        except SyntaxError:
            return []
        names = {re.sub(r"([a-z])([A-Z])", r"\1_\2", value.split("(", 1)[0]).lower()
                 for value in requested}
        if any("(" not in value for value in requested):
            names.add("initialize")
        spans = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                clean = node.name.strip("_").lower()
                if clean in names:
                    spans.append((node.lineno, getattr(node, "end_lineno", node.lineno)))
        return sorted(set(spans))

    def parse_environment(
        self, source: SourceText, start: int, begin_end: int, env: str, end_start: int, end: int
    ) -> None:
        raw = source.text[start:end]
        safe_raw = remove_graphics(raw)
        inner_start = begin_end
        inner_end = end_start
        inner = source.text[inner_start:inner_end]
        if env == "figure":
            caption, caption_raw = self.extract_caption(raw)
            self.add_record(
                "figure_caption", caption, caption_raw, source, start, end,
                {"figure_omitted": True, "environment": env},
            )
        elif env in MATH_ENVS:
            record_type = "equation_group" if env in GROUP_MATH_ENVS else "equation"
            content = safe_raw.strip()
            self.add_record(record_type, content, safe_raw, source, start, end, {"environment": env})
        elif env in THEOREM_ENVS:
            content = normalize_space(strip_comments(inner))
            self.add_record(THEOREM_ENVS[env], content, safe_raw, source, start, end, {"environment": env})
            self.parse_nested_structures(source, inner_start, inner_end)
        elif env in LIST_ENVS:
            content = normalize_space(strip_comments(inner))
            self.add_record("list", content, safe_raw, source, start, end, {
                "list_kind": {"enumerate": "ordered", "itemize": "unordered", "description": "description"}[env]
            })
            for position, (item, item_start, item_end) in enumerate(self.split_items(raw, start), 1):
                clean = normalize_space(strip_comments(item))
                if clean:
                    self.add_record("list_item", clean, remove_graphics(item), source, item_start, item_end, {
                        "list_kind": env, "item_number": position
                    })
            self.parse_nested_structures(source, inner_start, inner_end)
        elif env in TABLE_ENVS:
            content = safe_raw.strip()
            extra = {"environment": env}
            cells = self.parse_table_cells(inner)
            if cells is not None:
                extra["table_cells"] = cells
            else:
                self.unresolved.append({
                    "kind": "table_structure", "environment": env,
                    **source.span(start, end),
                    "raw_latex": safe_raw,
                    "reason": "nested or macro-heavy table retained as LaTeX; cells not guessed",
                })
            self.add_record("table", content, safe_raw, source, start, end, extra)
        elif env in CODE_ENVS:
            if env in {"oframed", "leftbar"}:
                if env == "leftbar" and "\\begin{oframed}" in source.text[max(0, start - 100):start]:
                    return
                record_type = "algorithm"
                extra = self.code_metadata(source, start)
            else:
                record_type = "code"
                extra = {"language_or_format": "LaTeX verbatim"}
            content = inner.strip()
            self.add_record(record_type, content, raw, source, start, end, extra)
        elif env in WRAPPER_ENVS:
            self.parse_range(source, inner_start, inner_end)
        elif env in {"document"}:
            self.parse_range(source, inner_start, inner_end)
        else:
            content = normalize_space(strip_comments(inner))
            self.add_record(
                "unknown_environment", content, safe_raw, source, start, end,
                {"environment": env, "preserved_verbatim": True},
            )
            self.unresolved.append({
                "kind": "unknown_environment", "command": f"\\begin{{{env}}}",
                **source.span(start, end),
                "reason": "environment semantics not specialized; full LaTeX retained",
            })
            self.parse_nested_structures(source, inner_start, inner_end)

    def parse_nested_structures(self, source: SourceText, start: int, end: int) -> None:
        """Extract significant structures nested inside theorem/list containers."""
        masked = source.masked
        significant = MATH_ENVS | TABLE_ENVS | CODE_ENVS | LIST_ENVS | {"figure"} | set(THEOREM_ENVS)
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
                    self.parse_nested_structures(source, open_brace + 1, command_end - 1)
                i = command_end
                continue
            if name in {"notpcode", "javaonly", "cpponly", "htmlonly"} and args:
                i = command_end
                continue
            if name == "[":
                close = masked.find(r"\]", command_end, end)
                if close >= 0:
                    finish = close + 2
                    key = (source.display_name, i, "displaymath")
                    if key not in self.seen_structures:
                        self.seen_structures.add(key)
                        raw = source.text[i:finish]
                        self.add_record(
                            "equation", raw.strip(), raw, source, i, finish,
                            {"environment": r"\[...\]"},
                        )
                    i = finish
                    continue
            if name == "begin" and args:
                nested_env = args[0]
                try:
                    nested_end_start, nested_end = find_environment_end(masked, i, nested_env)
                except ValueError:
                    i = command_end
                    continue
                if nested_end > end:
                    i = command_end
                    continue
                if nested_env in significant:
                    key = (source.display_name, i, nested_env)
                    if key not in self.seen_structures:
                        self.seen_structures.add(key)
                        self.parse_environment(
                            source, i, command_end, nested_env, nested_end_start, nested_end
                        )
                else:
                    self.parse_nested_structures(source, command_end, nested_end_start)
                i = nested_end
                continue
            i = max(i + 1, command_end)

    @staticmethod
    def parse_table_cells(inner: str) -> Optional[list[list[str]]]:
        if "\\begin{" in inner or re.search(r"\\(multirow|cline|cmidrule)", inner):
            return None
        rows, current, brace, i = [], [], 0, 0
        cell_start = 0
        while i < len(inner):
            if inner[i] == "{" and not is_escaped(inner, i):
                brace += 1
            elif inner[i] == "}" and not is_escaped(inner, i):
                brace -= 1
            elif brace == 0 and inner[i] == "&" and not is_escaped(inner, i):
                current.append(normalize_space(inner[cell_start:i]))
                cell_start = i + 1
            elif brace == 0 and inner.startswith("\\\\", i):
                current.append(normalize_space(inner[cell_start:i]))
                rows.append(current)
                current = []
                i += 1
                cell_start = i + 1
            i += 1
        tail = normalize_space(inner[cell_start:])
        if tail:
            current.append(tail)
        if current:
            rows.append(current)
        return rows or None

    def flush_paragraphs(self, source: SourceText, start: int, end: int) -> None:
        if end <= start:
            return
        raw = source.text[start:end]
        masked = mask_comments(raw)
        boundaries = [0]
        for match in re.finditer(r"\n[ \t]*\n+", masked):
            boundaries.extend([match.start(), match.end()])
        boundaries.append(len(raw))
        for left, right in zip(boundaries[::2], boundaries[1::2]):
            piece = raw[left:right]
            absolute_start, absolute_end = start + left, start + right
            clean_raw = remove_graphics(piece)
            no_comments = strip_comments(clean_raw).strip()
            if not no_comments:
                continue
            command_only = re.fullmatch(
                r"(?:\\(?:%s)(?:\s*\{[^{}]*\})?\s*)+" % "|".join(DROP_ONLY_COMMANDS),
                no_comments,
                flags=re.S,
            )
            if command_only:
                continue
            content = normalize_space(no_comments)
            self.add_record("paragraph", content, clean_raw.strip(), source, absolute_start, absolute_end)

    def parse_range(self, source: SourceText, start: int = 0, end: Optional[int] = None) -> None:
        end = len(source.text) if end is None else end
        masked = source.masked
        cursor = start
        segment = start
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
                self.flush_paragraphs(source, segment, i)
                open_brace = masked.find("{", i, command_end)
                if open_brace >= 0:
                    self.parse_range(source, open_brace + 1, command_end - 1)
                i = command_end
                segment = i
                continue
            if name in {"notpcode", "javaonly", "cpponly", "htmlonly"} and args:
                self.flush_paragraphs(source, segment, i)
                i = command_end
                segment = i
                continue
            if name in HEADING_COMMANDS and args:
                self.flush_paragraphs(source, segment, i)
                self.parse_heading(source, i, name, args, command_end)
                i = command_end
                segment = i
                continue
            if name == "[":
                close = masked.find(r"\]", command_end, end)
                if close >= 0:
                    self.flush_paragraphs(source, segment, i)
                    finish = close + 2
                    key = (source.display_name, i, "displaymath")
                    if key not in self.seen_structures:
                        self.seen_structures.add(key)
                        raw = source.text[i:finish]
                        self.add_record(
                            "equation", raw.strip(), raw, source, i, finish,
                            {"environment": r"\[...\]"},
                        )
                    i = finish
                    segment = i
                    continue
            if name == "begin" and args:
                env = args[0]
                try:
                    end_start, env_end = find_environment_end(masked, i, env)
                except ValueError:
                    self.unresolved.append({
                        "kind": "unclosed_environment", "command": f"\\begin{{{env}}}",
                        **source.span(i, command_end),
                        "reason": "no matching end command; source retained in following paragraph",
                    })
                    i = command_end
                    continue
                if env_end > end:
                    i = command_end
                    continue
                self.flush_paragraphs(source, segment, i)
                key = (source.display_name, i, env)
                if key not in self.seen_structures:
                    self.seen_structures.add(key)
                    self.parse_environment(source, i, command_end, env, end_start, env_end)
                i = env_end
                segment = i
                continue
            if name in {"hrule", "hrulefill"}:
                self.flush_paragraphs(source, segment, i)
                self.add_record("horizontal_break", source.text[i:command_end], source.text[i:command_end],
                                source, i, command_end)
                i = command_end
                segment = i
                continue
            i = max(i + 1, command_end if command_end <= end else i + 1)
        self.flush_paragraphs(source, segment, end)

    def add_metadata(self, main: SourceText) -> None:
        wanted = {"title": "title", "author": "author", "date": "version"}
        for offset, name, args, end in iter_commands(main.text):
            if name in wanted and args:
                content = normalize_space(args[-1])
                self.add_record(
                    "metadata", content, main.text[offset:end], main, offset, end,
                    {"metadata_field": wanted[name]}, bucket="00-frontmatter.jsonl",
                )

    def add_bibliography(self) -> list[dict]:
        entries = []
        for filename in ("ods.bib", "odsproc.bib"):
            entries.extend(parse_bibtex(
                self.latex_dir / filename, f"source_snapshot/{filename}"
            ))
        main = SourceText(
            self.generated_dir / "ods-python.tex",
            "source_snapshot/generated_python_tex/ods-python.tex",
            (self.generated_dir / "ods-python.tex").read_text(encoding="utf-8"),
            json.loads((self.map_dir / "ods-python.map.json").read_text(encoding="utf-8")),
        )
        bib_pos = main.text.find("\\bibliography")
        self.chapter_number = None
        self.section_number = self.subsection_number = self.subsubsection_number = None
        self.heading_titles.update({"chapter": "Bibliography", "section": None, "subsection": None, "subsubsection": None})
        self.add_record("chapter", "Bibliography", r"\bibliography{ods,odsproc}", main,
                        bib_pos, bib_pos + len(r"\bibliography{ods,odsproc}"),
                        bucket="90-bibliography.jsonl")
        for entry in entries:
            source_path = self.latex_dir / Path(entry["source_file"]).name
            source = SourceText(source_path, entry["source_file"], source_path.read_text(encoding="utf-8"))
            start = source.line_starts[entry["source_line_start"] - 1]
            end_line = entry["source_line_end"]
            end = source.line_starts[end_line] if end_line < len(source.line_starts) else len(source.text)
            self.add_record(
                "bibliography_entry", entry["raw_bibtex"], entry["raw_bibtex"],
                source, start, end,
                {k: v for k, v in entry.items() if k not in {
                    "raw_bibtex", "source_file", "source_line_start", "source_line_end"
                }},
                bucket="90-bibliography.jsonl",
            )
        return entries

    def add_index(self) -> None:
        main_path = self.generated_dir / "ods-python.tex"
        main = SourceText(
            main_path, "source_snapshot/generated_python_tex/ods-python.tex",
            main_path.read_text(encoding="utf-8"),
            json.loads((self.map_dir / "ods-python.map.json").read_text(encoding="utf-8")),
        )
        index_pos = main.text.find("\\printindex")
        self.heading_titles.update({"chapter": "Index", "section": None, "subsection": None, "subsubsection": None})
        self.add_record("chapter", "Index", r"\printindex", main, index_pos,
                        index_pos + len(r"\printindex"), bucket="91-index.jsonl")
        for item in sorted(self.index_occurrences, key=lambda x: (x["content"].casefold(), x["start"])):
            self.add_record(
                "index_entry", item["content"], item["raw"], item["source"],
                item["start"], item["end"], bucket="91-index.jsonl",
            )

    def detect_unresolved_commands(self, sources: list[SourceText]) -> None:
        definitions = set()
        for path in [self.latex_dir / "ods.sty", self.latex_dir / "ods.tex"]:
            text = path.read_text(encoding="utf-8")
            definitions.update(re.findall(r"\\(?:re)?newcommand\s*\{?\\([A-Za-z@]+)", text))
            definitions.update(re.findall(r"\\def\\([A-Za-z@]+)", text))
            definitions.update(re.findall(r"\\DeclareMathOperator\s*\{\\([A-Za-z@]+)", text))
        known = definitions | set(HEADING_COMMANDS) | {
            "begin", "end", "item", "label", "ref", "eqref", "pageref", "autoref",
            "cite", "citep", "citet", "footnote", "index", "caption",
            "includegraphics", "includesvg", "includeipe", "url", "href", "emph",
            "textbf", "textit", "texttt", "textrm", "textsf", "text", "ensuremath",
            "mathrm", "mathit", "mathbf", "mathbb", "mathcal", "mathtt",
            "frac", "sqrt", "left", "right", "sum", "log", "ln", "min", "max",
            "lim", "Pr", "E", "ldots", "cdots", "dots", "infty", "le", "ge",
            "neq", "approx", "equiv", "times", "cdot", "bmod", "ddiv", "bdiv",
            "lfloor", "rfloor", "lceil", "rceil", "ell", "alpha", "beta", "pi",
            "varphi", "Phi", "oplus", "cup", "subset", "prec", "to", "in",
            "not", "star", "quad", "qquad", "enspace", "hspace", "vspace",
            "noindent", "centering", "multicolumn", "hline", "cline", "tnote",
            "qedhere", "underbrace", "overbrace", "hat", "bar", "vec",
            "include", "input", "bibliography", "bibliographystyle", "printindex",
            "hrule", "hrulefill", "verb", "LaTeX", "protect", "textsection",
        } | set(CUSTOM_LABELS) | set(CUSTOM_REFS) | DROP_ONLY_COMMANDS
        occurrences: dict[str, dict] = {}
        for source in sources:
            for offset, name, args, end in iter_commands_deep(source.text):
                base = name.rstrip("*")
                if name in known or base in known or name.startswith("cite"):
                    continue
                if name in {"codeimport", "pcodeimport", "cppimport", "javaimport"}:
                    continue
                entry = occurrences.setdefault(name, {
                    "kind": "unresolved_command", "command": f"\\{name}",
                    **source.span(offset, end), "count": 0,
                    "reason": "command preserved verbatim; no semantic expansion was applied",
                })
                entry["count"] += 1
        self.unresolved.extend(occurrences.values())

    def run(self) -> dict:
        main_path = self.generated_dir / "ods-python.tex"
        main = SourceText(
            main_path, "source_snapshot/generated_python_tex/ods-python.tex",
            main_path.read_text(encoding="utf-8"),
            json.loads((self.map_dir / "ods-python.map.json").read_text(encoding="utf-8")),
        )
        self.add_metadata(main)
        include_names = [
            args[-1] for _, name, args, _ in iter_commands(main.text)
            if name in {"include", "input"} and args
        ]
        expected = ["ack", "why"] + [f"{x}-python" for x in CHAPTER_STEMS]
        selected = [x for x in include_names if x in expected]
        if selected != expected:
            raise RuntimeError(f"main include order mismatch: {selected}")

        sources = [main]
        for name in selected:
            if name in {"ack", "why"}:
                path = self.latex_dir / f"{name}.tex"
                display = f"source_snapshot/original_tex/{name}.tex"
                provenance = None
            else:
                path = self.generated_dir / f"{name}.tex"
                display = f"source_snapshot/generated_python_tex/{name}.tex"
                provenance = json.loads(
                    (self.map_dir / f"{name}.map.json").read_text(encoding="utf-8")
                )
            source = SourceText(path, display, path.read_text(encoding="utf-8"), provenance)
            sources.append(source)
            self.scan_omitted_graphics(source)
            self.parse_range(source)

        bibliography = self.add_bibliography()
        self.add_index()
        self.detect_unresolved_commands(sources)
        return {"bibliography": bibliography, "sources": sources}


def write_jsonl(path: Path, objects: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as out:
        for obj in objects:
            out.write(json.dumps(obj, ensure_ascii=False, sort_keys=True) + "\n")


def materialize(extractor: Extractor, result: dict) -> None:
    corpus = ROOT / "corpus"
    chapters = corpus / "chapters"
    reports = ROOT / "reports"
    records = []
    chapter_groups: dict[str, list[dict]] = defaultdict(list)
    for original in extractor.records:
        item = dict(original)
        chapter_file = item.pop("_chapter_file")
        records.append(item)
        chapter_groups[chapter_file].append(item)
    write_jsonl(corpus / "records.jsonl", records)
    for path in chapters.glob("*.jsonl"):
        path.unlink()
    all_chapter_files = ["00-frontmatter.jsonl"] + CHAPTER_FILES + [
        "90-bibliography.jsonl", "91-index.jsonl"
    ]
    for filename in all_chapter_files:
        write_jsonl(chapters / filename, chapter_groups.get(filename, []))
    write_jsonl(corpus / "bibliography.jsonl", result["bibliography"])
    write_jsonl(reports / "omitted_figures.jsonl", extractor.omitted)
    write_jsonl(reports / "unresolved_commands.jsonl", extractor.unresolved)

    snapshot = ROOT / "source_snapshot"
    original = snapshot / "original_tex"
    generated = snapshot / "generated_python_tex"
    referenced = snapshot / "referenced_python_code"
    for directory in (original, generated, referenced):
        if directory.exists():
            shutil.rmtree(directory)
        directory.mkdir(parents=True)
    keep_original = [
        "ods.tex", "ack.tex", "why.tex", "ods.sty", "ods-colors.sty",
        "Makefile", "snarf-python.py",
    ] + [f"{stem}.tex" for stem in CHAPTER_STEMS]
    for filename in keep_original:
        shutil.copy2(extractor.latex_dir / filename, original / filename)
    for path in extractor.generated_dir.glob("*.tex"):
        shutil.copy2(path, generated / path.name)
    for path in sorted(extractor.referenced_python):
        shutil.copy2(path, referenced / path.name)
    shutil.copy2(extractor.latex_dir / "ods.bib", snapshot / "ods.bib")
    shutil.copy2(extractor.latex_dir / "odsproc.bib", snapshot / "odsproc.bib")
    shutil.copy2(extractor.source_root / "COPYING", snapshot / "COPYING")

    stats = {
        "include_order": ["ack", "why"] + [f"{x}-python" for x in CHAPTER_STEMS],
        "numbered_chapters": sum(
            x["type"] == "chapter" and x["chapter_number"] is not None for x in records
        ),
        "record_counts_by_type": dict(Counter(x["type"] for x in records)),
        "records_total": len(records),
        "code_imports_source": sum(
            len(re.findall(r"(?m)^\s*\\(?:codeimport|pcodeimport)\b",
                           (extractor.latex_dir / f"{stem}.tex").read_text(encoding="utf-8")))
            for stem in CHAPTER_STEMS
        ),
        "code_blocks_output": sum(x["type"] in {"algorithm", "code"} for x in records),
        "chapter_titles_source": sum(
            len(re.findall(r"(?m)^\s*\\chapter(?!\*)\s*\{",
                           (extractor.latex_dir / f"{stem}.tex").read_text(encoding="utf-8")))
            for stem in CHAPTER_STEMS
        ),
        "chapter_titles_output": sum(
            x["type"] == "chapter" and x["chapter_number"] is not None for x in records
        ),
        "omitted_graphics_commands": len(extractor.omitted),
        "unresolved_items": len(extractor.unresolved),
    }
    (reports / "extraction_stats.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def extract(source_root: Path, work_dir: Path) -> None:
    extractor = Extractor(source_root, work_dir)
    result = extractor.run()
    materialize(extractor, result)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_root", type=Path)
    parser.add_argument("work_dir", type=Path)
    args = parser.parse_args()
    extract(args.source_root, args.work_dir)


if __name__ == "__main__":
    main()
