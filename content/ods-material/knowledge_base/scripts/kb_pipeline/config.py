"""路径与常量配置。业务逻辑不写死绝对路径，根目录来自 CLI/--root 或环境变量。"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

COURSE_ID = "open-data-structures"
COURSE_TITLE = "Open Data Structures"
COURSE_TITLE_ZH = "开放数据结构"

# 参与正文提取的记录类型 → 特殊处理策略见 README 与提示词
EXCLUDED_TYPES = {"bibliography_entry", "index_entry", "metadata"}
STRUCTURE_TYPES = {"part", "chapter", "section", "subsection", "subsubsection"}

# 上下文依赖表达（validate 阶段扫描正文字段）
CONTEXT_DEPENDENT_PHRASES = [
    "上一节", "下一节", "前一节", "如下图", "如图所示", "上图", "下图",
    "见图", "后文将", "本书后面", "如前所述", "前面提到", "下一章", "上一章",
]
# 禁止出现在知识库中的用户状态字段名
USER_STATE_FIELD_NAMES = [
    "mastery", "user_id", "user_profile", "learning_status", "review_at",
    "next_review", "proficiency", "wrong_answers", "srs",
]
# published 版本中不允许出现的内部痕迹
INTERNAL_LEAK_PATTERNS = [
    "source_record_ids", "/Users/", "source_snapshot/", "original_tex",
    "generated_python_tex", ".tex", "corpus/records.jsonl", "temporary_id",
    "candidate-",
]

# 试点章节中文标题映射（确定性；其余章节回退英文标题）
CHAPTER_TITLE_ZH: Dict[int, str] = {
    1: "引言",
    2: "基于数组的线性表",
    3: "链表",
    4: "跳表",
    5: "哈希表",
    6: "二叉树",
    7: "随机二叉搜索树",
    8: "替罪羊树",
    9: "红黑树",
    10: "堆",
    11: "排序算法",
    12: "图",
    13: "整数数据结构",
    14: "外部存储搜索",
}
SECTION_TITLE_ZH: Dict[str, str] = {
    "2.1": "ArrayStack：用数组实现快速栈操作",
    "2.1.1": "基本操作",
    "2.1.2": "扩容与缩容",
    "2.1.3": "小结",
    "2.2": "FastArrayStack：优化的 ArrayStack",
    "2.3": "ArrayQueue：基于数组的队列",
    "2.3.1": "小结",
    "2.4": "ArrayDeque：用数组实现快速双端队列操作",
    "2.4.1": "小结",
    "2.5": "DualArrayDeque：用两个栈构造双端队列",
    "2.5.1": "再平衡",
    "2.5.2": "小结",
    "2.6": "RootishArrayStack：空间高效的数组栈",
    "2.6.1": "扩容与缩容的分析",
    "2.6.2": "空间使用",
    "2.6.3": "小结",
    "2.7": "讨论与练习",
}


@dataclass
class KBConfig:
    """所有产物路径的单一事实来源。"""

    root: Path

    def __post_init__(self) -> None:
        self.root = Path(self.root).resolve()

    # ---- 源数据 ----
    @property
    def corpus_records(self) -> Path:
        return self.root / "corpus" / "records.jsonl"

    @property
    def corpus_chapters_dir(self) -> Path:
        return self.root / "corpus" / "chapters"

    def chapter_source(self, chapter: str) -> Path:
        authored = self.authored_source(chapter)
        if authored.exists():
            return authored
        return self.corpus_chapters_dir / f"{chapter}.jsonl"

    # ---- 知识库产物 ----
    @property
    def kb_dir(self) -> Path:
        return self.root / "knowledge_base"

    @property
    def taxonomy_path(self) -> Path:
        return self.kb_dir / "taxonomy.json"

    @property
    def schemas_dir(self) -> Path:
        return self.kb_dir / "schemas"

    def internal_concepts(self, chapter: str) -> Path:
        return self.kb_dir / "concepts" / "internal" / f"{chapter}.jsonl"

    def published_concepts(self, chapter: str) -> Path:
        return self.kb_dir / "concepts" / "published" / f"{chapter}.jsonl"

    @property
    def relations_path(self) -> Path:
        return self.kb_dir / "relations" / "relations.jsonl"

    @property
    def rag_chunks_path(self) -> Path:
        return self.kb_dir / "rag" / "chunks.jsonl"

    @property
    def viz_candidates_path(self) -> Path:
        return self.kb_dir / "visualization" / "candidates.jsonl"

    @property
    def reports_dir(self) -> Path:
        return self.kb_dir / "reports"

    @property
    def review_input_dir(self) -> Path:
        return self.kb_dir / "review" / "input"

    @property
    def review_output_dir(self) -> Path:
        return self.kb_dir / "review" / "output"

    # ---- AI 撰写区（plan/draft 由 AI 按提示词产出，流水线只做校验与装配）----
    @property
    def authoring_dir(self) -> Path:
        return self.kb_dir / "authoring"

    def authored_plan(self, chapter: str) -> Path:
        return self.authoring_dir / "plans" / f"{chapter}.json"

    def authored_drafts(self, chapter: str) -> Path:
        return self.authoring_dir / "drafts" / f"{chapter}.jsonl"

    def authored_viz(self, chapter: str) -> Path:
        return self.authoring_dir / "viz" / f"{chapter}.jsonl"

    def authored_duplicates(self, chapter: str) -> Path:
        return self.authoring_dir / "dedup" / f"{chapter}.jsonl"

    def authored_source(self, chapter: str) -> Path:
        return self.authoring_dir / "sources" / f"{chapter}.jsonl"

    @property
    def authored_taxonomy_dir(self) -> Path:
        return self.authoring_dir / "taxonomies"

    @property
    def source_manifests_dir(self) -> Path:
        return self.authoring_dir / "source_manifests"

    @property
    def pilot_analysis(self) -> Path:
        return self.authoring_dir / "pilot_analysis.md"

    # ---- 工具 ----
    def list_chapters(self) -> List[str]:
        return sorted(p.stem for p in self.corpus_chapters_dir.glob("*.jsonl"))

    def internal_chapters(self) -> List[str]:
        d = self.kb_dir / "concepts" / "internal"
        if not d.exists():
            return []
        return sorted(p.stem for p in d.glob("*.jsonl"))


def resolve_root(cli_root: Optional[str]) -> Path:
    """根目录优先级：--root > $ODS_KB_ROOT > 当前目录。"""
    if cli_root:
        return Path(cli_root).resolve()
    env = os.environ.get("ODS_KB_ROOT")
    if env:
        return Path(env).resolve()
    return Path.cwd().resolve()
