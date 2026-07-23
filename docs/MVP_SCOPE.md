# Kaleidoscope 桌面 MVP 范围

## 1. MVP 目标

证明一个完整教学闭环：

> 用户在桌面对话首页提出困惑，AI 选择已有的高质量可视化课件，生成经过严格
> 校验的场景参数，在应用内调整并渲染课件；用户完成观察或操作后，结果返回同一
> 对话，AI 继续教学。

当前重点不是知识点数量，而是“对话—可视化—交互—继续对话”闭环稳定可靠。
应用任意时刻只能显示一个活动可视化页面；AI 根据用户反馈更新当前页面，或用新的
可视化原子替换它。

## 2. 黄金场景

第一项必须完整打磨的可视化是：

```text
栈与函数调用：
递归阶乘过程中，函数调用栈如何进入、等待和返回。
```

现有原型：

```text
/Users/umico/Documents/Kaleidoscope/call-stack-visualizer
```

该原型必须迁移复用。

## 3. 目标用户任务

用户在对话中说：

> 我知道递归函数会调用自己，但不明白调用栈到底怎么变化。

AI 应当：

1. 简短判断用户的具体困惑；
2. 选择调用栈可视化；
3. 根据对话生成安全的课件场景参数；
4. 在对话页面上方打开课件；
5. 引导用户观察入栈、等待、出口和返回；
6. 在合适步骤暂停并提出预测问题；
7. 接收用户操作结果；
8. 关闭或收起课件后继续原对话；
9. 根据结果纠正误解或总结。

## 4. 页面结构

首页是 AI 对话页面。

可视化打开时：

```text
应用窗口
├── 可视化 workspace / overlay
└── 原有 AI 对话首页
```

确定要求：

- 下层是原有对话页面，不是终端；
- 打开可视化不销毁对话；
- 对话滚动位置、输入草稿和消息状态保持；
- 关闭可视化后返回同一会话；
- 可视化交互结果可以进入后续对话；
- 任意时刻只显示一个可视化页面；
- 相同可视化的新请求更新当前页面；
- 不同可视化的新请求替换当前页面；
- 不提供多标签、并排课件或可视化历史页面栈；
- 不需要真实终端；
- 不允许用户编辑课件代码。

具体高度、过渡和是否保留部分对话可见，可以在 UI 设计阶段调整。

## 5. 必须实现的功能

### 5.1 桌面应用

- Electron main/preload/renderer；
- electron-vite；
- electron-builder；
- pnpm workspace；
- Node.js 24 LTS 与可复现的依赖锁定；
- React 19 与 TypeScript strict；
- Tailwind CSS 4 与 `@tailwindcss/vite`；
- Zod 4；
- 单窗口应用；
- 安全 BrowserWindow 设置；
- 开发、构建和打包产物可运行。

### 5.2 AI 对话首页

- 消息列表；
- 用户消息和 AI 消息；
- 输入框；
- 发送；
- 流式回答；
- 停止生成；
- 重试；
- 加载、错误和空状态；
- 当前会话保持；
- 最小本地持久化；
- AI 发起可视化的结构化事件。

本阶段可以只支持一个明确配置的 AI Provider，但接口不能与单一厂商 UI 耦合。
当前开发期默认通过受控的本机 Codex CLI 代答，本地演示 Provider 用于可复现测试；
ChatGPT 网页只允许人工转接。正式付费 Provider 目标为 DeepSeek API，待需要线上
独立运行时接入，不因此改变 Renderer 或 TutorCommand 协议。

### 5.3 调用栈课件迁移

- 复用现有课件；
- 保留动画；
- 保留 reduced-motion；
- 保留步骤控制；
- 代码展示保持只读；
- 不开放代码编辑；
- 保留静态 lessonSteps 作为可靠默认场景；
- 迁移后视觉和教学行为无明显回退。

### 5.4 可视化注册表

桌面端建立静态注册表：

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

要求：

- 只加载已注册组件；
- 未知 ID 安全失败；
- 支持 lazy import；
- 可视化资源与 `concept_id`、`visualization_id` 对应；
- 一个可视化可服务多个知识点；
- 一个知识点可关联多个可视化。

### 5.5 AI 调整已有可视化

AI 不能生成并执行页面源码。

AI 只能输出类似：

```ts
interface VisualizationSessionSpec {
  visualizationId: string;
  version: number;
  teachingGoal: string;
  initialStep?: number;
  emphasis?: string[];
  pauses?: PredictionPause[];
  tutorNotes?: TutorNoteInput[];
  scenario?: Record<string, unknown>;
}
```

实际 Schema 按每个课件能力确定。

用户继续表达困惑时，AI 可以为当前页面输出增量补丁：

```ts
interface VisualizationPatch {
  sessionId: string;
  visualizationId: string;
  baseRevision: number;
  operations: VisualizationPatchOperation[];
}
```

`VisualizationPatchOperation` 必须是课件预先声明并经过 Zod 校验的判别联合，只能
包含更换演示数据、选择或重排允许的步骤、改变高亮、更新 TutorNote、设置预测暂停、
选择预定义视图以及调整允许的布局参数。补丁不得包含源码、HTML、CSS、组件路径、
任意属性路径或可执行内容。

运行时必须：

- Zod 校验；
- 限制文本长度；
- 限制步骤数；
- 限制数值范围；
- 限制枚举；
- 拒绝未知字段；
- 拒绝未知 visualization ID；
- 失败时回退到课件默认场景。

### 5.6 可视化容器

- 在对话页面上方打开；
- 提供关闭、返回和加载状态；
- 捕获组件错误；
- 对话状态不丢失；
- 动画尊重 reduced-motion；
- 支持课件向 Tutor 返回结构化交互事件；
- 不允许组件执行 AI 生成代码或 HTML。
- 只维护一个 `activeSession`；
- 新可视化原子替换旧 session；
- 页面补丁必须匹配当前 session ID、visualization ID 和 base revision；
- 补丁成功后 revision 递增，过期补丁必须拒绝。

### 5.7 教学交互回流

可视化至少能返回：

- 用户到达的步骤；
- 用户选择或预测；
- 是否正确；
- 重试次数；
- 用户主动关闭；
- 课件完成。

Tutor 根据事件继续对话。本阶段只记录会话事件，不建立完整掌握度模型。

### 5.8 最小持久化

可以保存：

- 当前会话；
- 最近消息；
- 输入草稿；
- 当前或最近的可视化 session；
- 课件当前步骤；
- 用户界面偏好。

持久化由 main 通过受控 API 管理。Renderer 不直接写文件。
MVP 使用 Electron 用户数据目录中的版本化 JSON，并使用 Zod 校验和迁移；当前不
引入 SQLite。

## 6. AI 可调整的内容

调用栈课件第一版允许 AI 调整：

- 教学目标；
- 初始显示步骤；
- 重点强调的栈帧或阶段；
- 教学提示文本；
- 在预定义位置插入预测暂停；
- 从课件预设中选择演示输入；
- 选择预定义视图和允许的布局参数；
- 结束后的总结问题。

不允许 AI 调整：

- React 组件源码；
- 任意 JavaScript；
- CSS；
- 任意 HTML；
- 本地模块；
- 文件路径；
- 超出课件 Schema 的步骤结构；
- 未声明的页面补丁操作；
- 未经验证的算法事实。

## 7. 安全要求

- `nodeIntegration: false`；
- `contextIsolation: true`；
- `sandbox: true`；
- Renderer 不直接访问 Node；
- API Key 不进入 Renderer；
- IPC 输入使用 Zod；
- IPC sender 必须来自受信任的应用页面；
- 默认拒绝未明确允许的 Electron 权限请求；
- AI 输出视为不可信；
- 不使用 `dangerouslySetInnerHTML` 渲染 AI 内容；
- Markdown 渲染需要安全策略；
- 不加载 AI 指定的远程组件；
- 不执行 AI 输出代码；
- 外部链接使用受控打开策略。
- 开发环境允许 electron-vite HMR，打包版本优先使用应用自有协议；
- Electron Fuses 在发布打包阶段配置和验证。

## 8. 质量要求

- TypeScript strict；
- 核心数据不使用 `any`；
- contracts、session spec 和注册表有测试；
- 对话流有 Vitest；
- Electron 黄金流程有 Playwright；
- Playwright Electron 不作为唯一安全验证手段；
- typecheck、lint、test、build 通过；
- electron-builder 产物能启动；
- 可视化迁移有回归检查；
- 非法 AI spec 有降级行为；
- 文档与真实实现一致。

## 9. 当前明确不做

- 用户编辑代码；
- Monaco 编辑器；
- Tree-sitter；
- ProgramModel；
- 任意 C 代码解析；
- 任意代码执行；
- 真实终端；
- node-pty；
- xterm.js；
- IDE、LSP 或调试器；
- AI 运行时生成 React 页面；
- 插件系统；
- 多窗口；
- 云同步；
- 社区；
- 题目投稿；
- 完整 RAG；
- 完整用户知识追踪；
- 一次实现大量可视化。

## 10. 验收场景

### 场景 A：基础对话

- 用户发送消息；
- AI 流式回答；
- 用户可以停止或重试；
- 错误不会破坏当前会话；
- 重启应用后能恢复最小会话状态。

### 场景 B：AI 打开调用栈可视化

- AI 返回已注册 visualization ID；
- session spec 通过校验；
- 调用栈课件在应用内打开；
- 对话页面仍保留；
- 课件使用 AI 指定的安全强调和暂停点。

### 场景 C：AI 调整当前页面

- 用户说“我还是不理解返回值去了哪里”；
- AI 为当前 session 生成经过校验的页面补丁；
- 应用不打开第二个可视化页面；
- 补丁通过 session、revision 和课件 Schema 校验；
- 当前页面转而聚焦返回阶段，同时保留对话和课件状态。

### 场景 D：交互返回对话

- 用户完成一个预测或步骤；
- 课件返回结构化事件；
- AI 能在后续消息中使用该结果；
- 关闭课件后回到原会话位置。

### 场景 E：非法可视化请求

- 未知 visualization ID 被拒绝；
- 超范围参数被拒绝；
- 过长文本或过多步骤被拒绝；
- 应用回退到默认课件或纯文字讲解；
- 不执行 AI 提供的代码或 HTML。

### 场景 F：安全边界

- Renderer 无法访问 Node；
- preload 不暴露 ipcRenderer；
- 凭据不出现在 Renderer；
- 所有 IPC 参数经过校验；
- 外部导航受控；
- 打包版安全设置与开发版一致。

## 11. 完成定义

MVP 完成必须同时满足：

- 对话首页可用；
- AI 流式回答可用；
- AI 能选择已有可视化；
- AI session spec 被严格校验；
- AI 页面补丁经过 Schema 与 revision 校验；
- 调用栈课件成功迁移；
- 可视化能覆盖或展开在对话页面上方；
- 任意时刻只显示一个可视化页面；
- AI 能在课件声明的安全范围内根据用户反馈调整当前页面；
- 对话状态不丢失；
- 可视化事件能返回对话；
- 非法 spec 安全降级；
- Renderer 无 Node 权限；
- typecheck、lint、测试、build 和打包验证通过；
- 没有实现已取消的代码编辑或终端方向。
