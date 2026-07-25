# 测试与验证指南

> 状态：活跃指南
> 最近复核：2026-07-25

验证强度由改动风险决定。单一测试层不能证明整个 Electron 应用安全或可发布。

## 1. 测试层级

| 层级 | 主要覆盖 | 典型位置 |
| --- | --- | --- |
| 类型与 lint | 跨包类型、未使用代码、React Hooks 与静态约束 | 全仓库 |
| Vitest 纯逻辑 | Schema、检索、Tutor、session、patch、store、迁移 | `packages/**/test`、`apps/**/*.test.*` |
| 组件测试 | 消息渲染、课件状态、独立窗口内容与用户交互 | 邻近组件测试 |
| Playwright Electron | 跨进程用户流程、窗口状态和 Renderer 安全 smoke | `e2e/` |
| 构建 | Vite/Electron 生产构建与包依赖 | workspace scripts |
| 打包 smoke | 知识快照、Fuses、asar、可执行文件与应用启动 | `scripts/` |
| 人工验收 | 真实 Provider、视觉、焦点、动画、窗口尺寸和教学质量 | 发布候选 |

Playwright Electron 当前是实验能力，只承担关键集成流程，不是唯一安全证明。

## 2. 基础命令

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

常用细分：

```bash
pnpm test:watch
pnpm test:e2e:sidebar
pnpm test:e2e:golden
pnpm test:e2e
pnpm test:knowledge
pnpm validate:knowledge
pnpm check:knowledge-snapshot
pnpm package:dir
pnpm verify:mac-package
pnpm smoke:mac-package
pnpm acceptance:mac
```

## 3. 改动—验证矩阵

| 改动类型 | 最低验证 |
| --- | --- |
| 纯文档 | `pnpm docs:check`，并检查职责归属、过期状态与相互矛盾表述 |
| 纯类型或 Schema | `typecheck`、相关 Vitest、`lint` |
| 纯函数或 runtime | 相关 Vitest、`typecheck`、`lint` |
| React UI 或 store | 相关组件/store 测试、`typecheck`、`lint`、`build` |
| 对话、会话或持久化 | 全部 Vitest、相关 E2E、`build` |
| IPC、Preload、Main 安全 | 全部基础质量门、相关 E2E、打包 smoke |
| 课件 Schema 或步骤 | 课件模型/组件测试、注册表测试、`build`、人工教学检查 |
| 课件窗口、路由或焦点 | 相关 E2E、全屏、缩放与键盘人工检查 |
| 知识内容、快照或课程装配 | `test:knowledge`、`validate:knowledge`、`check:knowledge-snapshot`、课程 E2E、包验证 |
| Electron 或打包配置 | `acceptance:mac` 与人工启动 |
| 发布候选 | 完整质量门、全 E2E、知识同步、打包、smoke、人工黄金流程 |

修复缺陷时应优先添加能在修复前失败的最小回归测试。

## 4. 关键自动化场景

### 侧边栏 smoke

`pnpm test:e2e:sidebar` 只验证导航展开、焦点与 Escape，不应创建或发送对话消息。

### 黄金教学流程

`pnpm test:e2e:golden` 至少覆盖：

```text
空对话
→ 发送递归困惑
→ 流式回答
→ 建议卡先拒绝
→ 再确认打开调用栈
→ 验证 Renderer 无 process/require
→ 完成步骤且没有自动用户消息
→ 关闭课件并保留对话
→ 验证其他首批课件
→ 重启并恢复状态
```

### 课程与可读性

全量 `pnpm test:e2e` 还应覆盖课程专项、历史会话、侧边栏和导师文本可读性。新增
高价值用户流程时加入独立 spec，不把所有断言堆进黄金流程。

## 5. 安全验证

至少组合验证：

- Renderer 中 `process` 与 `require` 不可用；
- `window.kaleidoscope` 只暴露登记的领域 API；
- Main 窗口选项保持安全默认值；
- IPC 输入与 sender 均校验；
- 权限默认拒绝，导航和新窗口受控；
- AI、知识与社区文本不执行 HTML 或脚本；
- 未知课件、非法 spec/patch 与伪造引用安全失败；
- 打包应用保持协议、Fuses 和知识快照完整。

静态源码断言、Vitest、Playwright 和打包 smoke 应相互补充。

### 安全边界分层说明

- **Renderer 无 Node / 最小 Preload**：由 Playwright E2E 断言（`golden-flow.spec.ts`
  中 `typeof require === "undefined"` 与 `window.kaleidoscope` 键集合检查）。
- **Patch 生命周期（合法 patch、越界/过期 patch 拒绝）**：由 Vitest
  单元测试完整覆盖（`visualization-runtime/test/runtime.test.ts`），不重复
  在 Playwright 中构造。

## 6. 课件验证

每项课件至少验证：

- 默认 spec 成功、未知字段与越界输入失败；
- 所有允许场景真实改变模型和画面；
- 初始、每一步、最终和回退状态正确；
- 预测题只有一个明确正确答案；
- 重试次数和结构化事件如实记录；
- 上一步、下一步、重置和受控状态稳定；
- reduced-motion 不丢失信息；
- 键盘、可见焦点、语义标签和 44px 操作目标；
- 注册 ID、版本、真实 `concept_id` 与懒加载入口；
- 独立教学审查结果与注册状态一致。

完整流程见 [`LESSON_DEVELOPMENT.md`](LESSON_DEVELOPMENT.md)。

## 7. 人工验收

发布前至少人工检查：

- 全新用户数据目录；
- DeepSeek、Codex 与 Demo 三种 Provider 的预期行为；
- 窄窗口、常规窗口和缩放；
- 键盘导航、焦点返回和 Escape；
- reduced-motion；
- 长消息、错误、取消、重试和无知识匹配；
- 拒绝课件、非法课件、替换当前课件和关闭恢复；
- 社区错误绑定与危险文本；
- 打包应用而非只检查开发窗口。

## 8. 验证证据

带日期报告至少记录：

- 被验证的 commit；
- OS、架构、Node 和 pnpm；
- 实际执行的命令；
- 通过、失败与跳过；
- 产物路径或校验值；
- 非阻塞警告和已知限制。

旧报告不回写为新状态。新 commit 需要新报告或在 `ROADMAP.md` 明确说明仍待复验。
