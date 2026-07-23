# Kaleidoscope 可视化资源开发指南

本目录是 Kaleidoscope 桌面应用中所有教学可视化资源的唯一代码归属地。

这里存放的是可被桌面端按需加载的 React 可视化模块，不是若干互不相关的独立
网页工程。知识库仍位于 `ods-material/knowledge_base`，只保存知识事实以及
`visualization_ids` 引用，不保存 React、CSS 或运行时代码。

开始实现资源前，先阅读：

1. [`../../AGENTS.md`](../../AGENTS.md)
2. [`../../docs/PRODUCT_DIRECTION.md`](../../docs/PRODUCT_DIRECTION.md)
3. [`../../docs/MVP_SCOPE.md`](../../docs/MVP_SCOPE.md)
4. [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)
5. [`../../docs/ROADMAP.md`](../../docs/ROADMAP.md)

## 1. 为什么采用“模块库”，而不是“独立页面库”

每个知识点都创建一套 Vite、HTML、主题和依赖，看似隔离，长期会产生以下问题：

- 动画、步骤控制、无障碍和主题规范逐渐不一致；
- 每个资源重复打包 React、Motion 和 UI 基础设施；
- 桌面端无法用统一协议注入场景数据、接收学习事件或做懒加载；
- `visualization_id`、知识点引用和实际入口容易失去同步；
- AI 很难安全地调整资源，只能退化为生成任意代码或 HTML。

因此本目录采用“共享运行时 + 独立资源模块”：

- `packages/visualization-runtime` 负责统一容器、注册表、步骤控制和运行时协议；
- `packages/ui` 负责共享视觉基础组件和主题；
- `packages/lessons` 中每个子目录只负责一个教学目标；
- `apps/desktop` 负责选择并展示当前可视化，不复制资源内部逻辑。

## 2. 推荐目录结构

当前工程骨架尚未创建完成时，可以先保留本指南；建立 pnpm workspace 后按以下
结构落地：

```text
packages/
├── visualization-runtime/
│   └── src/
│       ├── registry.ts
│       ├── VisualizationHost.tsx
│       └── types.ts
├── ui/
└── lessons/
    ├── README.md
    ├── call-stack/
    │   ├── index.ts
    │   ├── registration.ts
    │   ├── spec.ts
    │   ├── lessonSteps.ts
    │   ├── CallStackLesson.tsx
    │   ├── components/
    │   ├── fixtures/
    │   └── __tests__/
    ├── ods-arraystack-insertion/
    ├── ods-arrayqueue-representation/
    └── ods-dualarraydeque-balance/
```

不要在每个资源目录内创建自己的 `index.html`、Vite 配置、Tailwind 配置或完整
应用入口。确有独立预览需要时，使用桌面 Renderer 的开发路由或共享 story/demo
harness。

已有的 `call-stack-visualizer` 是迁移来源。迁移时保留已验证的教学步骤、动画、
受控/非受控接口和无障碍行为，先改造成资源模块，再考虑通用化。

## 3. 一个资源目录应包含什么

资源目录名原则上与稳定的 `visualization_id` 相同。历史资源 `call-stack` 可在
注册时使用明确的稳定 ID，不因显示标题变化而改名。

推荐职责：

- `index.ts`：唯一公开出口；
- `registration.ts`：资源 ID、知识点绑定、版本、审核状态和懒加载入口；
- `spec.ts`：该资源允许 AI 调整的结构化场景 Schema 与默认值；
- `lessonSteps.ts`：声明式教学步骤或由纯函数生成的步骤；
- `types.ts`：仅该资源使用的类型；
- `*Lesson.tsx`：主可视化组件；
- `components/`：该资源内部组件；
- `fixtures/`：已审核的基准场景；
- `__tests__/`：状态转换、算法结果、Schema 边界和交互测试。

不要为了形式完整创建空文件。资源简单时可以合并少量职责，但教学数据不能大量
硬编码进 JSX。

## 4. 稳定 ID、注册表与版本

运行时的权威资源清单应是类型化的 TypeScript 静态注册表，而不是人工维护的
`registry.jsonl`。注册项至少包含：

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

- `id` 发布后不可静默改名；必须改名时保留显式迁移关系；
- `conceptIds` 只引用知识库中真实存在的稳定 `concept_id`；
- `load` 使用动态 import，避免一次加载所有可视化；
- 场景协议语义变化时递增 `version`；
- 新资源默认是 `draft` 或 `review_pending`；
- 实现资源的同一 Agent 不得自行把它标记为 `reviewed`；
- 若知识库验证需要 JSON/JSONL 清单，应由注册表自动导出，生成物不得手工编辑。

## 5. 与知识点的双向绑定

绑定存在于两个不同数据域中：

```text
桌面资源注册表
visualization_id -> conceptIds[]

知识库权威 authoring 来源
concept_id -> visualization_ids[]
```

这种双向记录便于应用加载和知识检索，但必须通过自动校验保证一致，不能只靠人工
记忆。

绑定流程：

1. 资源达到 `review_pending`，并通过工程测试；
2. 核对注册项中的 `conceptIds` 与知识库中的概念语义；
3. 完成独立的教学准确性审查；
4. 审查通过后，将稳定 ID 写入知识库的权威 authoring 来源；
5. 重新运行知识库 `generate/publish/build-rag/validate` 等适用流程；
6. 运行跨仓一致性校验，确认不存在悬空 ID、漏绑或反向绑定不一致。

当前 ODS 样本的权威概念草稿是：

```text
/Users/umico/Documents/ods-material/knowledge_base/authoring/drafts/
```

`concepts/internal`、`concepts/published`、RAG 文件和
`visualization/candidates.jsonl` 都是派生产物，不能只修改这些文件。

此外，当前第 2 章草稿可由
`knowledge_base/scripts/seed_pilot_authoring.py` 重新生成，而该脚本目前会把
`visualization_ids` 初始化为空。正式回写绑定前，应先让种子来源与权威草稿使用
同一绑定数据，或为知识库增加独立的 authoring binding overlay；否则重新 seed
会覆盖人工绑定。优先采用 binding overlay 并在 generate 阶段合并，避免长期在
Python 种子脚本和 JSONL 中重复维护同一列表。

运行时代码不得硬编码上述本机绝对路径。跨仓校验命令应通过命令行参数、workspace
配置或 CI 环境传入知识库位置。

## 6. AI 可调整什么

AI 只能选择已注册资源，并生成通过 Zod 校验的结构化场景数据或受限 patch。

允许的内容示例：

- 数组容量、元素序列、选中的下标；
- 算法的受支持分支；
- 当前教学步骤；
- 提示文案和预测停顿；
- 资源明确声明可调的速度或显示选项。

不允许：

- AI 生成任意 React、HTML、CSS 或 JavaScript 后直接执行；
- AI 指定模块路径、import 名称或任意组件名；
- 绕过 Schema 向组件注入未知字段；
- 根据无法验证的输入猜测算法状态；
- 在 Renderer 中获得 Node、文件系统或进程执行权限。

资源应定义严格上限，例如数组最大长度、整数范围、最大步骤数和文本长度。校验
失败时回退到已审核默认场景，并向教学流程返回结构化诊断。

## 7. 共享模式：先提炼原语，不先造大模板框架

候选资源大致可归为：

- `state_transition`：状态变化；
- `algorithm_execution`：算法执行；
- `structure_layout`：数据结构布局；
- `math_relation`：数学关系。

这些分类适合复用交互原语，但不意味着现在就建立四个包办一切的巨型模板。更稳妥
的顺序是：

1. 迁移并验证 `call-stack`；
2. 实现三个代表性资源；
3. 从真实重复中提炼步骤控制、数组槽位、指针、移动标记、公式标注等共享原语；
4. 只有两个以上资源出现相同结构时，再提升为公共模板。

首批三个代表性资源建议保留为：

- `ods-arraystack-insertion`：验证逐槽移动和状态变化；
- `ods-arrayqueue-representation`：验证循环布局、逻辑顺序与物理下标；
- `ods-dualarraydeque-balance`：验证双区布局、触发条件和批量重排。

`candidates.jsonl` 中的 12 条记录是候选积压，不是必须一次性交付的页面清单。当前
MVP 应先完成桌面容器、注册表、会话协议和一个高质量资源闭环，再扩展其余候选。

## 8. 每个资源的最低教学要求

每个可视化至少应做到：

- 聚焦一个清晰的核心问题，并写明不覆盖的结论；
- 有确定的初始状态和完整、可回退的步骤；
- 提供“上一步、下一步、重置”，不自动播放；
- 把“暂停思考”建模为教学步骤，而不是无意义的媒体暂停按钮；
- 只有资源确实支持定时播放时才增加“播放/暂停”，且默认仍不自动播放；
- 每一步有简短的教学提示，并与当前对象在空间或语义上关联；
- 前进、后退和快速点击不会产生重复元素或残留动画；
- 支持 `prefers-reduced-motion`；
- 不以颜色作为唯一状态信息；
- 可通过键盘操作，按钮有明确的 disabled、focus-visible 和 aria 属性；
- 不修改全局样式，不使用全局快捷键，不依赖唯一 DOM id；
- 组件卸载时清理 observer、订阅和异步任务；
- 不依赖原书中缺失的图片；
- 不展示源材料不支持的结论。

桌面容器负责资源出现、消失和窗口布局。资源组件不自行创建全屏窗口、关闭按钮、
固定定位遮罩或第二套路由。

## 9. 实现前的教学设计清单

编码前先在资源目录的设计说明或测试夹具中回答：

1. 这个资源只解决哪个核心问题？
2. 对应哪些 `concept_id` 和源材料记录？
3. 学习者最容易误解什么？
4. 哪些状态必须看见，哪些细节应省略？
5. 每一步改变了什么，为什么？
6. 哪一步适合让学习者先预测？
7. 哪些输入允许 AI 调整，合法范围是什么？
8. 哪些输入应返回诊断而不是继续渲染？
9. 最终状态和算法结果如何用纯函数测试？
10. 是否需要独立教学审查？

## 10. 测试与质量门

每个资源至少覆盖：

- 默认 spec 通过 Schema；
- 边界和非法 spec 被拒绝；
- 步骤序列稳定且前后状态正确；
- 关键算法结果或数学关系正确；
- 重置、前进、后退和受控状态正确；
- 注册表 ID 唯一，懒加载入口有效；
- 注册表 `conceptIds` 不为空且能通过跨仓校验；
- 关键交互无障碍；
- reduced-motion 下功能不丢失。

完成后运行根工作区适用命令：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

涉及桌面加载、IPC 或打包行为时，还要运行桌面端开发验证与打包产物验证。知识点
绑定发生变化时，另行运行知识库的 publish、build-rag 和 validate 流程。

## 11. 审核状态

- `draft`：结构或教学过程仍在变化；
- `review_pending`：实现、测试和自检完成，等待独立教学审查；
- `reviewed`：独立审查确认概念、步骤、边界和最终结论正确。

工程测试通过不等于教学内容已审核。未审核资源可以在开发环境预览，但不应作为
生产教学资源被 AI 自动选择。

