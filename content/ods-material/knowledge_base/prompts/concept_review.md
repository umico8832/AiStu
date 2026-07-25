# 单知识点审查提示词（concept_review，外部 AI 审查接口）

## 输入格式
`review/input/<concept_id>.json`：

```json
{
  "concept": {},
  "related_concepts": [],
  "source_records": []
}
```

- `concept`：internal 版完整知识点；
- `related_concepts`：其前置与 relations 指向的知识点（截断为核心字段）;
- `source_records`：该知识点引用的源记录原文。

## 评分标准（总分 20）
| 维度 | 分值 | 要点 |
|---|---|---|
| 正确性 | 4 | 定义/公式/复杂度无误；不改变原意；不引入源材料不支持的结论 |
| 单一性 | 3 | 只回答一个核心问题 |
| 自包含性 | 3 | 脱离原书可理解；无"上一节/如图"等依赖 |
| 前置与关系质量 | 3 | 前置必要、方向正确、描述具体、不滥用 related |
| 新手解释质量 | 3 | 降低门槛、映射清楚、边界明确 |
| RAG 可检索性 | 2 | 别名充分、关键词合理、查询贴近真实表达 |
| 格式一致性 | 2 | 符合 Schema、风格统一、ID 与目录位置正确 |

approve 建议线：总分 ≥ 17 且正确性 = 4 且无 high/critical 问题。

## 输出格式
写入 `review/output/<concept_id>.json`：

```json
{
  "concept_id": "…",
  "decision": "approve | revise | reject",
  "score": 18,
  "issues": [
    {
      "severity": "low | medium | high | critical",
      "type": "…",
      "field": "受影响字段路径，如 rookie_explanation.boundary",
      "description": "…",
      "suggested_fix": "…"
    }
  ]
}
```

## 修复流程
1. 运行 `apply-review --chapter <ch>`：issues 写入 concept 的 `quality.issues`；
   decision=revise/reject → `quality.status = revision_required`；
   decision=approve → `quality.status = reviewed`。
2. 修复者只修改 issues 中列出的 `field`，其余字段保持不变，`version` 加 1，
   然后重新导出审查输入。不允许无痕重写整个知识点。
