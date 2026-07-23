# Kaleidoscope Agent Guide

## 0. 必读文档

开始产品设计、架构调整或工程实现前，按顺序阅读：

1. `AGENTS.md`
2. `docs/PRODUCT_DIRECTION.md`
3. `docs/MVP_SCOPE.md`
4. `docs/ARCHITECTURE.md`
5. `docs/ROADMAP.md`

`docs/README.md` 是文档索引和维护规则。

若文档冲突：

- 用户当前任务中的明确要求优先；
- 产品范围以 `MVP_SCOPE.md` 为准；
- 技术边界以 `ARCHITECTURE.md` 为准；
- 当前状态以 `ROADMAP.md` 为准；
- 安全约束和数据域隔离不得被隐式放宽。

不要把计划写成已完成。形成新的长期决策后，必须同步更新相关文档。

## 1. 当前产品方向

Kaleidoscope 是面向计算机学习的桌面端 AI 教学 MVP。

当前核心界面是 AI 对话首页。用户在对话中表达困惑，AI 判断是否需要可视化，
选择已有可视化资源，并用结构化场景数据调整课件后在应用内渲染。

应用任意时刻只能显示一个活动可视化页面。新的可视化请求更新或替换当前页面，
不得创建多标签、并排课件、画中画或可视化页面栈。

正确交互是：

```text
对话首页
→ AI 理解学习问题
→ 选择 concept_id 和 visualization_id
→ 生成受约束的 VisualizationSessionSpec
→ Schema 校验
→ 加载已注册 React 可视化组件
→ 在对话页面上方展开或覆盖
→ 用户操作课件
→ 交互结果返回对话教学流程
```

主页对话状态必须保留。关闭可视化后，用户返回同一会话和原位置。

## 2. 已取消的旧方向

以下内容不属于当前 MVP，不得继续实现：

- 用户修改代码驱动动画；
- 可编辑 Monaco；
- Tree-sitter；
- ProgramModel；
- 动态解析任意 C；
- node-pty；
- xterm.js；
- 真实终端；
- TerminalOverlay；
- 完整 IDE、LSP、调试器；
- 在 Renderer 中执行 AI 生成的任意代码。

现有课件中的代码可以作为只读教学材料显示，但用户不能编辑。

## 3. 现有资产

React 调用栈课件原型：

```text
/Users/umico/Documents/Kaleidoscope/call-stack-visualizer
```

该原型已通过 typecheck、lint 和 build。后续必须迁移复用，不要重写已验证的视觉、
动画和教学逻辑。

标准知识库：

```text
/Users/umico/Documents/ods-material/knowledge_base
```

知识库属于独立知识内容域。桌面应用通过 `concept_id` 和 `visualization_id` 使用
知识与课件，不把 React 代码写入知识库。

## 4. 当前技术栈

- Node.js 24 LTS
- Electron
- electron-vite
- electron-builder
- pnpm workspace
- React 19
- TypeScript strict
- Tailwind CSS 4，使用 `@tailwindcss/vite`
- Motion，统一使用 `motion/react`
- Zustand
- Zod 4
- Vitest
- Playwright

建立 workspace 时必须提交 `.node-version`、`package.json#engines`、
`package.json#packageManager` 和 `pnpm-lock.yaml`。固定实际使用的 Electron 与
工具链版本，不使用浮动的 `latest` 作为可复现构建依据。依赖版本以创建项目时验证
通过的兼容组合为准，不为了追新阻塞 MVP 开发。

根据实际 AI Provider 再选择流式请求库，不要提前引入大型 Agent 框架。

现有原型使用 `framer-motion`。迁移时统一为 `motion/react`，不要长期保留两套
Motion 依赖。

## 5. 推荐工程结构

```text
Kaleidoscope/
├── apps/
│   └── desktop/
│       └── src/
│           ├── main/
│           ├── preload/
│           └── renderer/
├── packages/
│   ├── contracts/
│   ├── tutor-runtime/
│   ├── visualization-runtime/
│   ├── lessons/
│   │   └── call-stack/
│   └── ui/
├── docs/
├── pnpm-workspace.yaml
└── package.json
```

可以根据 electron-vite 约定调整路径，但分层职责不能改变。

## 6. Electron 分层

### Main

负责：

- BrowserWindow 生命周期；
- 安全配置；
- 本地持久化；
- 受控知识资源读取；
- AI Provider 凭据与请求；
- 流式响应转发；
- IPC 服务端；
- 应用日志和错误处理。

API Key、凭据和完整环境变量不得进入 Renderer。

### Preload

负责：

- 使用 `contextBridge` 暴露最小领域 API；
- 隔离 `ipcRenderer`；
- 为 Renderer 提供强类型接口；
- 将流式事件转换为可取消订阅；
- 不包含 React 或教学业务 UI。

禁止暴露 `ipcRenderer`、通用 `send/invoke`、Node 模块或任意文件接口。

### Renderer

负责：

- AI 对话首页；
- 消息流和输入框；
- 可视化容器；
- 已注册课件；
- 课件交互；
- Renderer UI 状态；
- 结构化错误和加载状态。

Renderer 不得直接访问 Node、文件系统、系统凭据或任意动态代码执行能力。

## 7. 强制安全要求

BrowserWindow 必须使用：

```ts
{
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: preloadPath
  }
}
```

所有 IPC 输入使用共享 Zod Schema 校验，并校验 IPC sender 来自当前受信任的应用
页面。参数合法不等于调用来源可信。

Main 必须默认拒绝未明确允许的权限请求，拦截非白名单导航和新窗口。开发环境可以
使用 electron-vite 开发地址；打包版本优先使用应用自有协议加载本地 Renderer，
不得因此阻塞日常 HMR。

不得暴露：

```ts
send(channel, payload)
invoke(channel, payload)
readAnyFile(path)
executeCode(source)
loadRemoteComponent(url)
```

AI 输出一律视为不可信数据。AI 只能：

- 选择允许的 `visualization_id`；
- 生成符合 Schema 的场景参数或页面补丁；
- 生成课件支持范围内的步骤数据；
- 生成对话文本和教学提示。

AI 不能：

- 生成并执行 React/JavaScript 源码；
- 注入 HTML；
- 指定任意本地模块；
- 指定任意文件路径；
- 绕过可视化注册表；
- 把未经校验的数据直接传给复杂组件。

## 8. 对话首页

首页是产品核心，不是临时启动页。

至少包括：

- 消息列表；
- 用户与 AI 消息；
- 流式回答；
- 输入框；
- 发送、停止生成和重试；
- 错误状态；
- 当前会话状态；
- AI 发起可视化的入口；
- 可视化关闭后继续原对话。

对话历史、当前生成状态和可视化状态应分开管理。

本阶段不要求复杂会话搜索、云同步、多人协作或多模型市场。

## 9. 可视化运行方式

可视化不是 AI 每次生成的新页面源码。

正确模式：

```text
已有 React 可视化模板
+ AI 生成的结构化 VisualizationSessionSpec / VisualizationPatch
= 当前教学场景
```

推荐接口：

```ts
interface VisualizationRegistration {
  id: string;
  conceptIds: string[];
  specSchema: ZodType;
  load: () => Promise<VisualizationModule>;
  status: "draft" | "review_pending" | "reviewed";
  version: number;
}
```

运行时必须：

1. 根据 `visualization_id` 查静态注册表；
2. 拒绝未知 ID；
3. 用对应 Zod Schema 校验 AI 场景数据；
4. 对数值、步骤数和文本长度设置上限；
5. lazy load 已审核的 React 组件；
6. 通过 props 传入已校验数据；
7. 捕获组件错误并允许返回对话；
8. 把用户交互结果以结构化事件返回 Tutor。

AI 可以根据用户后续表达的困惑继续调整当前页面，但只允许修改课件预先声明的
安全字段，例如演示数据、允许的步骤选择与顺序、当前强调、对象高亮、解释或类比
文本、预测问题、暂停点、初始视图和预定义布局参数。AI 不得修改或执行
React、JavaScript、HTML、CSS 源码。现有课件能力不足时，应退回文字讲解并记录
缺失能力，不能临时生成不受控页面。

## 10. 可视化与对话布局

对话首页始终是底层页面。

可视化打开时：

- 在对话页面上方使用应用内 overlay、sheet 或 workspace；
- 不销毁对话组件；
- 不丢失滚动位置、草稿或流式消息；
- 提供清晰的关闭和返回入口；
- 可以保留一部分对话上下文可见；
- 课件关闭后回到同一会话；
- 可视化交互结果能成为后续对话输入。
- 任意时刻只存在一个活动可视化 session；
- 相同可视化的新请求更新当前页面，不新建第二个页面；
- 不同可视化的新请求原子替换当前页面。

具体比例可在设计阶段调整，但“下面是原有对话页面，不是终端”是确定要求。

## 11. 现有课件迁移

迁移 `call-stack-visualizer` 时：

- 保留组件职责；
- 保留动画和 reduced-motion；
- 保留前进、后退、重置；
- 保留受控/非受控状态接口；
- 保留静态 `lessonSteps`；
- 代码面板保持只读；
- 先完成等价迁移，再改造成接受结构化场景数据；
- 不同时重写视觉设计和教学过程。

课件可以接受 AI 调整后的安全参数，例如：

- 初始展示步骤；
- 允许的示例输入；
- 强调的栈帧；
- 教学提示；
- 是否暂停在某一预测点；
- 预定义范围内的步骤序列变体。

这些参数必须由课件专属 Schema 限制。

## 12. 状态归属

Zustand 可管理 Renderer UI 状态：

- 当前会话；
- 消息列表；
- 输入草稿；
- 流式生成状态；
- 当前可视化 ID；
- 当前可视化 session spec；
- 可视化打开状态；
- 课件当前步骤；
- 可视化交互结果。

不要把所有状态放进单体 store。至少区分：

- conversation；
- visualization；
- application UI。

`visualization` store 只保存 `activeSession | null`，不得保存同时展示的 session
数组、标签页或并排页面状态。

长期用户知识状态属于独立用户学习域，不应直接混入临时对话 store。

## 13. 可视化资源与知识点绑定

知识点通过 `visualization_ids` 引用桌面可视化资源。

要求：

- ID 稳定；
- 一个知识点可以关联多个可视化；
- 一个可视化可以服务多个知识点；
- 桌面注册表与知识库引用一致；
- React 代码只在桌面 monorepo；
- 知识库不保存 React 源码；
- 可视化准确性未审查时不能标记为 reviewed。

调用栈原型当前没有对应 ODS 第 2 章知识点，不得强行绑定或编造 `concept_id`。

## 14. 当前 MVP 范围

当前应完成：

- pnpm workspace；
- Electron main/preload/renderer 骨架；
- AI 对话首页；
- 类型化 IPC；
- AI Provider 抽象和流式回答；
- 调用栈课件迁移；
- 可视化注册表；
- `VisualizationSessionSpec`；
- `VisualizationPatch` 与 revision 校验；
- 单一 `activeSession` 生命周期；
- AI 选择和调整已有可视化；
- 对话页面上的可视化 overlay/workspace；
- 可视化交互结果返回对话；
- 本地最小会话持久化；
- Vitest、Playwright、build 和打包验证。

当前不做：

- 用户编辑代码；
- 任意代码解析或执行；
- 终端；
- IDE；
- 自由生成前端源码；
- RAG 完整接入；
- 完整用户知识追踪；
- 社区、投稿、多窗口和插件系统；
- 一次实现大量可视化。

## 15. 推荐实施顺序

1. 建立 pnpm workspace 和 Electron 安全骨架；
2. 建立 contracts；
3. 实现对话首页静态 UI 和状态模型；
4. 建立 AI Provider 抽象与流式 IPC；
5. 迁移调用栈课件；
6. 建立 visualization registry 和 session spec；
7. 实现对话之上的可视化容器；
8. 让 AI 选择调用栈课件，并生成受约束参数或页面补丁；
9. 把课件交互结果返回对话；
10. 完成持久化、测试、构建和打包验证。

## 16. 工程规则

开始修改前：

- 阅读项目文档；
- 检查现有代码和依赖；
- 检查用户已有修改；
- 不假设未验证能力已经存在；
- 不重写现有课件。

实现时：

- 使用 pnpm；
- 使用 Node.js 24 LTS；
- 保持锁文件和 `packageManager` 字段同步；
- TypeScript strict；
- 避免 `any`；
- 跨进程数据必须可序列化；
- IPC 和 AI 输出必须验证；
- 不把本机绝对路径写入运行时代码；
- 不在 Renderer 存储密钥；
- 不引入与 MVP 无关的重量级依赖；
- 不把 AI 文本当作可信代码或 HTML。

完成后运行适用命令：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

涉及 Electron 时还要运行打包产物启动验证。

Electron Fuses 属于发布加固步骤，在打包验收阶段配置和验证，不要求在早期 UI
开发阶段反复处理。

## 17. 完成标准

不能只以“页面能打开”作为完成。

MVP 完成至少意味着：

- 对话首页可正常发送、流式显示和继续会话；
- AI 能选择已注册可视化；
- AI 场景数据会被严格校验；
- AI 页面补丁通过 session、revision 和课件 Schema 校验；
- 调用栈课件在桌面应用内正确渲染；
- 任意时刻只渲染一个可视化页面；
- AI 能根据用户反馈在课件声明的安全范围内调整当前页面；
- 可视化打开时对话状态不丢失；
- 用户交互结果能返回对话；
- 未知 visualization ID 和非法 spec 会安全失败；
- Renderer 无 Node 权限；
- typecheck、lint、测试、build 和打包验证通过；
- 文档与真实实现一致。
