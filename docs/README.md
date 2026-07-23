# Kaleidoscope 文档索引

## 1. 文档目的

本目录保存 Kaleidoscope 的长期产品方向、当前桌面 MVP 范围、系统架构与实施路线。

这些文档用于避免以下问题：

- 产品愿景只存在于对话中；
- Agent 在不同任务中自行改变产品方向；
- 长期目标与当前 MVP 范围混淆；
- 知识内容、检索索引、可视化和用户状态相互耦合；
- 工程实现与真实项目状态不一致。

## 2. 文档地图

|文档|回答的问题|更新时机|
|---|---|---|
|[`../AGENTS.md`](../AGENTS.md)|Agent 必须如何工作，有哪些强制约束？|工程规则、安全边界或协作方式改变时|
|[`PRODUCT_DIRECTION.md`](PRODUCT_DIRECTION.md)|产品最终要解决什么问题，哪些原则已经确定？|长期产品方向或核心原则改变时|
|[`MVP_SCOPE.md`](MVP_SCOPE.md)|当前桌面 MVP 做什么、不做什么，如何验收？|本阶段范围或验收标准改变时|
|[`ARCHITECTURE.md`](ARCHITECTURE.md)|系统如何分层，数据怎样流动，状态归谁管理？|架构边界、技术方案或关键接口改变时|
|[`ROADMAP.md`](ROADMAP.md)|项目目前在哪里，下一步按什么顺序推进？|阶段开始、完成、阻塞或顺序调整时|

## 3. 事实优先级

1. 用户当前任务中的明确要求；
2. `AGENTS.md` 中的安全和工程硬约束；
3. `MVP_SCOPE.md` 中的当前范围；
4. `ARCHITECTURE.md` 中的技术边界；
5. `PRODUCT_DIRECTION.md` 中的长期方向；
6. `ROADMAP.md` 中的实施状态。

长期方向不能被一次临时实现无痕改变。若当前需求确实改变长期决策，应同时更新
相关文档并记录改变的理由。

## 4. 文档维护规则

- 写当前真实状态，不把计划描述成已完成；
- 区分“已确定”“建议”“未来可能”；
- 不复制大段相同内容，使用文档链接；
- 产品目标写入 `PRODUCT_DIRECTION.md`；
- 本阶段范围和验收写入 `MVP_SCOPE.md`；
- 数据流、模块边界和安全要求写入 `ARCHITECTURE.md`；
- 执行顺序与完成情况写入 `ROADMAP.md`；
- 代码实现改变架构事实时，同一任务内更新文档；
- 不在文档中写入密钥、Cookie、密码或本机敏感配置；
- 本机路径只用于说明当前资产位置，运行时代码不得写死这些路径。

## 5. 当前外部资产

React 调用栈课件原型：

```text
/Users/umico/Documents/Kaleidoscope/call-stack-visualizer
```

Open Data Structures 标准知识库试点：

```text
/Users/umico/Documents/ods-material/knowledge_base
```

前者是需要迁入桌面 Renderer 的现有代码资产；后者是独立知识内容域，不属于
Electron 应用源码。
