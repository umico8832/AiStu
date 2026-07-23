# Kaleidoscope 桌面 MVP 路线图

## 1. 当前真实状态

桌面 MVP 已于 2026-07-24 完成实现和本机验收。当前注册的调用栈课件状态为
`review_pending`；它尚未绑定 ODS `concept_id`，这符合现有知识库事实。

已通过的质量门：

- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`：5 个测试文件、15 个测试
- [x] `pnpm test:e2e`：Electron 黄金流程
- [x] `pnpm build`
- [x] `pnpm package:dir`
- [x] `pnpm package`：macOS arm64 `.app`、`.dmg`、`.zip`
- [x] 打包应用本机启动
- [x] Electron Fuses 状态检查
- [x] 本地临时签名完整性检查

正式对外分发仍需要 Apple Developer ID 签名和公证；这不影响本机 MVP 验收。
开发期 Provider 已调整为本机 Codex CLI；它复用本机登录，以 ephemeral、只读
sandbox 和严格输出 Schema 运行。正式商业 Provider 目标为 DeepSeek API，当前
暂不产生其调用费用。本地演示 Provider 继续覆盖可复现的完整交互流程。

## 2. 已完成范围

### 项目基线

- [x] pnpm workspace、锁文件、Node.js 24 约束和固定工具链版本
- [x] `apps/desktop`
- [x] `packages/contracts`
- [x] `packages/tutor-runtime`
- [x] `packages/visualization-runtime`
- [x] `packages/lessons/call-stack`
- [x] `packages/ui`
- [x] TypeScript strict、ESLint、Vitest、Playwright

### Electron 安全边界

- [x] 单 BrowserWindow
- [x] `nodeIntegration: false`
- [x] `contextIsolation: true`
- [x] `sandbox: true`
- [x] 最小 `contextBridge` API
- [x] Renderer 无 Node 权限的 Playwright 断言
- [x] CSP、导航和新窗口拦截
- [x] 权限默认拒绝
- [x] IPC sender 与 Zod 输入校验
- [x] 应用自有 `kaleidoscope://app` 协议
- [x] asar 与 Electron Fuses 发布加固

### 对话和 Provider

- [x] 对话首页、空状态、消息列表和输入草稿
- [x] 流式回答、发送、停止、重试与错误状态
- [x] 独立 conversation / visualization / application UI store
- [x] 版本化最小会话持久化
- [x] 本地确定性演示 Provider
- [x] 受控的本机 Codex CLI Provider
- [x] Codex 输出 Schema 校验和 TutorCommand 归一化
- [x] ChatGPT 网页人工转接边界说明
- [ ] 正式 DeepSeek API Provider
- [x] 凭据只存在于 Main
- [x] 文字流和结构化 TutorCommand 分离

### 调用栈课件和可视化运行时

- [x] 等价迁移原型组件、动画、静态步骤和教学逻辑
- [x] 统一为 `motion/react`
- [x] reduced-motion
- [x] 只读代码面板
- [x] 前进、后退、重置和受控/非受控状态
- [x] 课件专属 session spec 和 patch operation Schema
- [x] 静态注册表、lazy import、未知 ID 拒绝
- [x] 文本、数值、步骤和版本上限
- [x] session ID、revision 和过期补丁拒绝
- [x] 非法 spec 安全回退
- [x] 错误边界

### 对话上的单一可视化

- [x] 对话保持 mounted 的 overlay/workspace
- [x] 任意时刻只保存一个 `activeSession`
- [x] 同课件更新和不同课件原子替换
- [x] 焦点管理、焦点陷阱和 Escape 关闭
- [x] 关闭后保留对话、草稿和原位置
- [x] step、预测、完成和关闭事件回流 Tutor
- [x] AI 根据安全字段打开或调整当前课件

## 3. MVP 验收证据

Playwright 黄金流程覆盖：

```text
空对话首页
→ 选择递归困惑示例
→ 本地 Provider 流式回答
→ 打开已注册调用栈课件
→ 校验 Renderer 无 process/require
→ 推进教学步骤
→ 关闭课件
→ 原用户消息和 AI 回答仍在同一会话
```

发布产物：

```text
release/mac-arm64/Kaleidoscope.app
release/Kaleidoscope-0.1.0-arm64.dmg
release/Kaleidoscope-0.1.0-arm64-mac.zip
```

界面验收图：

```text
artifacts/kaleidoscope-mvp-actual.png
artifacts/kaleidoscope-mvp-showcase.png
```

## 4. 下一阶段

按优先级评估：

1. 使用本机 Codex Provider 进行教学质量和异常流人工验收；
2. 接入 DeepSeek API，并保持同一 Provider/TutorCommand 边界；
3. 配置 Developer ID、签名、公证和正式应用图标；
4. 完成调用栈课件内容审查后再决定是否标记 `reviewed`；
5. 建立 KnowledgeService 并接入真实 ODS 知识点；
6. 逐个新增经过审查的可视化课件；
7. 再评估 RAG、长期学习状态和自动复习。

继续禁止 Monaco、Tree-sitter、node-pty、终端、用户代码编辑和 AI 动态执行页面源码。
