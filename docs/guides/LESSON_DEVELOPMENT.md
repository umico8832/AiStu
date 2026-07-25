# 互动课件开发与审核指南

> 状态：活跃指南
> 最近复核：2026-07-25

本文适用于 `packages/lessons/` 下的 React 教学课件。课件是桌面应用按需加载的资源
模块，不是独立网页，也不是 AI 在运行时生成的页面。

## 1. 核心模型

```text
标准知识事实
+ 已注册、已审核的 React 课件
+ 经过严格校验的场景 spec / patch
= 当前教学场景
```

知识库只保存知识事实与 `visualization_ids` 引用，不保存 React、CSS 或运行时代码。
AI 只能选择注册 ID 并调整课件声明的安全字段。

## 2. 何时应该做课件

优先为以下问题制作课件：

- 状态随步骤变化；
- 算法执行顺序难以靠文字跟踪；
- 数据结构的逻辑位置与物理布局不同；
- 多个指针、边界或不变量需要同时观察；
- 预测下一步能暴露关键误解。

不应因为知识点存在就机械创建课件。如果文字、一个小例子或静态图已经足够，保持
简单。

## 3. 开始编码前

先回答并记录：

1. 课件只解决哪个核心问题？
2. 对应哪些真实 `concept_id` 与来源？
3. 学习者最容易误解什么？
4. 哪些状态必须可见，哪些细节应该省略？
5. 每一步改变什么，为什么？
6. 哪一步适合先预测？
7. AI 可以调整哪些输入，范围是什么？
8. 哪些输入必须拒绝或回退？
9. 最终状态如何用纯函数证明？
10. 谁进行独立教学审查？

没有真实 `concept_id` 时可以保留未绑定资源，但不得编造绑定。调用栈课件曾没有 ODS
对应概念，后续只在 408 中使用真实 `cs408-recursion-call-stack`。

## 4. 目录与职责

推荐结构：

```text
packages/lessons/<lesson>/
├── package.json
├── src/
│   ├── index.ts                 唯一公开出口
│   ├── spec.ts                  严格场景 Schema 与默认值
│   ├── models.ts                纯函数状态模型（需要时）
│   ├── lessonSteps.ts           声明式或生成式步骤
│   ├── VisualizationComponent.tsx
│   └── components/              课件内部组件（需要时）
└── test/
    ├── spec.test.ts
    ├── models.test.ts
    └── component.test.tsx
```

简单课件可以合并文件，不要为了目录模板创建空文件。教学数据不要大量散落在 JSX。

每个课件不创建自己的：

- `index.html`；
- Vite、Tailwind 或 Electron 配置；
- 应用路由；
- 全屏 overlay 或关闭按钮；
- 持久化层；
- Provider 或 IPC。

桌面 Renderer 负责窗口与路由，`visualization-runtime` 负责注册、校验和 session，
课件只负责教学模型与交互。

## 5. 稳定 ID 与注册

注册项至少包含：

```ts
interface VisualizationRegistration<TSpec, TEvent> {
  id: string;
  conceptIds: string[];
  version: number;
  status: "draft" | "review_pending" | "reviewed";
  specSchema: ZodType<TSpec>;
  defaultSpec: TSpec;
  load: () => Promise<VisualizationModule<TSpec, TEvent>>;
}
```

规则：

- `id` 发布后不可静默改名；
- 协议语义变化时递增 `version`；
- `conceptIds` 只引用真实稳定 ID；
- `load` 使用静态 dynamic import；
- 新资源默认 `draft` 或 `review_pending`；
- 实现资源的同一 Agent 不能自行标为 `reviewed`；
- 注册表是运行时权威清单，派生 JSON 不可手工代替它。

## 6. 场景 Schema

每项课件拥有严格、可推断的 Zod Schema：

- 使用 `strict()` 或等价未知字段拒绝；
- 限制数组长度、数字范围、文本长度、步骤数和枚举；
- 使用判别联合表示有限场景分支；
- 提供经过审核的 `defaultSpec`；
- 不接受任意键值对象作为最终课件输入；
- 不接受组件名、模块路径、URL、HTML、CSS 或源码；
- 解析失败时返回结构化诊断并使用安全默认场景。

允许 AI 调整的字段通常包括：

- 审核过的示例输入；
- 初始步骤；
- 当前强调对象；
- TutorNote；
- 预测暂停；
- 预定义视图；
- 明确列出的布局参数。

## 7. 步骤模型

优先用纯函数生成确定步骤：

```text
validated scenario
→ buildSteps(scenario)
→ immutable lesson states
→ React renders current state
```

最低要求：

- 初始状态明确；
- 每一步只有可解释的状态变化；
- 上一步可以可靠回退；
- 重置回到同一初始状态；
- 最终状态与算法结果正确；
- 快速点击不会留下重复元素或残余动画；
- 不用 React 动画状态充当算法事实来源。

只有课件真正支持定时播放时才加入播放/暂停，默认不自动播放。“暂停思考”应建模为
教学步骤或预测点。

## 8. 互动事件

课件只返回共享 Schema 允许的结构化事件，例如：

- 到达步骤；
- 选择或预测；
- 正确与否；
- 重试次数；
- 完成；
- 主动关闭。

课件不直接调用 Provider，不向对话插入伪装成用户输入的文本，也不自行判定跨会话
掌握度。

## 9. UI、动画与无障碍

- 提供上一步、下一步和重置；
- 当前状态同时用文字、形状或位置表达，不只依赖颜色；
- 按钮有语义标签、disabled、`focus-visible` 与至少 44px 操作目标；
- 动态结果使用适当的可访问播报；
- 支持键盘；
- 尊重 `prefers-reduced-motion`；
- 关闭动画不影响信息完整性；
- 窄窗口允许换行或局部滚动，不隐藏核心步骤；
- 不修改全局样式，不监听全局快捷键，不依赖唯一 DOM ID；
- 卸载时清理订阅、observer 与异步任务；
- 课件组件不使用固定定位创建第二层桌面 workspace。

先完成教学等价迁移和准确性，再进行视觉重设计；不要同时重写教学流程与视觉系统。

## 10. 知识点双向绑定

两个数据域各自保存引用：

```text
桌面注册表
visualization_id → conceptIds[]

知识库 authoring
concept_id → visualization_ids[]
```

绑定流程：

1. 资源实现与工程测试完成，状态为 `review_pending`；
2. 核对注册 `conceptIds` 与源材料语义；
3. 进行独立教学准确性审查；
4. 审查通过后更新知识库权威 authoring 来源；
5. 在知识库执行适用的 generate / publish / build-rag / validate；
6. 刷新桌面快照；
7. 运行跨仓一致性与注册表测试。

知识库的派生 `published`、RAG 和候选文件不能单独手改。运行时代码不得写死开发机
知识库路径。

## 11. 测试要求

每项资源至少覆盖：

- 默认 spec；
- 所有允许的场景分支；
- 未知字段与边界非法 spec；
- 初始、逐步、最终和回退状态；
- 核心算法或数学结果；
- 前进、后退、重置与受控状态；
- 预测唯一答案、反馈与重试次数；
- 结构化事件；
- 注册 ID 唯一、版本、概念绑定与懒加载；
- reduced-motion；
- 关键键盘与无障碍行为。

完成后执行适用质量门：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

影响桌面容器、注册加载或打包时，再执行相关 E2E 与 macOS 验收。完整矩阵见
[`TESTING.md`](TESTING.md)。

## 12. 审核状态

| 状态 | 含义 | 可否由 AI 默认推荐 |
| --- | --- | --- |
| `draft` | 结构、步骤或教学结论仍在变化 | 否 |
| `review_pending` | 实现与自检完成，等待独立审查 | 仅开发预览 |
| `reviewed` | 独立审查确认事实、步骤、边界和呈现 | 可以 |

独立审查至少检查：

- 知识准确性；
- 所有 Schema 分支；
- 初始与边界输入；
- 预测题唯一答案；
- 结构化事件；
- 键盘、焦点、放大和 reduced-motion；
- 窄窗口与响应式布局；
- 注册与知识绑定。

审查证据写入带日期报告，不把“测试通过”当作“教学已审核”。

## 13. 当前资源

| 注册 ID | 包 | 状态 |
| --- | --- | --- |
| `call-stack.factorial-recursion.v1` | `call-stack` | `reviewed` |
| `ods.arraystack-insertion.v1` | `arraystack-insertion` | `reviewed` |
| `ods.arrayqueue-representation.v1` | `arrayqueue-representation` | `reviewed` |
| `ods.dualarraydeque-balance.v1` | `dualarraydeque-balance` | `reviewed` |
| 6 个 `cs408.*.v1` 过程课件 | `cs408-core-visualizations` | `reviewed` |

首批 10 项课件的独立审查见
[`../reports/2026-07-25-lesson-review.md`](../reports/2026-07-25-lesson-review.md)。
后续资源按真实学习价值排序，不机械为 122 个知识点各建一页。
