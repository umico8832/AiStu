# 黑客松第 0 段：工程基线

## 1. 状态

第 0 段于 2026-07-25 完成。

本段只锁定、复验和记录现有工程底座，不实现多视角知识、个人知识万花筒或社区
功能。后续阶段必须建立在本基线上，不得以新增黑客松展示功能为由放宽安全边界。

审计开始时：

- Git 分支：`main`
- 被审计代码提交：`08ec7afe2b496899adc42e80f531396e32438461`
- 工作树：干净
- Node.js：`22.21.0`
- pnpm：`11.9.0`

## 2. 本轮重新验证的质量门

以下命令均在本轮实际执行并通过：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm check:knowledge-snapshot
pnpm test:e2e
pnpm package:dir
pnpm verify:mac-package
pnpm smoke:mac-package
```

验证结果：

- TypeScript strict 检查通过；
- ESLint 通过；
- Vitest：10 个测试文件、37 个测试通过；
- Playwright Electron：侧边栏 smoke 与黄金流程共 2 条通过；
- 知识库运行时快照为最新状态，共 120 个 chunks；
- Electron production build 通过；
- macOS arm64 未安装目录打包通过；
- 打包应用包含与源码快照一致的 120 个知识 chunks；
- 打包应用进程启动 smoke 通过；
- 本机没有可用 Developer ID，因此正式签名和公证仍不是当前阻塞项。

后续可以使用以下聚合命令重复执行同等级 macOS 验收：

```bash
pnpm acceptance:mac
```

## 3. 已确认的产品与架构基线

### 对话与可视化

- 首页是 AI 对话页面；
- 新课件先显示建议卡，用户明确确认后才创建 session；
- 任意时刻只保存一个 `activeSession`；
- 同课件通过受限 patch 更新，不创建第二个页面；
- 不同课件原子替换当前 session；
- 课件事件作为结构化事件记录，不伪装成用户消息；
- 关闭课件后原对话和输入状态保持。

### 可视化资源

当前静态注册 4 项课件：

1. 调用栈；
2. ArrayStack 按位插入；
3. ArrayQueue 循环数组；
4. DualArrayDeque 再平衡。

四项均为 `review_pending`。调用栈不绑定伪造的 ODS `concept_id`；三项 ODS
课件绑定真实知识点。后续只有经过独立知识和教学审查，才能标记为 `reviewed`。

### AI 与知识边界

- AI 文本和 TutorCommand 分离；
- AI 只能选择已注册课件并生成通过 Schema 的数据；
- 未知课件、非法 spec、非法 patch 和过期 revision 会被拒绝或安全降级；
- Main-only KnowledgeService 读取并检索知识快照；
- 引用只能来自本轮候选 chunk allowlist；
- 未匹配知识明确降级，不能伪造来源。

### Electron 安全边界

- `nodeIntegration: false`；
- `contextIsolation: true`；
- `sandbox: true`；
- preload 只暴露 `chat` 与 `persistence` 领域 API；
- IPC handler 同时校验输入和 sender；
- 权限默认拒绝；
- 非白名单导航和新窗口被拦截；
- Renderer 不执行 AI 生成的代码或 HTML。

## 4. 黄金流程回归清单

自动化黄金流程已经覆盖：

```text
空对话首页
→ 选择递归困惑
→ 流式回答
→ 显示课件建议卡
→ 拒绝后保持关闭
→ 再次请求并确认
→ 打开调用栈课件
→ 校验 Renderer 无 process/require
→ 完成步骤且不自动生成用户消息
→ 关闭课件并保留原对话
→ 依次打开三项 ODS 课件
→ 重启并恢复对话与活动课件
```

后续每一段开发至少运行 `pnpm typecheck`、`pnpm lint`、`pnpm test` 和
`pnpm build`。修改 Electron、持久化、路由、课件容器或打包配置时，还必须运行
`pnpm acceptance:mac`。

## 5. 第 0 段发现的剩余工作

以下项目仍未完成，不得写成最终交付已完成：

- 面向真实学生问题的演示场景包已实现，但仍需人工走查和录制演示；
- 黑客松视觉、品牌和 CSS 动效增量已实现，但仍需完成最终视频素材；
- 四项课件的独立知识与教学审查；
- 最终 GitHub Release 和演示视频。

第 1—3 段已在基线复验后实现：多视角知识万花筒、独立用户学习事件与个人知识
万花筒、本地社区投稿审核和学校社区最小闭环。它们仍需经过后续全链路验收。

旧 MVP 文档曾把社区和用户学习状态整体排除。根据当前黑客松明确要求，范围已调整
为：实现本地、受控、可演示的最小闭环；云端实时多人社区、商业级掌握度系统和
未经审核内容自动进入权威知识库仍不在当前范围。

## 6. 已知非阻塞提示

`electron-builder` 当前会提示：

- `apps/desktop/package.json` 缺少 author；
- 部分 workspace 依赖存在重复引用提示；
- 本机没有有效 Developer ID。

这些提示没有阻止本轮打包、完整性验证或启动 smoke。前两项在最终发布整理阶段
复核；Developer ID 签名和公证不作为黑客松交付阻塞项。
