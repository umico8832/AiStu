# Kaleidoscope Agent Guide

本文件只记录 AI Agent 在本仓库工作的强制规则。产品目标、范围、架构与项目状态
分别由 `docs/` 下的核心文档维护，不在这里重复。

## 1. 开始前必须阅读

进行产品设计、架构调整或工程实现前，按顺序阅读：

1. `AGENTS.md`
2. `docs/PRODUCT_DIRECTION.md`
3. `docs/MVP_SCOPE.md`
4. `docs/ARCHITECTURE.md`
5. `docs/ROADMAP.md`

文档导航、维护职责和阅读路径见 [`docs/README.md`](docs/README.md)。

发生冲突时，按以下优先级处理：

1. 用户当前任务中的明确要求；
2. 本文件中的安全与工程硬约束；
3. `MVP_SCOPE.md` 中的当前范围；
4. `ARCHITECTURE.md` 中的技术边界；
5. `PRODUCT_DIRECTION.md` 中的长期原则；
6. `ROADMAP.md` 中的当前状态与执行顺序。

不得以临时实现隐式放宽安全边界或数据域隔离。形成新的长期决策时，同一任务内更新
对应核心文档；需要保留权衡过程时新增 ADR。

## 2. 修改前

- 检查当前工作树，保留并绕开用户已有修改；
- 阅读相关源码、依赖和邻近测试，不假设文档中的计划已经实现；
- 先确认改动属于当前 MVP，再决定是否实现；
- 复用现有组件、运行时和已验证课件，不无理由重写；
- Git 操作遵守 [`docs/AGENT_GIT_RULES.md`](docs/AGENT_GIT_RULES.md)；
- 未经用户当前任务明确许可，不得执行 `git add`、`git commit` 或 `git push`。

## 3. 产品硬约束

- 首页核心是 AI 对话，不是终端或 IDE；
- 新课件先以建议卡出现，只有用户明确确认后才能打开；
- 任意时刻只有一个活动可视化 session；
- 同一课件通过受限 patch 更新，不同课件原子替换；
- 可视化打开时保持对话组件、滚动位置、草稿和流式状态；
- 课件事件只作为结构化学习事件记录，不伪装成用户消息自动发送；
- AI 只能选择已注册课件并生成通过 Schema 的数据；
- 用户不能编辑或执行课件代码；
- 当前范围不包含真实终端、Monaco、Tree-sitter、node-pty、xterm.js、LSP、
  调试器或 AI 动态生成前端源码；
- 知识事实、社区内容、用户学习状态和临时对话状态属于不同数据域，不得混写；
- 专项学习足迹只记录参与、有效时长、内容接触和课件练习证据，不得把浏览、自评
  或内容覆盖自动判定为掌握；
- 未经独立审查的课件或内容不得标记为 `reviewed`。

完整范围与验收标准只在 [`docs/MVP_SCOPE.md`](docs/MVP_SCOPE.md) 维护。

## 4. 架构与安全硬约束

Electron 窗口必须保持：

```ts
{
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: preloadPath,
  },
}
```

- Main 管理窗口、安全策略、持久化、知识文件、AI Provider、凭据和 IPC handler；
- Preload 只通过 `contextBridge` 暴露最小、强类型的领域 API；
- Renderer 只负责 React UI 和可序列化状态，不访问 Node、文件系统、进程或凭据；
- 所有 IPC 输入使用共享 Zod Schema，并验证 sender 来自受信任应用页面；
- 默认拒绝未明确允许的权限请求，拦截非白名单导航和新窗口；
- AI 输出与知识 chunks 均按不可信数据处理；
- 禁止通用 `send`、`invoke`、任意文件访问、任意代码执行和远程组件加载 API；
- 禁止执行或直接注入 AI 生成的 React、JavaScript、HTML 或 CSS；
- API Key、Cookie、Token、完整环境变量和敏感日志不得进入 Renderer。

详细边界、数据流和状态归属见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

## 5. 工程约定

- 使用 pnpm workspace；
- 开发基线为 Node.js 22.21.0、pnpm 11.9.0；
- 保持 `.node-version`、`package.json#engines`、`packageManager` 与锁文件同步；
- 使用 TypeScript strict，避免 `any`；
- 跨进程数据必须可序列化并经过共享 Schema；
- React 动画统一使用 `motion/react`；
- Renderer 状态至少分为 conversation、visualization 和 application UI；
- 跨会话的专项学习足迹使用独立用户学习 store，不混入 conversation store；
- `visualizationStore` 只保存 `activeSession | null`；
- 不把本机绝对路径写入运行时代码；
- 不引入与当前范围无关的重量级框架；
- 课件开发遵守
  [`docs/guides/LESSON_DEVELOPMENT.md`](docs/guides/LESSON_DEVELOPMENT.md)。

## 6. 用户界面文案

- 页面只保留用户理解当前任务、状态和下一步所需的信息；
- 不把 Agent 注释、实现边界、Schema、测试提示、架构说明或维护者备注写进产品正文；
- 不用大段免责声明解释尚未实现的功能；
- 功能不可用时使用简短状态、禁用按钮和就近操作反馈；
- AI 文本只渲染受限 Markdown，不解析模型提供的 HTML；
- 修改 UI 后检查是否残留开发者导向文案。

## 7. 验证与交付

根据改动范围执行 [`docs/guides/TESTING.md`](docs/guides/TESTING.md) 中的验证矩阵。
应用代码的常规质量门是：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

涉及 Electron、持久化、路由、IPC、课件容器或打包配置时，还要执行相应的
Playwright 与 macOS 打包验收。

凡本轮修改了应用代码，在检查通过后必须停止此前由 Agent 启动的 Kaleidoscope
开发实例或应用窗口，再从当前工作树启动最新应用，确保桌面上只保留一个供用户验收
的最新实例。启动失败时明确报告错误与阻塞。

纯文档修改不要求重启应用，也不要求运行与内容无关的应用构建；必须至少执行
`pnpm docs:check`，并检查文档职责和相互矛盾的状态表述。

发布流程与产物要求见 [`docs/guides/RELEASE.md`](docs/guides/RELEASE.md)。
