# Kaleidoscope

Kaleidoscope 是面向计算机学习的桌面端 AI 教学环境。它把对话诊断、受审核知识、
结构化互动课件和学习事件放进同一条教学流程，而不是只输出一段长答案。

```text
提出困惑
→ AI 检索知识并选择已注册课件
→ 对话中显示课件建议
→ 用户确认后打开课件
→ 完成预测或操作
→ 结构化结果回到同一对话
```

AI 不生成或执行新的页面源码。课件来自本地静态注册表，场景参数与增量补丁必须
通过 Zod 校验；任意时刻只存在一个活动可视化 session。

## 当前状态

项目处于黑客松交付阶段，核心桌面闭环已经实现，最终 GitHub Release 与演示视频
仍待完成。当前工作树包括：

- Electron 主对话窗口、独立全屏课件窗口与安全的 Main / Preload / Renderer 分层；
- 多会话 AI 对话、流式状态、停止、重试和本地持久化；
- 仓库内长期知识资产、Main-only 本地检索、可验证引用与 676-chunk 打包快照；
- 408 数据结构课程页、专项学习范围、课程起步引导与思维导图；
- 按真实参与、知识接触和课件互动记录的课程学习足迹；
- 10 个已完成独立教学审查的注册课件；
- 用户确认门槛、单一活动课件、受限 patch 和结构化交互回流；
- 本地社区投稿、审核与全国考试目录；
- macOS arm64 构建、打包和启动验证流程。

准确的完成项、待办和最近验证记录以
[`docs/ROADMAP.md`](docs/ROADMAP.md) 为准。

## 快速开始

要求：

- Node.js `22.21.0` 或 `24.14+`；
- pnpm `11.9.0`；
- 使用默认 AI Provider 时，本机已安装并登录 Codex CLI。
- 维护知识库时使用 Python 3，并先运行一次 `pnpm setup:knowledge`。

```bash
pnpm install
cp .env.example .env
pnpm dev
```

默认开发模式复用本机 Codex CLI。离线、确定性的演示模式：

```bash
KALEIDOSCOPE_AI_PROVIDER=demo pnpm dev
```

标准知识库及其可复现来源、authoring、审查和流水线都保存在仓库内的
`content/ods-material/`。开发环境直接读取这份长期资产；也可以通过
`KALEIDOSCOPE_KNOWLEDGE_BASE_PATH` 临时覆盖。发布包只读取从它同步并校验过的运行时
快照，不依赖任何仓库外目录。

更完整的环境、Provider 与开发流程见
[`docs/guides/DEVELOPMENT.md`](docs/guides/DEVELOPMENT.md)。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动 Electron 开发应用 |
| `pnpm typecheck` | 检查 workspace TypeScript |
| `pnpm lint` | 运行 ESLint |
| `pnpm docs:check` | 检查 Markdown 标题、代码块与本地链接 |
| `pnpm test` | 运行 Vitest |
| `pnpm test:e2e` | 运行 Electron Playwright 流程 |
| `pnpm build` | 构建所有可构建包 |
| `pnpm setup:knowledge` | 创建知识维护环境并安装固定依赖 |
| `pnpm test:knowledge` | 运行标准知识库流水线测试 |
| `pnpm validate:knowledge` | 验证知识内容、关系与派生产物 |
| `pnpm sync:knowledge` | 刷新打包知识快照 |
| `pnpm check:knowledge-snapshot` | 检查快照是否与权威知识域同步 |
| `pnpm acceptance:mac` | 运行 macOS 集成验收 |

测试选择与发布步骤分别见
[`docs/guides/TESTING.md`](docs/guides/TESTING.md) 和
[`docs/guides/RELEASE.md`](docs/guides/RELEASE.md)。

## 仓库结构

```text
apps/desktop/                   Electron 主应用
packages/contracts/             跨进程协议与 Zod Schema
packages/knowledge-runtime/     本地知识检索纯逻辑
packages/tutor-runtime/         Tutor 命令与教学编排
packages/visualization-runtime/ 课件注册、session 与 patch 运行时
packages/lessons/               已注册 React 课件
packages/ui/                    共享 UI 原语
content/ods-material/            标准知识库、可复现来源、审查与维护流水线
docs/                           产品、架构、开发和交付文档
e2e/                            Electron Playwright 场景
scripts/                        快照、打包和验收脚本
```

## 文档入口

- [文档中心与阅读路径](docs/README.md)
- [产品方向](docs/PRODUCT_DIRECTION.md)
- [当前 MVP 范围](docs/MVP_SCOPE.md)
- [系统架构](docs/ARCHITECTURE.md)
- [当前路线图](docs/ROADMAP.md)
- [开发指南](docs/guides/DEVELOPMENT.md)
- [课件开发指南](docs/guides/LESSON_DEVELOPMENT.md)
- [标准知识库指南](content/ods-material/knowledge_base/README.md)

Agent 在本仓库工作前还必须阅读 [AGENTS.md](AGENTS.md)。未经用户当前任务明确许可，
不得自动提交或推送。
