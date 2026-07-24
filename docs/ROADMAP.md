# Kaleidoscope 桌面 MVP 路线图

## 1. 当前真实状态

核心桌面 MVP 已于 2026-07-24 完成实现和本机基线验收，项目仍处于黑客松持续开发
阶段，不代表最终功能冻结。当前共有 4 个已注册课件：
调用栈、ArrayStack 按位插入、ArrayQueue 循环数组和 DualArrayDeque 再平衡。
四项均为 `review_pending`；调用栈没有编造 ODS `concept_id`，三项 ODS 课件已在
桌面注册表绑定真实知识点。专门的多 Agent 知识与课件审查机制列为后续待办，审查
通过后再标记 `reviewed` 并回写知识库 authoring 绑定。

已通过的质量门：

- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`：10 个测试文件、37 个测试
- [x] `pnpm test:e2e:sidebar`：不发送对话的侧边栏 smoke
- [x] `pnpm test:e2e`：侧边栏 smoke 与 Electron 黄金流程
- [x] `pnpm build`
- [x] `pnpm package:dir`
- [x] `pnpm package`：macOS arm64 `.app`、`.dmg`、`.zip`
- [x] 打包应用本机启动
- [x] Electron Fuses 状态检查
- [x] 本地临时签名完整性检查
- [ ] 最终 GitHub Release
- [ ] 最终演示视频

黑客松最终只要求在 GitHub 发布可运行的 macOS arm64 程序并提供演示视频；
Developer ID 签名、公证、Windows 发布和商业级监控不作为阻塞项。
开发期 Provider 已调整为本机 Codex CLI；它复用本机登录，以 ephemeral、只读
sandbox 和严格输出 Schema 运行。DeepSeek API 留到现有功能稳定后再评估。本地
演示 Provider 继续覆盖可复现的完整交互流程。

## 2. 已完成范围

### 项目基线

- [x] pnpm workspace、锁文件、Node.js 22.21.0 约束和固定工具链版本
- [x] `apps/desktop`
- [x] `packages/contracts`
- [x] `packages/knowledge-runtime`
- [x] `packages/tutor-runtime`
- [x] `packages/visualization-runtime`
- [x] `packages/lessons/call-stack`
- [x] `packages/lessons/arraystack-insertion`
- [x] `packages/lessons/arrayqueue-representation`
- [x] `packages/lessons/dualarraydeque-balance`
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
- [x] 自定义 macOS ICNS、Windows ICO 与双平台开发图标
- [x] Electron Fuses `afterPack` 支持 macOS 与 Windows 可执行文件命名

### 对话和 Provider

- [x] 对话首页、空状态、消息列表和输入草稿
- [x] 空状态单屏化：两个快捷问题、无滚动，产生消息后再启用滚动
- [x] 正式软件图标触发的可折叠导航侧边栏、键盘焦点和 Escape 收起
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

### 本地知识库检索与引用

- [x] Main-only `KnowledgeService` 受控读取标准知识库
- [x] `rag/chunks.jsonl` 逐行解析与 Zod 校验
- [x] macOS 发布包携带 `rag/chunks.jsonl` 运行时快照
- [x] 中文 n-gram、英文 token 和轻量 BM25 检索
- [x] 每轮最多注入 3 个 concept、6 个 chunks
- [x] Codex Prompt 知识边界和 JSON Schema 引用约束
- [x] 引用 chunk ID allowlist 校验，拒绝伪造来源
- [x] `grounded` / `not_found` / `not_required` / `unavailable` 降级状态
- [x] 回答下方显示知识点标题与章节
- [x] 引用随对话消息持久化
- [x] 使用真实 Codex 对“size 与 capacity”完成有来源回答 smoke test

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

### 首批 ODS 可视化课件

- [x] ArrayStack 按位插入：容量检查、右到左搬移、写入与 size 更新
- [x] ArrayQueue 循环数组：队首 j、模映射、跨界回绕与 FIFO 顺序
- [x] DualArrayDeque 再平衡：三倍阈值、中点划分、front 逆序与 back 正序
- [x] 三项资源的严格场景 Schema、默认场景和受限 focus patch
- [x] 每项课件的前进、后退、重置、预测交互和 reduced-motion
- [x] 注册表稳定 ID、真实 conceptIds、懒加载和唯一性测试
- [x] Codex/演示 Provider 的课件选择与同页面更新工具

### 对话上的单一可视化

- [x] 对话保持 mounted 的 overlay/workspace
- [x] AI 课件建议卡与用户确认/拒绝门槛
- [x] 用户确认前不创建或替换活动 session
- [x] 任意时刻只保存一个 `activeSession`
- [x] 同课件更新和不同课件原子替换
- [x] 焦点管理、焦点陷阱和 Escape 关闭
- [x] 关闭后保留对话、草稿和原位置
- [x] step、预测、完成和关闭事件回流 Tutor
- [x] 课件事件只结构化记录，不自动伪装成用户消息发送
- [x] AI 根据安全字段打开或调整当前课件

## 3. MVP 验收证据

轻量侧边栏 smoke 独立覆盖，并且不会创建或发送任何对话消息：

```text
折叠导航 → 软件图标展开侧边栏 → Escape 收起
```

Playwright 黄金流程只在最终集成或发布验收时运行：

```text
空对话首页
→ 选择递归困惑示例
→ 本地 Provider 流式回答
→ 显示课件建议卡并验证“暂不”
→ 用户确认后打开已注册调用栈课件
→ 校验 Renderer 无 process/require
→ 推进并完成教学步骤，验证没有自动用户消息
→ 关闭课件
→ 原用户消息和 AI 回答仍在同一会话
→ 依次打开并验证三项 ODS 课件
→ 重启应用并恢复原对话和活动课件
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
artifacts/navigation-sidebar-expanded.png
```

## 4. 下一阶段

按优先级评估：

1. 继续实现已经确认的黑客松展示功能；
2. 使用本机 Codex Provider 进行教学质量和异常流人工验收；
3. 稳定 macOS 发布包、GitHub Release 说明和演示脚本；
4. 录制最终演示视频；
5. 建立专门的多 Agent 知识与课件审查机制，审查通过后标记 `reviewed` 并回写知识库绑定；
6. 扩充已发布 ODS 知识点和可视化，并持续评估检索质量；
7. 现有功能稳定后再评估 DeepSeek API，保持同一 Provider/TutorCommand 边界；
8. 后续再评估签名公证、embedding/向量检索、长期学习状态和自动复习。

继续禁止 Monaco、Tree-sitter、node-pty、终端、用户代码编辑和 AI 动态执行页面源码。
