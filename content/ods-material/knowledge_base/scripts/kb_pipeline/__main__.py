"""kb_pipeline CLI 入口。

用法示例：
    python3 -m knowledge_base.scripts.kb_pipeline inspect
    python3 -m knowledge_base.scripts.kb_pipeline generate --chapter 02-array-based-lists
"""
from __future__ import annotations

import argparse
import sys

from .config import KBConfig, resolve_root
from .io_utils import log, setup_logging


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="kb_pipeline", description=__doc__)
    parser.add_argument("--root", help="项目根目录（默认 $ODS_KB_ROOT 或当前目录）")
    parser.add_argument("--dry-run", action="store_true", help="只打印动作，不写文件")
    parser.add_argument("--verbose", action="store_true", help="调试日志")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("inspect", help="阶段0：源数据检查")
    sub.add_parser("build-taxonomy", help="阶段1：恢复课程树")

    def with_chapter(name: str, help_: str) -> argparse.ArgumentParser:
        p = sub.add_parser(name, help=help_)
        p.add_argument("--chapter", required=True, help="章节标识，如 02-array-based-lists")
        return p

    with_chapter("plan", "阶段2/3：校验知识点规划并同步去重记录")
    gen = with_chapter("generate", "阶段4：校验草稿并装配 internal 知识点")
    gen.add_argument("--force-ids", help="逗号分隔的 concept ID，强制重新生成")
    with_chapter("build-relations", "阶段5：汇总关系并检查图约束")
    with_chapter("publish", "阶段6：生成 published 版本")
    with_chapter("build-rag", "阶段7：派生 RAG 检索块")
    with_chapter("find-visualization-candidates", "阶段8：校验并落盘可视化候选")
    sub.add_parser("validate", help="阶段9：全库自动化验证")
    rep = sub.add_parser("report", help="生成试点/章节报告")
    rep.add_argument("--chapter", default="02-array-based-lists")
    with_chapter("export-review", "导出外部审查输入")
    with_chapter("apply-review", "回写外部审查结果（定向修复）")

    args = parser.parse_args(argv)
    setup_logging(args.verbose)
    cfg = KBConfig(resolve_root(args.root))

    try:
        if args.command == "inspect":
            from .inspect_source import inspect_source
            report = inspect_source(cfg, args.dry_run)
            return 0 if report["verdict"] == "pass" else 1
        if args.command == "build-taxonomy":
            from .taxonomy import build_taxonomy
            build_taxonomy(cfg, args.dry_run)
            return 0
        if args.command == "plan":
            from .plan import check_plan, sync_duplicates
            report = check_plan(cfg, args.chapter, args.dry_run)
            sync_duplicates(cfg, args.chapter, args.dry_run)
            return 0 if report["verdict"] == "pass" else 1
        if args.command == "generate":
            from .generate import generate
            force = args.force_ids.split(",") if args.force_ids else None
            result = generate(cfg, args.chapter, force, args.dry_run)
            return 0 if not result["rejected"] else 1
        if args.command == "build-relations":
            from .relations import build_relations
            result = build_relations(cfg, args.chapter, args.dry_run)
            return 0 if not result["cycle"] else 1
        if args.command == "publish":
            from .publish import publish
            publish(cfg, args.chapter, args.dry_run)
            return 0
        if args.command == "build-rag":
            from .rag import build_rag
            build_rag(cfg, args.chapter, args.dry_run)
            return 0
        if args.command == "find-visualization-candidates":
            from .viz import find_viz_candidates
            find_viz_candidates(cfg, args.chapter, args.dry_run)
            return 0
        if args.command == "validate":
            from .validate import validate_all
            report = validate_all(cfg, args.dry_run)
            return 0 if report["all_passed"] else 1
        if args.command == "report":
            from .report import build_report
            build_report(cfg, args.chapter, args.dry_run)
            return 0
        if args.command == "export-review":
            from .review import export_review
            export_review(cfg, args.chapter, args.dry_run)
            return 0
        if args.command == "apply-review":
            from .review import apply_review
            result = apply_review(cfg, args.chapter, args.dry_run)
            return 0 if not result["invalid"] else 1
    except (FileNotFoundError, ValueError, KeyError) as exc:
        log.error("%s", exc)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
