"""阶段 6：从 internal 生成 published 版本（移除内部字段与工程痕迹）。"""
from __future__ import annotations

import copy
from typing import Any, Dict, List

from .config import INTERNAL_LEAK_PATTERNS, KBConfig
from .io_utils import log, read_jsonl, write_jsonl_atomic

# published 中必须移除的顶层字段
INTERNAL_ONLY_FIELDS = ["source_record_ids"]


def to_published(concept: Dict[str, Any]) -> Dict[str, Any]:
    pub = copy.deepcopy(concept)
    for field in INTERNAL_ONLY_FIELDS:
        pub.pop(field, None)
    # 清除 quality.issues 中可能携带的内部注释，仅保留状态
    if "quality" in pub:
        pub["quality"] = {"status": pub["quality"].get("status", "review_pending"), "issues": []}
    return pub


def leak_check(pub: Dict[str, Any]) -> List[str]:
    import json

    text = json.dumps(pub, ensure_ascii=False)
    return [p for p in INTERNAL_LEAK_PATTERNS if p in text]


def publish(cfg: KBConfig, chapter: str, dry_run: bool = False) -> Dict[str, Any]:
    internal = read_jsonl(cfg.internal_concepts(chapter))
    published: List[Dict[str, Any]] = []
    leaks: List[Dict[str, Any]] = []
    for c in internal:
        pub = to_published(c)
        found = leak_check(pub)
        if found:
            leaks.append({"id": c["id"], "patterns": found})
            continue
        published.append(pub)
    if leaks:
        raise ValueError(f"published 泄漏内部信息，已中止: {leaks}")
    write_jsonl_atomic(cfg.published_concepts(chapter), published, dry_run)
    log.info("published 生成完成：%d 个知识点", len(published))
    return {"published": len(published)}
