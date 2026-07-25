# 桌面运行时知识快照

本目录只保存随桌面应用打包的 RAG 运行时快照。权威知识库位于仓库内独立维护的
`content/ods-material/knowledge_base` 内容域；这里的 JSONL 是派生数据，不是
authoring 来源。

从仓库根目录刷新和检查：

```bash
pnpm sync:knowledge
pnpm check:knowledge-snapshot
```

规则：

- 快照可以包含多门课程与多个 concept 命名空间；
- Main 负责读取、解析和校验，Renderer 不直接访问文件；
- 不手工编辑派生 `rag/chunks.jsonl`；
- 不向桌面包添加 authoring 草稿、审查报告、Prompt 或知识维护脚本；
- 知识内容的审核状态不能由桌面代码或快照同步流程改变。

完整边界见
[`../../../../docs/ARCHITECTURE.md`](../../../../docs/ARCHITECTURE.md#10-知识快照)，
操作流程见
[`../../../../docs/guides/DEVELOPMENT.md`](../../../../docs/guides/DEVELOPMENT.md#4-知识库与快照)。
