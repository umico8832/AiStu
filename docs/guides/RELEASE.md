# macOS 发布指南

> 状态：活跃指南
> 最近复核：2026-07-25
> 当前黑客松目标：macOS arm64 `.dmg`、`.zip` 与演示视频。

## 1. 发布前条件

- 发布范围与 [`../MVP_SCOPE.md`](../MVP_SCOPE.md) 一致；
- [`../ROADMAP.md`](../ROADMAP.md) 没有未解释的 P0 阻塞；
- 工作树范围清楚，发布 commit 已确定；
- 不包含 `.env`、密钥、Cookie、Token 或机器私有配置；
- README、架构、范围和当前状态与实现一致；
- 发布说明明确签名、公证、Provider 和社区边界。

未经用户明确许可，Agent 不得自动 commit、push 或创建 Release。

## 2. 同步知识快照

权威知识库位于 `content/ods-material/knowledge_base`。准备发布时从仓库根目录执行：

```bash
pnpm test:knowledge
pnpm validate:knowledge
pnpm sync:knowledge
pnpm check:knowledge-snapshot
```

检查打包目录只包含运行时 `rag/chunks.jsonl`，不包含 authoring 草稿、审查材料、
Prompt 或知识维护脚本。

## 3. 质量门

发布候选至少执行：

```bash
pnpm typecheck
pnpm lint
pnpm docs:check
pnpm test
pnpm test:e2e
pnpm build
```

macOS 聚合验收：

```bash
pnpm acceptance:mac
```

该命令执行知识测试与校验、快照同步、文档检查、类型、lint、Vitest、E2E、
未安装目录打包、包完整性和启动 smoke。
如果聚合命令失败，应保留第一个真实失败原因，不要只重试到偶然通过。

## 4. 生成发行产物

```bash
pnpm package
```

当前预期产物：

```text
release/mac-arm64/Kaleidoscope.app
release/Kaleidoscope-0.1.0-arm64.dmg
release/Kaleidoscope-0.1.0-arm64-mac.zip
```

版本改变后文件名会随之变化，不应在脚本外把 `0.1.0` 当作永久常量。

## 5. 包验证

自动检查：

```bash
pnpm verify:mac-package
pnpm smoke:mac-package
```

必要时可通过环境变量覆盖非默认产物位置：

| 环境变量 | 用途 |
| --- | --- |
| `KALEIDOSCOPE_MAC_APP_PATH` | 指定 `.app` 供完整性检查 |
| `KALEIDOSCOPE_MAC_EXECUTABLE_PATH` | 指定可执行文件供启动 smoke |

验证内容至少包括：

- 应用能启动并正常退出；
- Electron 安全设置与开发版一致；
- 应用协议可加载 Renderer；
- asar 与 Electron Fuses 符合预期；
- 打包知识快照存在、可解析并与源码快照一致；
- 图标、名称、版本和 arm64 架构正确；
- Demo Provider 在无外部网络依赖时可走通黄金流程。

## 6. 人工发布验收

使用全新的 Electron `userData` 目录检查：

1. 空状态不滚动，发送后消息视口正常；
2. AI 回答与知识来源状态可读；
3. 课件建议可以拒绝，确认前不会打开；
4. 调用栈课件可推进、预测、关闭并返回原对话；
5. 新课件替换当前课件，不出现第二个活动 session；
6. 408 课程专项范围、课程起步引导和退出路径；
7. 社区投稿、错误绑定拒绝与审核状态；
8. 窄窗口、键盘、焦点和 reduced-motion；
9. 重启后会话、引用、草稿和允许的状态恢复。

演示步骤见
[`../delivery/HACKATHON_DEMO_SCRIPT.md`](../delivery/HACKATHON_DEMO_SCRIPT.md)。

## 7. GitHub Release

取得用户授权后：

1. 确认发布 commit 与 tag；
2. 上传 `.dmg` 和 `.zip`；
3. 记录产物 SHA-256；
4. 发布说明包含主要能力、运行要求、Provider 依赖和已知限制；
5. 提供演示视频链接；
6. 从另一台或全新用户环境下载并启动一次；
7. 在 `ROADMAP.md` 标记 Release 与视频完成，并新增带日期发布报告。

Release 说明不得声称：

- 已有 Developer ID 签名或公证，除非实际验证；
- 已支持 Windows 正式发布；
- 本地社区是云端多人系统；
- `review_pending` 知识已经完成人工学科审查；
- DeepSeek API 已接入，除非该发布确实包含。

## 8. 签名与非阻塞项

当前黑客松不以 Developer ID 签名、公证或 Windows 发布为阻塞项。本地临时签名、
包完整性与启动 smoke 仍需通过。将来启用正式签名时，应新增独立凭据管理、CI 和
公证文档，不能把证书或密码写入仓库。

## 9. 发布完成定义

- 自动质量门与打包验收全部通过；
- 人工黄金流程在最终产物上通过；
- Release 产物与明确 commit 对应；
- `.dmg`、`.zip` 与校验值可下载；
- 演示视频可访问；
- 已知限制完整、准确；
- `ROADMAP.md` 与新的发布报告已更新。
