#!/usr/bin/env python3
"""Shared, immutable build configuration."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = "https://github.com/patmorin/ods.git"
BRANCH_REF = "refs/heads/master"
PINNED_COMMIT = "9d22c44906dda2017b2ef0c762025bee644b58aa"
ARCHIVE_URL = f"https://codeload.github.com/patmorin/ods/zip/{PINNED_COMMIT}"
SELECTED_EDITION = "pseudocode/Python"
EXTRACTOR_VERSION = "1.0.0"
SCHEMA_VERSION = "1.0.0"

CHAPTER_STEMS = [
    "intro",
    "arrays",
    "linkedlists",
    "skiplists",
    "hashing",
    "binarytrees",
    "rbs",
    "scapegoat",
    "redblack",
    "heaps",
    "sorting",
    "graphs",
    "integers",
    "btree",
]

CHAPTER_FILES = [
    "01-introduction.jsonl",
    "02-array-based-lists.jsonl",
    "03-linked-lists.jsonl",
    "04-skip-lists.jsonl",
    "05-hash-tables.jsonl",
    "06-binary-trees.jsonl",
    "07-random-binary-search-trees.jsonl",
    "08-scapegoat-trees.jsonl",
    "09-red-black-trees.jsonl",
    "10-heaps.jsonl",
    "11-sorting-algorithms.jsonl",
    "12-graphs.jsonl",
    "13-data-structures-for-integers.jsonl",
    "14-external-memory-searching.jsonl",
]

GENERATED_FILES = ["ods-python.tex"] + [
    f"{stem}-python.tex" for stem in CHAPTER_STEMS
]

