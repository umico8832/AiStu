# Kaleidoscope

Kaleidoscope 是一个面向计算机学习的桌面端 AI 教学环境。

当前 MVP 的核心是：

```text
AI 对话首页
→ 理解用户困惑
→ 选择已有可视化
→ 生成受约束的场景参数
→ 在应用内渲染课件
→ 用户完成交互
→ 返回同一对话继续教学
```

AI 不在运行时生成或执行新的 React 页面源码。用户不能修改课件中的代码。
应用任意时刻只显示一个活动可视化页面；用户继续表达困惑时，AI 通过经过校验的
结构化补丁调整当前页面，或用另一项已注册可视化替换它。

## 当前状态

- 桌面 MVP 已实现，开发默认使用已登录的本机 Codex CLI 代答；
- 正式商业 Provider 目标为 DeepSeek API，当前为节省调用成本暂不启用；
- 本地确定性演示 Provider 继续用于离线测试和端到端验收；
- React 调用栈课件已迁入 workspace，并统一使用 `motion/react`；
- 对话、课件与应用 UI 使用独立 Zustand store；
- 可视化只通过静态注册表和经过 Zod 校验的 spec/patch 运行；
- 任意时刻只有一个 `activeSession`，关闭后回到原对话；
- typecheck、lint、Vitest、Playwright、build 与 electron-builder 均已通过；
- macOS arm64 的 `.app`、`.dmg` 和 `.zip` 已生成并完成本机启动验证。

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

## 当前下一步

MVP 后续优先补充本机 Codex 教学质量验收、Developer ID 签名与公证，
再接入正式 DeepSeek Provider，然后评估知识库接入和更多已审核课件。当前调用栈
课件保持 `review_pending`，没有为它编造 ODS `concept_id`。

## 本地运行

```bash
pnpm install
pnpm dev
```

默认通过 `codex exec` 复用本机已经登录的 Codex。它在空临时目录、只读 sandbox
和 ephemeral 模式下运行，shell、浏览器、网页搜索、MCP/插件和多 Agent 工具均被
禁用，并且输出必须符合 Tutor JSON Schema。按照
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
