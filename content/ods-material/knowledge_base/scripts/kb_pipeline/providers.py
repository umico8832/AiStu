"""外部模型 Provider 接口（仅定义接口，不做任何实际调用）。

当前知识点内容由协作的编码 AI 直接写入 authoring/ 目录。
如需接入外部模型，请实现 ConceptProvider 并在配置中显式启用；
未经明确授权与 API Key，本项目不调用任何付费模型 API。
"""
from __future__ import annotations

import abc
from typing import Any, Dict, List


class ConceptProvider(abc.ABC):
    """知识点内容生成器接口。"""

    @abc.abstractmethod
    def plan_section(
        self,
        section_records: List[Dict[str, Any]],
        taxonomy_fragment: Dict[str, Any],
        sibling_titles: List[str],
    ) -> Dict[str, Any]:
        """按 prompts/concept_planning.md 的输出格式返回小节规划。"""

    @abc.abstractmethod
    def write_concept(
        self,
        plan_item: Dict[str, Any],
        source_records: List[Dict[str, Any]],
        taxonomy_fragment: Dict[str, Any],
        sibling_titles: List[str],
        prerequisite_ids: List[str],
    ) -> Dict[str, Any]:
        """按 prompts/concept_writing.md 的要求返回单个 concept JSON。"""


class ManualAuthoringProvider(ConceptProvider):
    """默认 Provider：提示内容应放入 authoring/ 目录，由流水线校验装配。"""

    def plan_section(self, section_records, taxonomy_fragment, sibling_titles):
        raise NotImplementedError(
            "默认工作流不自动生成内容：请把规划写入 authoring/plans/<chapter>.json"
        )

    def write_concept(self, plan_item, source_records, taxonomy_fragment,
                      sibling_titles, prerequisite_ids):
        raise NotImplementedError(
            "默认工作流不自动生成内容：请把草稿写入 authoring/drafts/<chapter>.jsonl"
        )
