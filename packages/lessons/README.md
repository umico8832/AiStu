# AiStu 互动课件

本目录是桌面应用中 React 教学课件的唯一代码归属地。课件共享
`@aistu/visualization-runtime` 和 `@aistu/ui`，不创建独立网页、
路由、Electron 窗口或构建系统。

完整的设计、Schema、步骤、测试、知识绑定与审核流程见
[`../../docs/guides/LESSON_DEVELOPMENT.md`](../../docs/guides/LESSON_DEVELOPMENT.md)。

## 当前包

| 包 | 教学目标 |
| --- | --- |
| `call-stack` | 递归调用栈的进入、等待、基例和逐层返回 |
| `arraystack-insertion` | 数组中间插入的容量检查与从右向左搬移 |
| `arrayqueue-representation` | 逻辑队列位置到循环数组物理下标的映射 |
| `dualarraydeque-balance` | 失衡阈值、逻辑顺序恢复和两侧重建 |
| `cs408-core-visualizations` | 树/图遍历、折半查找、AVL、KMP 与快速排序划分 |

## 必守边界

- 只接受通过课件专属 Zod Schema 的数据；
- 不执行 AI 生成的 React、JavaScript、HTML 或 CSS；
- 不读取文件、环境变量或 Provider 凭据；
- 不直接发送对话消息或推断用户掌握度；
- 不伪造 `concept_id`；
- 新资源默认 `draft` 或 `review_pending`；
- 只有独立教学审查通过后才能标为 `reviewed`；
- 课件事件必须是共享协议定义的可序列化结构化事件。

每项课件至少覆盖默认场景、全部允许分支、非法输入、逐步状态、最终结果、预测、
重置、reduced-motion、键盘和注册表一致性。
