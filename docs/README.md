# Kaleidoscope 文档中心

> 状态：维护中
> 最近复核：2026-07-25

本目录是产品决策、工程边界、开发流程与交付证据的统一入口。目标是让每个事实只有
一个权威位置：核心文档描述当前规则，指南描述操作方法，ADR 保存长期决策，
`reports/` 保存不可改写的历史证据。

## 1. 按任务阅读

### 第一次参与开发

1. [`../README.md`](../README.md)：项目、现状与快速开始；
2. [`../AGENTS.md`](../AGENTS.md)：强制工程与安全规则；
3. [`ARCHITECTURE.md`](ARCHITECTURE.md)：模块、数据流与边界；
4. [`guides/DEVELOPMENT.md`](guides/DEVELOPMENT.md)：本地工作流；
5. [`guides/TESTING.md`](guides/TESTING.md)：按改动选择验证。

### 调整产品或范围

1. [`PRODUCT_DIRECTION.md`](PRODUCT_DIRECTION.md)：为什么做、长期原则；
2. [`MVP_SCOPE.md`](MVP_SCOPE.md)：当前阶段做什么、如何验收；
3. [`ROADMAP.md`](ROADMAP.md)：真实完成状态和下一步；
4. [`decisions/README.md`](decisions/README.md)：是否需要新增或替代 ADR。

### 修改架构、IPC、AI 或数据边界

1. [`ARCHITECTURE.md`](ARCHITECTURE.md)；
2. [`decisions/`](decisions/) 下相关 ADR；
3. [`guides/TESTING.md`](guides/TESTING.md) 的改动—验证矩阵；
4. 涉及打包时再读 [`guides/RELEASE.md`](guides/RELEASE.md)。

### 新增或修改互动课件

1. [`guides/LESSON_DEVELOPMENT.md`](guides/LESSON_DEVELOPMENT.md)；
2. [`../packages/lessons/README.md`](../packages/lessons/README.md)；
3. 最近的课件审查证据
   [`reports/2026-07-25-lesson-review.md`](reports/2026-07-25-lesson-review.md)。

## 2. 核心文档：当前事实的权威来源

| 文档 | 唯一职责 | 何时更新 |
| --- | --- | --- |
| [`../AGENTS.md`](../AGENTS.md) | Agent 强制工作规则 | 安全、协作或工程硬约束改变 |
| [`PRODUCT_DIRECTION.md`](PRODUCT_DIRECTION.md) | 产品问题、长期能力和产品原则 | 长期方向或成功标准改变 |
| [`MVP_SCOPE.md`](MVP_SCOPE.md) | 当前阶段范围、非目标和验收标准 | 功能边界或完成定义改变 |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | 系统结构、数据流、状态归属和技术边界 | 架构事实或接口边界改变 |
| [`ROADMAP.md`](ROADMAP.md) | 当前实现状态、优先级、风险和里程碑 | 工作完成、阻塞或顺序变化 |

核心文档不得互相复制整段内容。需要引用其他职责中的事实时，用一句摘要加链接。

## 3. 工程指南：如何完成工作

| 文档 | 内容 |
| --- | --- |
| [`guides/DEVELOPMENT.md`](guides/DEVELOPMENT.md) | 环境、Provider、工作流、代码落点与常用命令 |
| [`guides/TESTING.md`](guides/TESTING.md) | 测试层级、选择矩阵、E2E 与打包验证 |
| [`guides/RELEASE.md`](guides/RELEASE.md) | 知识快照、macOS 产物、人工检查与 GitHub Release |
| [`guides/LESSON_DEVELOPMENT.md`](guides/LESSON_DEVELOPMENT.md) | 课件结构、Schema、教学质量、绑定和审核流程 |
| [`AGENT_GIT_RULES.md`](AGENT_GIT_RULES.md) | Agent 的 Git 授权、提交和危险操作规则 |
| [`../content/ods-material/knowledge_base/README.md`](../content/ods-material/knowledge_base/README.md) | 标准知识 authoring、审查与派生流水线 |

指南可以包含命令和步骤，但不维护项目完成状态。

## 4. 架构决策记录

[`decisions/`](decisions/) 保存已经接受的长期技术或产品架构决策：

- [ADR-0001：单一活动可视化与用户确认](decisions/0001-single-active-visualization.md)
- [ADR-0002：AI 输出只作为不可信数据](decisions/0002-ai-output-as-untrusted-data.md)
- [ADR-0003：知识、社区、用户与会话数据分域](decisions/0003-domain-data-separation.md)
- [ADR-0004：仓库内长期知识资产与运行时快照](decisions/0004-repository-owned-knowledge-assets.md)

ADR 记录“为什么这样选”和后果。当前实现方式仍以 `ARCHITECTURE.md` 为准。

## 5. 交付材料与历史证据

`delivery/` 是可继续编辑的黑客松交付材料：

- [`delivery/HACKATHON_DEMO_SCRIPT.md`](delivery/HACKATHON_DEMO_SCRIPT.md)
- [`delivery/TRACK_MAPPING.md`](delivery/TRACK_MAPPING.md)

`reports/` 是带日期的历史验证记录：

- [`reports/2026-07-25-stage-0-baseline.md`](reports/2026-07-25-stage-0-baseline.md)
- [`reports/2026-07-25-lesson-review.md`](reports/2026-07-25-lesson-review.md)

历史报告只说明当时验证了什么。后续状态变化写入 `ROADMAP.md` 或新报告，不回写旧
报告让它看起来像当前快照。

## 6. 事实优先级

1. 用户当前任务中的明确要求；
2. `AGENTS.md` 中的安全与工程硬约束；
3. `MVP_SCOPE.md` 中的当前范围；
4. `ARCHITECTURE.md` 中的技术边界；
5. `PRODUCT_DIRECTION.md` 中的长期原则；
6. `ROADMAP.md` 中的当前状态。

发现冲突时不要选择性保留两种说法：先确认真实实现和当前决策，再更新权威文档，
其他位置改为链接或删除重复表述。

## 7. 文档维护规则

- 使用“已实现”“计划”“候选”“历史记录”等明确状态词；
- 范围与状态分离：`MVP_SCOPE.md` 定义目标，`ROADMAP.md` 记录完成度；
- 活跃文档顶部标注状态与最近复核日期；
- 命令必须能在仓库根目录直接执行，特殊工作目录要明确说明；
- 文件、接口和脚本名称使用仓库中的真实名称；
- 图只表达文字难以看清的关系，并保持节点数量可读；
- 不记录密钥、Cookie、Token、本机隐私或完整敏感环境；
- 本机绝对路径只可用于说明外部开发资产，不能进入运行时代码；
- 新长期决策使用 ADR；被替代的 ADR 标为 `superseded`，不要删除；
- 验收结果写入带日期报告，并注明 commit、环境、命令和限制；
- 修改文件名或目录后，检查仓库内全部相对链接。

## 8. 完成文档改动前

- 运行 `pnpm docs:check`；
- 确认核心文档职责没有交叉；
- 搜索旧术语、过期状态和相互矛盾的数字；
- 检查所有本地 Markdown 链接；
- 检查计划没有被写成完成；
- 确认历史报告没有被当作当前状态来源；
- 在总结中说明本轮调整了哪些权威文档。
