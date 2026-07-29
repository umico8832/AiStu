# 本地开发指南

> 状态：活跃指南
> 最近复核：2026-07-25

本文说明如何建立环境、选择 Provider、定位代码和完成一次安全的工程改动。产品范围
和架构边界分别以 [`../CURRENT_SCOPE.md`](../CURRENT_SCOPE.md) 与
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) 为准。

## 1. 环境要求

| 工具 | 版本或要求 |
| --- | --- |
| Node.js | `22.21.0` |
| pnpm | `11.9.0` |
| Python | Python 3，仅维护或验证标准知识库时需要 |
| 系统 | 当前开发与发布基线为 macOS arm64 |
| DeepSeek API Key | 使用默认 Provider 时在项目根目录 `.env` 中配置 |
| Codex CLI | 仅使用本机 Codex Provider 时需要安装并登录 |

仓库同时允许经过验证的 Node.js 24.14.x 工具运行时，但日常开发与复现问题优先使用
`.node-version` 中的 22.21.0。

确认环境：

```bash
node --version
pnpm --version
```

## 2. 安装与启动

```bash
pnpm install
cp .env.example .env
pnpm dev
```

`.env.example` 是配置说明；不要提交真实密钥、Cookie、Token 或本机私有路径。

应用代码发生变化并完成检查后，应关闭此前由 Agent 启动的旧实例，再从当前工作树
启动一次，保证验收窗口不是旧代码。纯文档修改不要求重启。

## 3. AI Provider

### DeepSeek：默认开发模式

复制 `.env.example` 后只需填写 Key：

```dotenv
AISTU_AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=在这里填写你的_API_Key
DEEPSEEK_MODEL=deepseek-v4-flash
```

可选配置：

| 环境变量 | 用途 |
| --- | --- |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash` 或 `deepseek-v4-pro` |
| `DEEPSEEK_TIMEOUT_MS` | 请求超时，运行时限制在 15–300 秒 |

`.env` 已被 Git 忽略。DeepSeek Key 只进入 Main，不通过 Preload、IPC、Renderer、
应用持久化或日志传播。模型返回的 JSON 仍经过 Tutor Schema、注册课件 allowlist
和知识引用 allowlist 校验。

### Codex CLI：本机开发模式

```bash
AISTU_AI_PROVIDER=codex pnpm dev
```

Main 使用受控参数调用本机 Codex CLI。Renderer 不能指定命令、目录或 flags。

可选配置：

| 环境变量 | 用途 |
| --- | --- |
| `AISTU_CODEX_PATH` | 覆盖自动解析结果，显式指定 Codex 可执行文件 |
| `AISTU_CODEX_TIMEOUT_MS` | 请求超时，运行时限制在 15–600 秒 |

Main 会先检查当前进程的 `PATH`；macOS 图形界面启动未继承终端 `PATH` 时，还会通过
受限的登录 shell，以及已安装 ChatGPT 应用的 bundle ID 查询 Codex 的实际路径。
仍可用以下方式显式覆盖自动解析结果：

```bash
AISTU_CODEX_PATH="$(command -v codex)" pnpm dev
```

### Demo：离线与确定性流程

```bash
AISTU_AI_PROVIDER=demo pnpm dev
```

Demo Provider 用于截图、稳定 E2E 和不依赖网络的演示。它不能作为真实模型质量证明。

### 新增其他 Provider

新增 Provider 必须：

- 实现在 Main；
- 复用统一流事件与 TutorCommand；
- 不把厂商事件、密钥或网络客户端暴露给 Renderer；
- 通过现有引用 allowlist 与 Zod 输出校验；
- 为取消、错误和超时增加测试。

## 4. 知识库与快照

权威知识内容是仓库内的长期资产，位于独立内容域：

```text
content/ods-material/knowledge_base
```

开发环境默认直接读取它；只有开发或 CI 需要验证其他副本时才显式覆盖：

```bash
AISTU_KNOWLEDGE_BASE_PATH=/path/to/knowledge_base pnpm dev
```

运行时代码不能写死本机绝对路径。

首次维护或验证知识内容前创建本地 Python 环境：

```bash
pnpm setup:knowledge
pnpm test:knowledge
pnpm validate:knowledge
```

桌面发布包只携带：

```text
apps/desktop/resources/knowledge_base/rag/chunks.jsonl
```

刷新和检查：

```bash
pnpm sync:knowledge
pnpm check:knowledge-snapshot
```

不要把 authoring 草稿、审查报告、Prompt 或知识维护脚本复制进桌面包。知识内容的
新增、发布和审核在仓库内的独立内容域完成；桌面运行时只消费经过校验的派生快照。
完整流水线见
[`../../content/ods-material/knowledge_base/README.md`](../../content/ods-material/knowledge_base/README.md)。

## 5. 代码落点

| 改动 | 首选位置 |
| --- | --- |
| IPC 协议、跨进程类型、持久化 Schema | `packages/contracts` |
| 知识 JSONL 解析、token 化、BM25 | `packages/knowledge-runtime` |
| Provider、知识文件、窗口、安全、持久化 | `apps/desktop/src/main` |
| 最小领域桥接 | `apps/desktop/src/preload` |
| 页面、路由、桌面交互 | `apps/desktop/src/renderer` |
| 对话编排、TutorCommand、演示场景 | `packages/tutor-runtime` |
| 注册、session、patch、lazy load | `packages/visualization-runtime` |
| 课件专属 Schema、步骤、组件 | `packages/lessons/<lesson>` |
| 多课件共享 UI 原语 | `packages/ui` |

不要把 Electron、文件读取或 Provider 客户端放进纯 runtime 包。不要让课件包管理
桌面路由、窗口或持久化。

## 6. 常见改动流程

### 新增或修改 IPC

1. 先在 `packages/contracts` 定义严格请求、响应和通道；
2. 在 Main handler 中再次解析输入并验证 sender；
3. 在 Preload 暴露具体领域方法，不暴露通用 `invoke`；
4. Renderer 只使用 `window.aistu.<domain>`；
5. 添加 contracts、Main 和必要 E2E 测试；
6. 更新 `ARCHITECTURE.md` 中当前 API 列表。

### 修改 Renderer 状态

1. 确定状态属于 conversation、visualization、application UI、course profile
   还是 community；
2. 避免把所有字段放入单体 store；
3. 需要跨进程持久化时先更新共享 Schema 与迁移；
4. 保持 `visualizationStore.activeSession | null`；
5. 验证会话切换、重启恢复和旧数据迁移。

### 新增 Provider

1. 实现统一 Provider 接口；
2. 把原始输出归一化为受控流事件；
3. 校验结构化计划、命令和 citation allowlist；
4. 覆盖取消、超时、格式错误与无知识匹配；
5. 不修改 Renderer 协议或引入 Provider 专属 UI。

### 新增课件

遵循 [`LESSON_DEVELOPMENT.md`](LESSON_DEVELOPMENT.md)。重点不是先写 JSX，而是先
确认核心教学问题、真实 `concept_id`、允许场景、状态序列和独立审核人。

## 7. 代码与文案约定

- TypeScript strict；避免 `any`；
- 跨进程数据可序列化且经过 Zod；
- 动画使用 `motion/react`；
- AI 文本通过 React 语义节点渲染受限 Markdown；
- 不使用 `dangerouslySetInnerHTML` 渲染模型或社区文本；
- UI 不出现 Agent 注释、Schema、测试说明或维护者范围解释；
- 本机路径、密钥与完整环境不能进入 Renderer 或日志；
- 不为未来可能性提前引入大型框架。

## 8. 常用脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动桌面开发环境 |
| `pnpm typecheck` | 递归运行 package typecheck |
| `pnpm lint` | 检查整个仓库 |
| `pnpm docs:check` | 检查 Markdown 标题、代码块与本地链接 |
| `pnpm test` | 运行全部 Vitest |
| `pnpm test:watch` | Vitest watch |
| `pnpm test:e2e:sidebar` | 侧边栏轻量 smoke |
| `pnpm test:e2e:golden` | 黄金教学闭环 |
| `pnpm test:e2e` | 全部 Electron E2E |
| `pnpm build` | 构建 workspace |
| `pnpm setup:knowledge` | 创建知识维护 Python 环境 |
| `pnpm test:knowledge` | 运行标准知识库测试 |
| `pnpm validate:knowledge` | 验证知识、关系与派生产物 |
| `pnpm sync:knowledge` | 同步桌面运行时知识快照 |
| `pnpm package:dir` | 生成未安装 macOS app 目录 |
| `pnpm package` | 生成发行产物 |
| `pnpm acceptance:mac` | 完整 macOS 集成验收 |

如何按风险选命令见 [`TESTING.md`](TESTING.md)。

## 9. Git 与文档

- 未经用户当前任务明确许可，不执行 add、commit 或 push；
- 不覆盖工作树中的其他修改；
- 一个 commit 只聚焦一件事；
- 长期产品决策更新 `PRODUCT_DIRECTION.md`；
- 当前范围更新 `CURRENT_SCOPE.md`；
- 架构事实更新 `ARCHITECTURE.md`；
- 完成度和阻塞更新 `ROADMAP.md`；
- 需要保存权衡时新增 ADR；
- 完整规则见 [`../AGENT_GIT_RULES.md`](../AGENT_GIT_RULES.md)。
