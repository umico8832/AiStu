# 架构决策记录

本目录保存已经接受的、会长期约束产品或工程的决策。ADR 解释当时的背景、选择与
后果；当前代码结构和接口仍以 [`../ARCHITECTURE.md`](../ARCHITECTURE.md) 为准。

## 索引

| ADR | 状态 | 决策 |
| --- | --- | --- |
| [0001](0001-single-active-visualization.md) | accepted | 新课件经用户确认，且任意时刻只有一个活动可视化 |
| [0002](0002-ai-output-as-untrusted-data.md) | accepted | AI 输出只作为经过校验的不可信数据 |
| [0003](0003-domain-data-separation.md) | accepted | 知识、社区、用户学习和会话状态分域 |
| [0004](0004-repository-owned-knowledge-assets.md) | accepted | 权威知识资产与应用在同一仓库版本化，桌面包只携带运行时快照 |

## 何时新增 ADR

当决策满足以下任一条件时新增：

- 会影响多个 package 或进程边界；
- 改变安全模型或数据所有权；
- 存在两个以上合理方案且权衡不会从代码自然看出；
- 未来维护者很可能再次提出同一个问题；
- 会替代已经接受的决策。

小型实现细节、短期任务和当前完成状态不写 ADR。

## 模板

```markdown
# ADR-NNNN：标题

- 状态：proposed | accepted | superseded | rejected
- 日期：YYYY-MM-DD
- 取代：可选
- 被取代：可选

## 背景

为什么需要决策。

## 决策

选择了什么。

## 后果

获得什么、承担什么。

## 被否决方案

考虑过但未选择的主要方案及原因。
```

被新决策替代时保留旧文件，将状态改为 `superseded` 并互相链接。
