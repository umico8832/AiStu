# AiStu 文档中心

> 状态：维护中
> 最近复核：2026-07-27

本目录统一维护产品决策、当前范围、工程边界、开发流程与历史证据。核心文档描述
当前规则，指南描述操作方法，ADR 保存长期决策，`reports/` 保存历史记录。

## 1. 按任务阅读

### 第一次参与开发

1. [`../README.md`](../README.md)
2. [`../AGENTS.md`](../AGENTS.md)
3. [`ARCHITECTURE.md`](ARCHITECTURE.md)
4. [`guides/DEVELOPMENT.md`](guides/DEVELOPMENT.md)
5. [`guides/TESTING.md`](guides/TESTING.md)

### 调整产品或范围

1. [`PRODUCT_DIRECTION.md`](PRODUCT_DIRECTION.md)
2. [`CURRENT_SCOPE.md`](CURRENT_SCOPE.md)
3. [`ROADMAP.md`](ROADMAP.md)
4. [`decisions/README.md`](decisions/README.md)

### 修改架构、IPC、AI 或数据边界

1. [`ARCHITECTURE.md`](ARCHITECTURE.md)
2. [`decisions/`](decisions/) 下相关 ADR
3. [`guides/TESTING.md`](guides/TESTING.md)
4. 涉及打包时再读 [`guides/RELEASE.md`](guides/RELEASE.md)

### 新增或修改互动课件

1. [`guides/LESSON_DEVELOPMENT.md`](guides/LESSON_DEVELOPMENT.md)
2. [`../packages/lessons/README.md`](../packages/lessons/README.md)
3. [`reports/2026-07-25-lesson-review.md`](reports/2026-07-25-lesson-review.md)

## 2. 核心文档

| 文档 | 唯一职责 |
| --- | --- |
| [`../AGENTS.md`](../AGENTS.md) | Agent 强制工作规则 |
| [`PRODUCT_DIRECTION.md`](PRODUCT_DIRECTION.md) | 产品问题、长期能力和产品原则 |
| [`CURRENT_SCOPE.md`](CURRENT_SCOPE.md) | 当前阶段范围、非目标和验收标准 |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | 系统结构、数据流、状态归属和技术边界 |
| [`ROADMAP.md`](ROADMAP.md) | 当前实现状态、优先级、风险和里程碑 |

核心文档不得互相复制整段内容。需要引用其他职责中的事实时，使用摘要和链接。

## 3. 工程指南

| 文档 | 内容 |
| --- | --- |
| [`guides/DEVELOPMENT.md`](guides/DEVELOPMENT.md) | 环境、Provider、工作流与常用命令 |
| [`guides/TESTING.md`](guides/TESTING.md) | 测试层级、选择矩阵、E2E 与打包验证 |
| [`guides/RELEASE.md`](guides/RELEASE.md) | 知识快照、macOS 产物与 GitHub Release |
| [`guides/LESSON_DEVELOPMENT.md`](guides/LESSON_DEVELOPMENT.md) | 课件结构、Schema、教学质量和审核 |
| [`AGENT_GIT_RULES.md`](AGENT_GIT_RULES.md) | Agent 的 Git 授权和危险操作规则 |

## 4. 决策与历史

[`decisions/`](decisions/) 保存已经接受的长期技术或产品架构决策。

`reports/` 保存带日期的历史范围和验证记录，包括：

- [`reports/2026-07-25-mvp-scope.md`](reports/2026-07-25-mvp-scope.md)
- [`reports/2026-07-25-stage-0-baseline.md`](reports/2026-07-25-stage-0-baseline.md)
- [`reports/2026-07-25-lesson-review.md`](reports/2026-07-25-lesson-review.md)

历史记录只说明当时验证了什么，不作为当前范围来源。

## 5. 事实优先级

1. 用户当前任务中的明确要求
2. `AGENTS.md` 中的安全与工程硬约束
3. `CURRENT_SCOPE.md` 中的当前范围
4. `ARCHITECTURE.md` 中的技术边界
5. `PRODUCT_DIRECTION.md` 中的长期原则
6. `ROADMAP.md` 中的当前状态

## 6. 文档维护

- 使用“已实现”“计划”“候选”“历史记录”等明确状态词；
- 范围与状态分离：`CURRENT_SCOPE.md` 定义目标，`ROADMAP.md` 记录完成度；
- 活跃文档顶部标注状态与最近复核日期；
- 命令必须能在仓库根目录执行；
- 文件、接口和脚本名称必须与仓库一致；
- 本机绝对路径不得进入运行时代码；
- 新长期决策使用 ADR；
- 修改文件名或目录后检查全部相对链接；
- 完成文档改动前运行 `pnpm docs:check`。
