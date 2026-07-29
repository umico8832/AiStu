# AiStu Agent Git 规则

> 状态：强制规则
> 最近复核：2026-07-25

本文只约束 AI Agent 的 Git 行为。一般开发流程见
[`guides/DEVELOPMENT.md`](guides/DEVELOPMENT.md)。

## 1. 授权边界

- 未经用户当前任务明确许可，不执行 `git add`、`git commit` 或 `git push`；
- 历史任务中的许可不能沿用到当前任务；
- 用户只要求建议 commit message 时，不实际提交；
- 不因“流程通常需要”而推断提交、开分支、合并或发布授权；
- 只读命令如 `git status`、`git diff`、`git log` 可以用于理解工作树；
- push、force push、rebase、reset、历史改写、删除分支或 tag 必须得到单独明确授权。

## 2. 保护现有修改

- 修改前检查 `git status`；
- 用户已有改动默认属于用户，保留并绕开；
- 不为清理工作树删除、回滚、覆盖或暂存无关文件；
- 无法可靠区分本轮与既有修改时，停止提交并说明；
- 遇到 merge/rebase conflict 时先报告文件与冲突性质，不自行选择一边覆盖；
- 禁止未授权使用 `git reset --hard`、`git clean` 或强制推送。

## 3. 提交前检查

只有获得提交授权后，才执行：

1. 确认本轮修改范围；
2. 执行适用测试、构建与文档检查；
3. 同步相关核心文档；
4. 检查 `git diff` 与 `git status`；
5. 排除无关文件与敏感数据；
6. 只 stage 本轮文件；
7. 创建一个聚焦 commit；
8. 在结果中说明验证、未验证项和风险。

禁止提交：

- `.env` 和真实密钥、Token、Cookie、密码；
- 个人隐私和机器私有配置；
- `node_modules/`、缓存、日志与非预期构建产物；
- 与本轮任务无关的用户修改。

## 4. Commit message

格式：

```text
<type>(<可选作用域>): <中文简短描述>
```

允许的 `type`：

- `feat`
- `fix`
- `docs`
- `style`
- `refactor`
- `perf`
- `test`
- `chore`
- `ci`
- `security`

要求：

- 使用中文描述实际改动；
- 一次提交只表达一件事；
- 避免 `wip`、`fix bug`、`修改文件` 等无信息文本；
- 需要关联 issue 时在正文使用 `Closes #42`。

示例：

```text
docs: 重构开发文档体系
feat(course): 增加专项学习入口
fix(visualization): 拒绝过期课件补丁
```

## 5. 分支、历史与远端

- 创建分支前确认当前分支、工作树和用户意图；
- 默认分支前缀遵循运行环境约定；
- merge、rebase、cherry-pick、revert 前说明影响并等待确认；
- 不自动创建 PR 或 GitHub Release；
- 远端失败时先分析身份、分支保护或网络原因，不盲目重复；
- 发布操作同时遵守 [`guides/RELEASE.md`](guides/RELEASE.md)。
