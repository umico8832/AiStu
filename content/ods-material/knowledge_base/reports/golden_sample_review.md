# 第 2 章黄金样本内部抽查

抽查时间：2026-07-24（Asia/Shanghai）

## 审查边界

本次为生产者侧人工抽查，目的是发现粒度、来源覆盖、自包含性和明显技术错误。
它不等于独立外部 AI 审查，不能把 `quality.status` 从 `review_pending` 改为
`reviewed`。

## 抽查结果

|知识点|覆盖类型|抽查结论|
|---|---|---|
|`ods-array-size-capacity`|基础概念|size/capacity 区分和不变量与源记录一致，问题边界单一。|
|`ods-arraystack-random-access`|基础算法|逻辑下标到 `a[i]` 的映射、get/set 返回行为和 O(1) 结论一致。|
|`ods-arraystack-insertion`|算法|右移方向、容量检查、写入顺序与 $O(n-i)$ 结论一致。|
|`ods-arraystack-removal`|算法|左移、n 递减、低占用触发 resize 与返回旧值均有来源支持。|
|`ods-arraystack-resize`|机制|`max(1,2n)`、复制有效区和 O(n) 成本均与伪代码一致。|
|`ods-arraystack-amortized-resize`|定理|明确区分单次最坏成本与操作序列摊还成本，未把 amortized 写成 worst-case。|
|`ods-fastarraystack-block-copy`|实现优化|只声明降低常数开销、不改变渐近复杂度，未把书中实测倍数推广为保证。|
|`ods-modular-array-indexing`|公式|余数定义、合法范围和循环下标用途正确；边界已提醒负数取模依赖语言。|
|`ods-arrayqueue-representation`|表示不变量|j、n 与 `(j+k) mod capacity` 的对应关系完整且不依赖缺失图片。|
|`ods-arrayqueue-resize`|状态变化|按逻辑顺序复制、线性化并令 j=0 的关键步骤完整。|
|`ods-arraydeque-nearest-end-shifting`|机制/复杂度|前缀与后缀二选一，搬移量界为 `min(i,n-i)`，粒度适合独立检索。|
|`ods-dualarraydeque-representation`|组合结构|front 逆序、back 正序及两种局部下标换算均与伪代码一致。|
|`ods-dualarraydeque-balance`|状态变化|三倍阈值、约对半重建与 O(n) 搬移准确，未与摊还结论混在同一知识点。|
|`ods-dualarraydeque-amortized-balance`|势能法|势能定义、重建后上界、单次变化和触发时下界形成完整论证链。|
|`ods-rootisharraystack-index-mapping`|公式/算法|块号 ceiling 公式、块内下标与 get/set 映射相互一致。|
|`ods-rootisharraystack-space`|空间分析|由收缩不变量推出 r=O(sqrt(n))，再合并末尾空位和块目录开销，推导完整。|
|`ods-array-layout-tradeoffs`|章节比较|已补充各结构定理记录作为直接来源，不再只依赖讨论段落进行跨结构综合。|

## 抽查发现与处理

- 初版 `ods-array-backed-storage` 未纳入原列表的 4 条 `list_item`；已补充来源映射。
- 初版 `ods-array-layout-tradeoffs` 的两个讨论段落不足以独立支持全部比较结论；
  已补充 ArrayStack、ArrayDeque、DualArrayDeque 和 RootishArrayStack 的定理记录。
- 公开版、RAG 和外部审查输入已在修复后全部重建。

## 尚未关闭的质量门

- 30 个知识点仍需第二个 AI 使用 `review/input/*.json` 独立评分。
- 中文术语表尚未形成跨章节规范，本章译名不能自动视为全书标准。
- 尚未运行真实向量/混合检索与 rerank；120 个 chunks 目前只验证了派生一致性，
  没有验证召回质量。
