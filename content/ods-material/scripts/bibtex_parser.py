#!/usr/bin/env python3
"""Deterministic balanced-delimiter BibTeX parser."""

from __future__ import annotations

import re
from pathlib import Path

from latex_state import is_escaped


def split_top_level(text: str, delimiter: str = ",") -> list[str]:
    parts = []
    start = 0
    brace = 0
    quote = False
    for i, char in enumerate(text):
        if char == '"' and not is_escaped(text, i) and brace == 0:
            quote = not quote
        elif not quote:
            if char == "{" and not is_escaped(text, i):
                brace += 1
            elif char == "}" and not is_escaped(text, i):
                brace -= 1
            elif char == delimiter and brace == 0:
                parts.append(text[start:i])
                start = i + 1
    parts.append(text[start:])
    return parts


def unwrap(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and ((value[0] == "{" and value[-1] == "}") or (
        value[0] == '"' and value[-1] == '"'
    )):
        return value[1:-1]
    return value


def parse_bibtex(path: Path, display_name: str) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    line_starts = [0] + [m.end() for m in re.finditer("\n", text)]

    def line(offset: int) -> int:
        import bisect
        return bisect.bisect_right(line_starts, offset)

    entries = []
    i = 0
    while i < len(text):
        if text[i] != "@" or is_escaped(text, i):
            i += 1
            continue
        match = re.match(r"@([A-Za-z]+)\s*([\{\(])", text[i:])
        if not match:
            i += 1
            continue
        entry_type = match.group(1).lower()
        opener = match.group(2)
        closer = "}" if opener == "{" else ")"
        body_start = i + match.end()
        depth = 1
        quote = False
        j = body_start
        while j < len(text) and depth:
            char = text[j]
            if char == '"' and not is_escaped(text, j):
                quote = not quote
            elif not quote:
                if char == opener and not is_escaped(text, j):
                    depth += 1
                elif char == closer and not is_escaped(text, j):
                    depth -= 1
            j += 1
        if depth:
            raise ValueError(f"unclosed BibTeX entry at {display_name}:{line(i)}")
        raw = text[i:j]
        body = text[body_start : j - 1]
        chunks = split_top_level(body)
        key = chunks[0].strip()
        fields = {}
        for chunk in chunks[1:]:
            if "=" not in chunk:
                continue
            name, value = chunk.split("=", 1)
            fields[name.strip().lower()] = unwrap(value)
        if entry_type not in {"comment", "preamble", "string"}:
            entries.append(
                {
                    "citation_key": key,
                    "entry_type": entry_type,
                    "author": fields.get("author"),
                    "title": fields.get("title"),
                    "year": fields.get("year"),
                    "publisher": fields.get("publisher"),
                    "journal": fields.get("journal"),
                    "pages": fields.get("pages"),
                    "doi": fields.get("doi"),
                    "url": fields.get("url"),
                    "fields": fields,
                    "raw_bibtex": raw,
                    "source_file": display_name,
                    "source_line_start": line(i),
                    "source_line_end": line(j - 1),
                }
            )
        i = j
    return entries

