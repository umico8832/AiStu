# AiStu 标准知识库（knowledge_base）

本目录是 AiStu 仓库内长期维护的**独立、结构化、面向 AI RAG 检索的中文
标准知识库**。
它支持多课程和多来源，但所有内容必须经过同一套 authoring、Schema、关系、发布、
审查和派生索引流程。

当前包含 Open Data Structures 伪代码/Python 版试点课程，以及根据用户研究报告
整理并用教育部、公开考纲 PDF 和出版社页面复核的 408 数据结构课程。408 课程不仅
包含考纲与复习指南，还包含覆盖 56 个考纲叶子条目的 122 个原子内容知识点；覆盖
清单由测试强制保证零缺口。两门课程共享运行时 RAG 索引，但保留独立
`course_id`、taxonomy 和来源记录。

## 1. 设计原则

1. **一个知识点只回答一个核心问题**。无法用单一问题概括的内容必须继续拆分。
   每个知识点可在 3～8 分钟内独立讲清、可被单独检索、脱离原书上下文仍可理解。
2. **标准知识事实只有一个版本**：一份正式定义 + 一份新手类比。
   不预生成"菜鸟版/学霸版/故事版"等多套正文；运行时表达差异由上层 AI 处理。
3. **课程目录是树，知识关系是图**。
   目录：课程 → 章节 → 小节 → 知识点（`taxonomy.json`）。
   图关系：`prerequisite`（存于 `prerequisite_ids`）、`part_of`、`leads_to`、
   `often_confused_with`、`related`（存于 `relations`）。不制造虚假对称关系。
4. **不按固定字符长度切块**。先构建完整标准知识点，RAG 块从知识点派生
   （core / relations / rookie / recall 四类），索引可随时删除并从 published 重建。
5. **内部来源映射与公开内容分离**。`concepts/internal/` 保留 `source_record_ids`
   仅用于溯源与审查；`concepts/published/` 移除全部内部字段与工程路径。
6. **知识库与用户数据完全独立**。不包含用户掌握度、学习状态、偏好、复习计划、
   画像或错题记录。
7. **可视化只做候选识别**（`visualization/candidates.jsonl`），实际资源存放在
   独立资源库中，知识点仅通过 `visualization_ids` 引用。
8. **新手类比必须标明适用边界**（`rookie_explanation.boundary`），类比不得代替
   正式定义。
9. **不引入源材料不支持的技术结论**；无法确定的内容记入报告并标记
   `revision_required`，不猜测。
10. **来源命名空间稳定且可区分**。ODS 知识点使用 `ods-`，408 考纲指南使用
    `cs408-`；来源报告中的临时检索标记不当作可验证 URL。

## 2. 目录结构

```text
knowledge_base/
├── README.md                    本文件
├── taxonomy.json                多课程目录树（version 2）
├── concepts/
│   ├── internal/<chapter>.jsonl 内部版知识点（含 source_record_ids）
│   └── published/<chapter>.jsonl 公开版知识点（移除内部字段）
├── relations/relations.jsonl    全部跨知识点关系（含前置）
├── rag/chunks.jsonl             RAG 检索块（由 published 派生）
├── visualization/candidates.jsonl 可视化候选
├── schemas/*.schema.json        taxonomy / concept / relation / rag_chunk
├── prompts/*.md                 规划、写作、审查提示词模板
├── authoring/
│   ├── plans/                   知识点规划
│   ├── drafts/                  知识点正文草稿
│   ├── sources/                 非 ODS 章节的结构化来源记录
│   ├── source_manifests/        外部来源指纹、范围与复核入口
│   ├── coverage/                考纲条目到知识点的可机读覆盖清单
│   ├── taxonomies/              非 ODS 课程目录 overlay
│   ├── dedup/                   去重决策
│   └── viz/                     可视化候选草稿
├── reports/                     检查、试点、验证、去重、质量报告
├── review/                      外部 AI 审查输入/输出（接口见 prompts/concept_review.md）
└── scripts/kb_pipeline/         加工流水线（纯标准库 Python 3）
```

## 3. content_type 允许值

`concept` | `mechanism` | `algorithm` | `formula` | `theorem` | `comparison` | `application`

新增类型必须先修改 `schemas/concept.schema.json` 与本 README 并说明理由。

## 4. 流水线使用方法

首次运行测试时，在仓库根目录创建本地 Python 环境：

```bash
pnpm setup:knowledge
pnpm test:knowledge
pnpm validate:knowledge
```

流水线命令在内容域根目录执行（`--root` 可覆盖根目录）：

```bash
cd content/ods-material
python3 -m knowledge_base.scripts.kb_pipeline inspect
python3 -m knowledge_base.scripts.kb_pipeline build-taxonomy
python3 -m knowledge_base.scripts.kb_pipeline plan --chapter 02-array-based-lists
python3 -m knowledge_base.scripts.kb_pipeline generate --chapter 02-array-based-lists
python3 -m knowledge_base.scripts.kb_pipeline build-relations --chapter 02-array-based-lists
python3 -m knowledge_base.scripts.kb_pipeline publish --chapter 02-array-based-lists
python3 -m knowledge_base.scripts.kb_pipeline build-rag --chapter 02-array-based-lists
python3 -m knowledge_base.scripts.kb_pipeline find-visualization-candidates --chapter 02-array-based-lists
python3 -m knowledge_base.scripts.kb_pipeline validate
python3 -m knowledge_base.scripts.kb_pipeline report
```

通用参数：`--root PATH`（默认为当前目录或环境变量 `ODS_KB_ROOT`）、
`--dry-run`（只打印将执行的动作，不写文件）、`--verbose`。

### 内容从哪里来（来源驱动 + 程序校验）

流水线是**确定性骨架**：inspect / build-taxonomy / publish / build-rag /
find-visualization-candidates / validate 全部由程序完成。

知识点的**规划与正文**由 AI（当前为本仓库协作的编码 Agent，按
`prompts/concept_planning.md` 与 `prompts/concept_writing.md` 撰写）产出，
写入 `authoring/plans/<chapter>.json`（规划）与
`authoring/drafts/<chapter>.jsonl`（正文草稿）。

ODS 章节默认读取 `corpus/chapters/<chapter>.jsonl`。其他受控来源把结构化记录放入
`authoring/sources/<chapter>.jsonl`，同时在 `authoring/source_manifests/` 保存
来源文件指纹、范围和外部复核 URL；`KBConfig.chapter_source()` 会优先读取受控
authoring 来源。非 ODS 课程目录写入 `authoring/taxonomies/*.json`，由
`build-taxonomy` 与 ODS 课程合并为 version 2 多课程 taxonomy。

- `plan` 命令：读取源记录，生成小节骨架，与 `authoring/plans/` 中的 AI 规划
  合并校验（检查 source_record_ids 是否存在、是否遗漏正文记录）。
- `generate` 命令：逐条读取 `authoring/drafts/<chapter>.jsonl`，对每条执行
  JSON 解析 → Schema 校验 → ID 唯一性 → 引用格式检查，通过后**逐个**原子追加
  写入 `concepts/internal/<chapter>.jsonl`。

未配置任何付费模型 API；如需接入外部模型，请实现
`scripts/kb_pipeline/providers.py` 中的 `ConceptProvider` 接口并显式授权。

### 增量运行与断点恢复

- `generate` 默认**跳过** internal 中已存在且通过校验的 concept ID；
  中断后重跑即可续作。
- 重新生成指定知识点：`generate --chapter <ch> --force-ids id1,id2`
  （仅覆盖列出的 ID，其余不动）。
- 所有 JSONL 写入先写临时文件再 `os.replace`，中断不会损坏已有产物。
- RAG 索引、published、candidates 均为派生产物，可随时删除后从上游重建。

## 5. 质量门槛（20 分制）

| 维度 | 分值 |
|---|---|
| 正确性 | 4（低于 4 不得进入 published）|
| 单一性 | 3 |
| 自包含性 | 3 |
| 前置与关系质量 | 3 |
| 新手解释质量 | 3 |
| RAG 可检索性 | 2 |
| 格式一致性 | 2 |

进入 published 要求：总分 ≥ 17，正确性 = 4，无高严重度问题，自动化校验全部通过。
当前由 AI 生成的内容默认 `quality.status = "review_pending"`，
本流水线**不会**自行将内容标记为已通过外部审查。

## 6. 外部审查接口

- 审查输入：`python3 -m knowledge_base.scripts.kb_pipeline export-review --chapter <ch>`
  生成 `review/input/<concept_id>.json`，格式为
  `{"concept": {...}, "related_concepts": [...], "source_records": [...]}`。
- 审查输出：审查方将结果写入 `review/output/<concept_id>.json`
  （Schema 见 `prompts/concept_review.md`，decision ∈ approve/revise/reject）。
- 定向修复：`apply-review --chapter <ch>` 读取审查输出，把 issues 写入对应
  concept 的 `quality.issues`，decision=revise/reject 时置状态为
  `revision_required`，decision=approve 时置为 `reviewed`；状态发生变化时
  `version+1`，重复应用相同结果不会再次递增。
- `apply-review` 只记录结构化审查结论，不会把自然语言 `suggested_fix` 猜测成
  正文修改。真正修复时只改 issues 指定字段、增加版本，再用
  `generate --force-ids <concept_id>` 装配并重建 published/RAG。

### 试点 authoring 的复现

第 2 章的人工策划与标准内容保存在可审查的种子脚本中；重新生成 authoring 输入：

```bash
python3 -m knowledge_base.scripts.seed_pilot_authoring
```

随后从 `plan` 开始运行第 4 节命令。该脚本不调用模型或网络，只生成试点章节，
不会处理全书。

### 408 考纲指南 authoring 的复现

```bash
python3 -m knowledge_base.scripts.seed_408_exam_guide_authoring
python3 -m knowledge_base.scripts.kb_pipeline build-taxonomy
python3 -m knowledge_base.scripts.kb_pipeline plan --chapter 408-data-structures-exam-guide
python3 -m knowledge_base.scripts.kb_pipeline generate --chapter 408-data-structures-exam-guide
python3 -m knowledge_base.scripts.kb_pipeline build-relations --chapter 408-data-structures-exam-guide
python3 -m knowledge_base.scripts.kb_pipeline publish --chapter 408-data-structures-exam-guide
python3 -m knowledge_base.scripts.kb_pipeline build-rag --chapter 408-data-structures-exam-guide
python3 -m knowledge_base.scripts.kb_pipeline find-visualization-candidates --chapter 408-data-structures-exam-guide
python3 -m knowledge_base.scripts.kb_pipeline export-review --chapter 408-data-structures-exam-guide
python3 -m knowledge_base.scripts.kb_pipeline validate
python3 -m knowledge_base.scripts.kb_pipeline report --chapter 408-data-structures-exam-guide
```

### 408 数据结构完整考纲内容的复现

先运行上一节的指南种子，再生成七个内容章节。完整种子会在
`authoring/coverage/408-data-structures-2026.json` 写入 56 个考纲叶子条目到
122 个原子知识点的映射；只要存在空映射，种子脚本和测试都会失败。

```bash
python3 -m knowledge_base.scripts.seed_408_full_syllabus_authoring
python3 -m knowledge_base.scripts.kb_pipeline build-taxonomy
for chapter in 408-basic-concepts 408-linear-lists 408-stacks-queues-arrays \
  408-trees 408-graphs 408-searching 408-sorting; do
  python3 -m knowledge_base.scripts.kb_pipeline plan --chapter "$chapter"
  python3 -m knowledge_base.scripts.kb_pipeline generate --chapter "$chapter"
  python3 -m knowledge_base.scripts.kb_pipeline build-relations --chapter "$chapter"
  python3 -m knowledge_base.scripts.kb_pipeline publish --chapter "$chapter"
  python3 -m knowledge_base.scripts.kb_pipeline build-rag --chapter "$chapter"
  python3 -m knowledge_base.scripts.kb_pipeline \
    find-visualization-candidates --chapter "$chapter"
  python3 -m knowledge_base.scripts.kb_pipeline export-review --chapter "$chapter"
done
python3 -m knowledge_base.scripts.kb_pipeline validate
```

所有新增知识点默认保持 `review_pending`。零缺口表示“考纲范围已有可检索内容”，
不表示这些内容已完成人工学科审查；对应审查输入位于 `review/input/`。

## 7. ODS 全书扩展条件

只有当试点章节（02）满足以下条件才可扩展全书：Schema 全通过、无重复 ID、
无悬空引用、前置无环、published 无内部路径、RAG 可重建、粒度一致、
抽查无系统性问题。满足后按章节逐章执行第 4 节命令即可（支持任意 `--chapter`）。
