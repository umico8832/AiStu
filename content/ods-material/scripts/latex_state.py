#!/usr/bin/env python3
"""Small state-machine helpers for balanced LaTeX and BibTeX structures."""

from __future__ import annotations

import bisect
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, Optional


def is_escaped(text: str, position: int) -> bool:
    backslashes = 0
    position -= 1
    while position >= 0 and text[position] == "\\":
        backslashes += 1
        position -= 1
    return bool(backslashes % 2)


def mask_comments(text: str) -> str:
    """Replace comments with spaces while preserving offsets and newlines."""
    chars = list(text)
    i = 0
    while i < len(chars):
        if chars[i] == "%" and not is_escaped(text, i):
            while i < len(chars) and chars[i] != "\n":
                chars[i] = " "
                i += 1
        else:
            i += 1
    return "".join(chars)


def skip_space(text: str, position: int) -> int:
    while position < len(text) and text[position].isspace():
        position += 1
    return position


def read_group(text: str, position: int, opener: str = "{", closer: str = "}") -> tuple[str, int]:
    position = skip_space(text, position)
    if position >= len(text) or text[position] != opener:
        raise ValueError(f"expected {opener!r} at offset {position}")
    depth = 1
    start = position + 1
    i = start
    while i < len(text):
        char = text[i]
        if char == opener and not is_escaped(text, i):
            depth += 1
        elif char == closer and not is_escaped(text, i):
            depth -= 1
            if depth == 0:
                return text[start:i], i + 1
        i += 1
    raise ValueError(f"unclosed group starting at {position}")


def read_command_name(text: str, position: int) -> tuple[str, int]:
    if text[position] != "\\":
        raise ValueError("command must start with backslash")
    i = position + 1
    if i < len(text) and text[i].isalpha():
        while i < len(text) and (text[i].isalpha() or text[i] == "@"):
            i += 1
        if i < len(text) and text[i] == "*":
            i += 1
    elif i < len(text):
        i += 1
    return text[position + 1 : i], i


def read_command_with_arguments(text: str, position: int) -> tuple[str, list[str], int]:
    name, i = read_command_name(text, position)
    arguments: list[str] = []
    i = skip_space(text, i)
    while i < len(text) and text[i] == "[":
        value, i = read_group(text, i, "[", "]")
        arguments.append(value)
        i = skip_space(text, i)
    while i < len(text) and text[i] == "{":
        value, i = read_group(text, i)
        arguments.append(value)
        i = skip_space(text, i)
    return name, arguments, i


def find_environment_end(text: str, begin_start: int, env_name: str) -> tuple[int, int]:
    """Return the start and end offsets of a matching end command."""
    depth = 0
    i = begin_start
    while i < len(text):
        if text[i] != "\\" or is_escaped(text, i):
            i += 1
            continue
        try:
            name, args, end = read_command_with_arguments(text, i)
        except ValueError:
            i += 1
            continue
        if name in {"begin", "end"} and args and args[0] == env_name:
            depth += 1 if name == "begin" else -1
            if depth == 0:
                return i, end
        i = max(i + 1, end)
    raise ValueError(f"unclosed environment {env_name!r}")


def iter_commands(text: str) -> Iterator[tuple[int, str, list[str], int]]:
    masked = mask_comments(text)
    i = 0
    while i < len(masked):
        if masked[i] == "\\" and not is_escaped(masked, i):
            try:
                name, args, end = read_command_with_arguments(masked, i)
            except ValueError:
                i += 1
                continue
            yield i, name, args, end
            i = max(i + 1, end)
        else:
            i += 1


def iter_commands_deep(text: str) -> Iterator[tuple[int, str, list[str], int]]:
    """Yield commands including commands nested inside other commands' arguments."""
    masked = mask_comments(text)
    i = 0
    while i < len(masked):
        if masked[i] == "\\" and not is_escaped(masked, i):
            try:
                name, args, end = read_command_with_arguments(masked, i)
            except ValueError:
                i += 1
                continue
            yield i, name, args, end
        i += 1


@dataclass
class SourceText:
    path: Path
    display_name: str
    text: str
    provenance: Optional[list[dict]] = None

    def __post_init__(self) -> None:
        self.masked = mask_comments(self.text)
        self.line_starts = [0]
        for match in re.finditer("\n", self.text):
            self.line_starts.append(match.end())

    def line_number(self, offset: int) -> int:
        return bisect.bisect_right(self.line_starts, offset)

    def span(self, start: int, end: int) -> dict:
        start_line = self.line_number(start)
        end_line = self.line_number(max(start, end - 1))
        result = {
            "source_file": self.display_name,
            "source_line_start": start_line,
            "source_line_end": end_line,
        }
        if self.provenance:
            relevant = self.provenance[start_line - 1 : end_line]
            originals = [x for x in relevant if x.get("original_line", 0) > 0]
            if originals:
                result.update(
                    {
                        "generated_source_file": self.path.name,
                        "original_source_file": originals[0]["original_file"],
                        "original_source_line_start": min(x["original_line"] for x in originals),
                        "original_source_line_end": max(x["original_line"] for x in originals),
                    }
                )
        return result

    def provenance_at(self, offset: int) -> Optional[dict]:
        if not self.provenance:
            return None
        line = self.line_number(offset)
        if 1 <= line <= len(self.provenance):
            return self.provenance[line - 1]
        return None
