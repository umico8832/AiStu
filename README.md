# Kaleidoscope

Kaleidoscope 是一个面向计算机学习的桌面端 AI 教学环境。

当前 MVP 的核心是：

```text
AI 对话首页
→ 理解用户困惑
→ 选择已有可视化
→ 生成受约束的场景参数
→ 显示建议卡并等待用户确认
→ 在应用内渲染课件
→ 用户完成交互
→ 返回同一对话继续教学
```

AI 不在运行时生成或执行新的 React 页面源码。用户不能修改课件中的代码。
AI 选择新课件后只会显示建议卡；只有用户明确点击确认才会打开，课件交互也不会
自动伪装成用户消息发送。
应用任意时刻只显示一个活动可视化页面；用户继续表达困惑时，AI 通过经过校验的
结构化补丁调整当前页面，或用另一项已注册可视化替换它。

## 当前状态

- 核心桌面 MVP 已实现，项目仍在继续增加黑客松展示功能；
- 开发和最终演示默认使用已登录的本机 Codex CLI（GPT）代答；
- DeepSeek API 留到现有功能稳定后再评估，不阻塞当前开发；
- 本地确定性演示 Provider 继续用于离线测试和端到端验收；
- Main 进程已接入本地 ODS RAG chunks，使用轻量关键词/BM25 检索为教学回答提供依据；
- macOS 包携带经过校验的知识库运行时快照，不依赖开发机的相邻知识库目录；
- 知识库引用会经过当前检索结果校验并显示在回答下方；无匹配时会明确提示，不伪造来源；
- React 调用栈课件已迁入 workspace，并统一使用 `motion/react`；
- 第一批 ODS 课件已实现：ArrayStack 按位插入、ArrayQueue 循环数组、
  DualArrayDeque 再平衡；
- 当前共有 4 个已注册可视化，均支持步骤控制、预测交互和安全场景参数；
- 对话、课件与应用 UI 使用独立 Zustand store；
- 可视化只通过静态注册表和经过 Zod 校验的 spec/patch 运行；
- 任意时刻只有一个 `activeSession`，关闭后回到原对话；
- typecheck、lint、Vitest、Playwright、build 与 electron-builder 均已通过；
- macOS arm64 的 `.app`、`.dmg` 和 `.zip` 已生成并完成本机启动验证。
- macOS 与 Windows 分别使用符合平台光学尺寸的 ICNS/ICO 图标资源。

## 现有原型

```text
call-stack-visualizer/
```

桌面开发应迁移复用，不要重写。

## 文档入口

1. [Agent 工作规则](AGENTS.md)
2. [文档索引](docs/README.md)
3. [产品方向](docs/PRODUCT_DIRECTION.md)
4. [桌面 MVP 范围](docs/MVP_SCOPE.md)
5. [桌面架构](docs/ARCHITECTURE.md)
6. [实施路线图](docs/ROADMAP.md)

## 黑客松交付

最终在 GitHub Release 发布 macOS arm64 `.dmg` 和 `.zip`，并录制核心教学闭环的
演示视频。Developer ID 签名、公证、Windows 发布、商业级监控和真实逐 token 流式
输出不阻塞黑客松交付。

项目在发布前仍会继续增加经过范围确认的功能。当前四项课件保持
`review_pending`；专门的多 Agent 知识与课件审查机制保留为后续待办，在审查完成前
不自行标记 `reviewed`。DeepSeek Provider 也在后续评估，不改变现有 Renderer 和
TutorCommand 边界。

## 本地运行

```bash
pnpm install
pnpm dev
```

默认通过 `codex exec` 复用本机已经登录的 Codex。它在空临时目录、只读 sandbox
和 ephemeral 模式下运行，shell、浏览器、网页搜索、MCP/插件和多 Agent 工具均被
禁用，并且输出必须符合 Tutor JSON Schema。开发环境会自动查找相邻
`ods-material/knowledge_base`，也可用 `KALEIDOSCOPE_KNOWLEDGE_BASE_PATH`
显式指定知识库目录。按照
[`./.env.example`](.env.example) 配置 CLI 路径或切换到离线 `demo`。

ChatGPT 网页版仅作为开发期人工转接备用：复制问题与 Tutor 约束到网页，取得回复后
再回填。应用不抓取网页、不复用浏览器 Cookie，也不把网页会话伪装成 API。

完整质量门：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm package
```

刷新知识快照并执行 macOS 黑客松验收：

```bash
pnpm sync:knowledge
pnpm acceptance:mac
```
