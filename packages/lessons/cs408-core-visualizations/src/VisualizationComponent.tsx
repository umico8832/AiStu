import {
  VISUALIZATION_ID_CS408_AVL_ROTATION,
  VISUALIZATION_ID_CS408_BINARY_SEARCH,
  VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL,
  VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL,
  VISUALIZATION_ID_CS408_KMP_MATCHING,
  VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION,
  type VisualizationInteractionEvent,
} from "@kaleidoscope/contracts";
import { LessonFrame } from "@kaleidoscope/ui";
import {
  GitBranch,
  Network,
  RotateCw,
  ScanSearch,
  Search,
  Shuffle,
} from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import {
  binarySearchValues,
  getAvlLayout,
  getBinarySearchFrame,
  getTreeVisitedCount,
  graphTraversalFrames,
  graphTraversalOrders,
  kmpActivePatternIndexes,
  kmpOffsets,
  kmpPattern,
  kmpPrefix,
  kmpText,
  quickPartitionFrames,
  treeTraversalLabels,
  treeTraversalOrders,
  type AvlRotation,
  type GraphStrategy,
  type TreeTraversal,
} from "./models";
import {
  cs408CoreSessionSpecSchema,
  type Cs408CoreSessionSpec,
} from "./spec";

interface Props {
  sessionId: string;
  spec: unknown;
  state: { step: number; codeOpen: boolean };
  onStateChange: (state: { step: number; codeOpen: boolean }) => void;
  onInteraction: (event: VisualizationInteractionEvent) => void;
}

interface LessonStep {
  stage: string;
  title: string;
  description: string;
}

function interactionTimestamp(): number {
  return Date.now();
}

const fiveStepLessons: Record<
  Cs408CoreSessionSpec["visualizationId"],
  readonly LessonStep[]
> = {
  [VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL]: [
    {
      stage: "建立规则",
      title: "访问时机决定遍历名称",
      description: "先序先访问根，中序在左右子树之间访问根，后序最后访问根。",
    },
    {
      stage: "进入左子树",
      title: "递归问题缩小但规则不变",
      description: "每到一棵子树，都把它的根当成当前根重复同一规则。",
    },
    {
      stage: "预测暂停",
      title: "完成左子树后去哪里？",
      description: "看清当前递归层，而不是只背最终序列。",
    },
    {
      stage: "切换右子树",
      title: "回到父结点继续未完成部分",
      description: "栈中保存的返回位置决定接下来访问右子树或父结点。",
    },
    {
      stage: "比较四种序列",
      title: "同一棵树，不同访问时机",
      description: "层序遍历不依赖递归时机，而是使用队列逐层展开。",
    },
  ],
  [VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL]: [
    {
      stage: "初始化",
      title: "从 A 出发并立即标记 visited",
      description: "顶点进入待访问容器时就标记，避免同一顶点被重复加入。",
    },
    {
      stage: "展开邻接点",
      title: "BFS 使用队列，DFS 使用栈或递归",
      description: "容器的取出规则改变展开顺序，但不会改变可达顶点集合。",
    },
    {
      stage: "预测暂停",
      title: "下一个被展开的是谁？",
      description: "同时观察 visited 集合和队列头部，不要只看图形距离。",
    },
    {
      stage: "处理交叉边",
      title: "已访问顶点不会再次入队",
      description: "visited 是图遍历终止并避免重复工作的核心不变量。",
    },
    {
      stage: "完成遍历",
      title: "所有可达顶点恰好访问一次",
      description: "邻接表实现下，遍历时间为 O(|V|+|E|)。",
    },
  ],
  [VISUALIZATION_ID_CS408_BINARY_SEARCH]: [
    {
      stage: "建立区间",
      title: "答案只可能位于 [low, high]",
      description: "折半查找要求序列有序，区间外元素已经被证明不可能。",
    },
    {
      stage: "检查中点",
      title: "比较 target 与 a[mid]",
      description: "一次比较同时决定是否命中，以及应保留左半还是右半。",
    },
    {
      stage: "排除一半",
      title: "有序性提供排除证据",
      description: "更新边界时必须越过 mid，否则区间可能无法严格缩小。",
    },
    {
      stage: "继续折半",
      title: "候选区间严格变短",
      description: "每轮最多保留原候选区间的一半，因此比较次数为 O(log n)。",
    },
    {
      stage: "判断结果",
      title: "命中或 low > high",
      description: "查找失败不是猜测，而是候选区间已经为空的逻辑结论。",
    },
  ],
  [VISUALIZATION_ID_CS408_AVL_ROTATION]: [
    {
      stage: "定位失衡",
      title: "找到离插入点最近的失衡祖先",
      description: "只调整最小失衡子树，就能恢复整棵树的高度平衡。",
    },
    {
      stage: "判断方向",
      title: "失衡方向 + 较高孩子方向",
      description: "LL、RR 是同向失衡；LR、RL 是折线形失衡。",
    },
    {
      stage: "预测暂停",
      title: "新根应该是谁？",
      description: "旋转后的中间关键字成为局部根，才能同时保持 BST 次序。",
    },
    {
      stage: "执行旋转",
      title: "改变连接关系，不改变中序序列",
      description: "旋转必须同时恢复平衡因子和二叉搜索树的有序性。",
    },
    {
      stage: "复核不变量",
      title: "中序有序，高度差不超过 1",
      description: "结构变化后同时检查 BST 次序与 AVL 平衡条件。",
    },
  ],
  [VISUALIZATION_ID_CS408_KMP_MATCHING]: [
    {
      stage: "预处理模式串",
      title: "计算最长相等真前后缀",
      description: "前缀函数记录失配后仍可保留的匹配长度。",
    },
    {
      stage: "开始对齐",
      title: "文本指针 i 与模式指针 j 同步前进",
      description: "字符相等时，两根指针都向右移动。",
    },
    {
      stage: "发生失配",
      title: "i 不回退，j 按前缀函数回退",
      description: "文本下标保持在失配字符 d，模式从 j=4 回退到 j=2。",
    },
    {
      stage: "复用前缀",
      title: "把已知相等后缀当作新前缀",
      description: "回退后仍失配时继续缩短 j；文本指针始终没有向左移动。",
    },
    {
      stage: "完成匹配",
      title: "模式串全部字符匹配",
      description: "预处理与匹配总时间均为线性量级。",
    },
  ],
  [VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION]: [
    {
      stage: "选定枢轴",
      title: "暂存 pivot，留下一个可写空位",
      description: "本例取首元素为枢轴，左右指针从区间两端向中间移动。",
    },
    {
      stage: "右侧扫描",
      title: "从右向左寻找小于 pivot 的元素",
      description: "右侧已越过的元素都满足不小于枢轴。",
    },
    {
      stage: "左侧扫描",
      title: "从左向右寻找大于 pivot 的元素",
      description: "把找到的元素填入空位，空位随之转移到另一侧。",
    },
    {
      stage: "指针相遇",
      title: "左右未决区间缩为空",
      description: "相遇位置就是枢轴的最终位置。",
    },
    {
      stage: "放回枢轴",
      title: "左侧不大于 pivot，右侧不小于 pivot",
      description: "一次划分只确定枢轴位置，两侧子区间仍需递归排序。",
    },
  ],
};

const levelOrderLesson: readonly LessonStep[] = [
  {
    stage: "建立规则",
    title: "根结点先入队",
    description: "层序遍历使用 FIFO 队列保存已经发现、尚未访问的结点。",
  },
  {
    stage: "展开第一层",
    title: "访问 A，再把 B、C 依次入队",
    description: "先入队的 B 会先于 C 出队，因此同一层保持从左到右。",
  },
  {
    stage: "预测暂停",
    title: "队首结点是谁？",
    description: "下一步由队首决定，不依赖递归返回位置。",
  },
  {
    stage: "继续下一层",
    title: "出队一个结点，再入队它的孩子",
    description: "队列把较早发现的结点留在更靠前的位置。",
  },
  {
    stage: "完成层序",
    title: "A B C D E F G",
    description: "每个结点恰好入队、出队一次，时间复杂度为 O(n)。",
  },
];

const graphStrategyLessons: Record<
  GraphStrategy,
  readonly LessonStep[]
> = {
  bfs: fiveStepLessons[VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL],
  dfs: [
    {
      stage: "初始化",
      title: "从 A 出发并立即标记 visited",
      description: "顶点进入栈时就标记，避免同一顶点被重复压入。",
    },
    {
      stage: "沿路径深入",
      title: "栈顶决定下一个展开顶点",
      description: "为保持约定的邻接顺序，后发现的候选位于栈顶并优先处理。",
    },
    {
      stage: "预测暂停",
      title: "栈顶是谁？",
      description: "同时观察 visited 集合与栈顶，不要只看图形距离。",
    },
    {
      stage: "遇到分叉",
      title: "走不通时回到最近的未完成分叉",
      description: "已访问顶点不会再次入栈，栈保存尚待展开的路径。",
    },
    {
      stage: "完成遍历",
      title: "所有可达顶点恰好访问一次",
      description: "邻接表实现下，DFS 的时间同样为 O(|V|+|E|)。",
    },
  ],
};

function lessonStepsForSpec(
  spec: Cs408CoreSessionSpec,
): readonly LessonStep[] {
  if (
    spec.visualizationId ===
      VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL &&
    spec.scenario.traversal === "levelorder"
  ) {
    return levelOrderLesson;
  }
  if (spec.visualizationId === VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL) {
    return graphStrategyLessons[spec.scenario.strategy];
  }
  if (
    spec.visualizationId === VISUALIZATION_ID_CS408_BINARY_SEARCH &&
    spec.scenario.target === 23
  ) {
    return [
      fiveStepLessons[VISUALIZATION_ID_CS408_BINARY_SEARCH][0]!,
      {
        stage: "检查中点",
        title: "target 与 a[mid] 首次比较就相等",
        description: "mid=4 且 a[mid]=23，当前比较已经给出成功结论。",
      },
      {
        stage: "停止查找",
        title: "命中后不再更新边界",
        description: "成功分支直接返回下标 4，不需要继续排除左右区间。",
      },
      {
        stage: "复核条件",
        title: "有序前提与闭区间约定仍然成立",
        description: "快速命中不改变算法前提，只是本例比较次数恰好为 1。",
      },
      {
        stage: "得到结果",
        title: "target 位于下标 4",
        description: "判定树根结点即命中，成功查找比较次数为 1。",
      },
    ];
  }
  return fiveStepLessons[spec.visualizationId];
}

const iconByVisualization: Record<
  Cs408CoreSessionSpec["visualizationId"],
  ReactNode
> = {
  [VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL]: (
    <GitBranch aria-hidden="true" className="size-5" />
  ),
  [VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL]: (
    <Network aria-hidden="true" className="size-5" />
  ),
  [VISUALIZATION_ID_CS408_BINARY_SEARCH]: (
    <Search aria-hidden="true" className="size-5" />
  ),
  [VISUALIZATION_ID_CS408_AVL_ROTATION]: (
    <RotateCw aria-hidden="true" className="size-5" />
  ),
  [VISUALIZATION_ID_CS408_KMP_MATCHING]: (
    <ScanSearch aria-hidden="true" className="size-5" />
  ),
  [VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION]: (
    <Shuffle aria-hidden="true" className="size-5" />
  ),
};

const titleByVisualization: Record<
  Cs408CoreSessionSpec["visualizationId"],
  string
> = {
  [VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL]: "二叉树遍历实验室",
  [VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL]: "图遍历前沿",
  [VISUALIZATION_ID_CS408_BINARY_SEARCH]: "折半查找区间",
  [VISUALIZATION_ID_CS408_AVL_ROTATION]: "AVL 旋转工作台",
  [VISUALIZATION_ID_CS408_KMP_MATCHING]: "KMP 指针对齐",
  [VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION]: "快速排序划分",
};

function Sequence({
  values,
  visitedCount,
}: {
  values: readonly string[];
  visitedCount: number;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2" aria-label="访问序列">
      {values.map((value, index) => (
        <motion.span
          key={`${value}-${index}`}
          aria-label={`${value}，${index < visitedCount ? "已访问" : "待访问"}`}
          animate={{
            y: index < visitedCount ? -4 : 0,
            opacity: index < visitedCount ? 1 : 0.38,
          }}
          className={`inline-flex size-11 items-center justify-center rounded-2xl border text-sm font-bold ${
            index < visitedCount
              ? "border-indigo-300 bg-indigo-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.24)]"
              : "border-slate-200 bg-white text-slate-400"
          }`}
        >
          {value}
        </motion.span>
      ))}
    </div>
  );
}

const treePositions = {
  A: [200, 45],
  B: [105, 125],
  C: [295, 125],
  D: [55, 215],
  E: [145, 215],
  F: [255, 215],
  G: [345, 215],
} as const;

const treeEdges = [
  ["A", "B"],
  ["A", "C"],
  ["B", "D"],
  ["B", "E"],
  ["C", "F"],
  ["C", "G"],
] as const;

function BinaryTreeView({
  step,
  traversal,
}: {
  step: number;
  traversal: TreeTraversal;
}) {
  const order = treeTraversalOrders[traversal];
  const visitedCount = getTreeVisitedCount(traversal, step);
  const visited = new Set<string>(order.slice(0, visitedCount));
  return (
    <div className="grid h-full content-center gap-6">
      <div className="mx-auto rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800">
        当前规则：{treeTraversalLabels[traversal]}
      </div>
      <svg
        viewBox="0 0 400 270"
        role="img"
        aria-label={`包含 A 到 G 的完全二叉树，当前演示${treeTraversalLabels[traversal]}遍历`}
        className="mx-auto w-full max-w-[560px]"
      >
        {treeEdges.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={treePositions[from][0]}
            y1={treePositions[from][1]}
            x2={treePositions[to][0]}
            y2={treePositions[to][1]}
            stroke="#cbd5e1"
            strokeWidth="4"
          />
        ))}
        {Object.entries(treePositions).map(([value, position]) => (
          <g key={value}>
            <motion.circle
              cx={position[0]}
              cy={position[1]}
              r="27"
              animate={{ scale: visited.has(value) ? 1.08 : 1 }}
              fill={visited.has(value) ? "#4f46e5" : "#ffffff"}
              stroke={visited.has(value) ? "#818cf8" : "#cbd5e1"}
              strokeWidth="4"
            />
            <text
              x={position[0]}
              y={position[1] + 6}
              textAnchor="middle"
              fontSize="18"
              fontWeight="700"
              fill={visited.has(value) ? "#ffffff" : "#0f172a"}
            >
              {value}
            </text>
          </g>
        ))}
      </svg>
      <Sequence values={order} visitedCount={visitedCount} />
    </div>
  );
}

const graphPositions = {
  A: [60, 130],
  B: [165, 55],
  C: [165, 205],
  D: [285, 45],
  E: [285, 135],
  F: [285, 225],
} as const;

const graphEdges = [
  ["A", "B"],
  ["A", "C"],
  ["B", "D"],
  ["B", "E"],
  ["C", "E"],
  ["C", "F"],
  ["D", "E"],
] as const;

function GraphView({
  step,
  strategy,
}: {
  step: number;
  strategy: GraphStrategy;
}) {
  const frame =
    graphTraversalFrames[strategy][step] ??
    graphTraversalFrames[strategy][0]!;
  const order = graphTraversalOrders[strategy];
  const visited = new Set<string>(frame.visited);
  const isBfs = strategy === "bfs";
  return (
    <div className="grid h-full content-center gap-5">
      <svg
        viewBox="0 0 350 270"
        role="img"
        aria-label={`从 A 开始${isBfs ? "广度" : "深度"}优先遍历的无向图`}
        className="mx-auto w-full max-w-[540px]"
      >
        {graphEdges.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={graphPositions[from][0]}
            y1={graphPositions[from][1]}
            x2={graphPositions[to][0]}
            y2={graphPositions[to][1]}
            stroke="#cbd5e1"
            strokeWidth="4"
          />
        ))}
        {Object.entries(graphPositions).map(([value, position]) => (
          <g key={value}>
            <circle
              cx={position[0]}
              cy={position[1]}
              r="25"
              fill={visited.has(value) ? "#0891b2" : "#ffffff"}
              stroke={visited.has(value) ? "#22d3ee" : "#cbd5e1"}
              strokeWidth="4"
            />
            <text
              x={position[0]}
              y={position[1] + 6}
              textAnchor="middle"
              fontSize="17"
              fontWeight="700"
              fill={visited.has(value) ? "#ffffff" : "#0f172a"}
            >
              {value}
            </text>
          </g>
        ))}
      </svg>
      <div className="mx-auto flex w-full max-w-[560px] items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-700">
          {isBfs ? "queue" : "stack"}
        </span>
        <strong className="font-mono text-sm text-slate-950">
          {isBfs ? "front" : "top"} →{" "}
          {frame.frontier.length > 0
            ? frame.frontier.join(" · ")
            : "∅"}
        </strong>
      </div>
      <Sequence values={order} visitedCount={frame.expanded.length} />
    </div>
  );
}

function BinarySearchView({
  step,
  target,
}: {
  step: number;
  target: number;
}) {
  const current = getBinarySearchFrame(target, step);
  const resultLabel =
    current.status === "found"
      ? `命中下标 ${current.mid}`
      : current.status === "not_found"
        ? `候选区间为空：low ${current.low} > high ${current.high}`
        : "继续比较";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-9">
      <div
        role="status"
        className={`rounded-full border px-4 py-2 text-sm font-semibold ${
          current.status === "found"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : current.status === "not_found"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-indigo-200 bg-indigo-50 text-indigo-800"
        }`}
      >
        target = {target} · {resultLabel}
      </div>
      <div className="w-full overflow-x-auto pb-7">
        <div className="mx-auto grid min-w-[620px] max-w-[760px] grid-cols-9 gap-1.5">
          {binarySearchValues.map((value, index) => {
            const inRange =
              current.status !== "not_found" &&
              index >= current.low &&
              index <= current.high;
            const isMid = index === current.mid;
            return (
              <motion.div
                key={value}
                aria-label={`下标 ${index}，值 ${value}${isMid ? "，当前中点" : inRange ? "，仍在候选区间" : "，已排除"}`}
                animate={{
                  y: isMid ? -10 : 0,
                  opacity: inRange || isMid ? 1 : 0.28,
                }}
                className={`relative flex aspect-square min-h-12 flex-col items-center justify-center rounded-2xl border ${
                  isMid
                    ? current.status === "found"
                      ? "border-emerald-500 bg-emerald-600 text-white shadow-[0_12px_28px_rgba(5,150,105,0.24)]"
                      : "border-indigo-500 bg-indigo-600 text-white shadow-[0_12px_28px_rgba(79,70,229,0.25)]"
                    : inRange
                      ? "border-slate-300 bg-white text-slate-950"
                      : "border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                <span className="text-[10px] font-semibold opacity-65">
                  {index}
                </span>
                <strong className="text-base">{value}</strong>
                {isMid ? (
                  <span
                    className={`absolute -bottom-6 text-[10px] font-bold ${
                      current.status === "found"
                        ? "text-emerald-700"
                        : "text-indigo-700"
                    }`}
                  >
                    {current.status === "found" ? "found" : "mid"}
                  </span>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="grid w-full max-w-[560px] grid-cols-3 gap-2 text-center">
        {[
          ["low", current.low],
          ["mid", current.mid ?? "—"],
          ["high", current.high],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            <span className="text-xs text-slate-500">{label}</span>
            <strong className="ml-2 text-sm text-slate-950">{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function AvlView({
  step,
  rotation,
}: {
  step: number;
  rotation: AvlRotation;
}) {
  const final = step >= 3;
  const layout = getAvlLayout(rotation, final);
  const positions = new Map(
    layout.nodes.map((node) => [node.value, node] as const),
  );
  return (
    <div className="grid h-full content-center gap-7">
      <div className="mx-auto flex items-center gap-2">
        {["LL", "RR", "LR", "RL"].map((type) => (
          <span
            key={type}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              type === rotation
                ? "bg-orange-500 text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {type}
          </span>
        ))}
      </div>
      <svg
        viewBox="0 0 400 270"
        role="img"
        aria-label={
          final
            ? `${rotation} 调整后的平衡二叉搜索树`
            : `结点 10、20、30 形成的 ${rotation} 失衡树`
        }
        className="mx-auto w-full max-w-[560px]"
      >
        {layout.edges.map(([from, to]) => {
          const start = positions.get(from);
          const end = positions.get(to);
          if (!start || !end) {
            return null;
          }
          return (
            <motion.line
              key={`${from}-${to}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="#cbd5e1"
              strokeWidth="5"
            />
          );
        })}
        {layout.nodes.map(({ value, x, y }) => (
          <g key={value}>
            <circle
              cx={x}
              cy={y}
              r="29"
              fill={value === "20" && final ? "#f97316" : "#ffffff"}
              stroke={value === "20" ? "#fb923c" : "#cbd5e1"}
              strokeWidth="4"
            />
            <text
              x={x}
              y={y + 6}
              textAnchor="middle"
              fontSize="17"
              fontWeight="700"
              fill={value === "20" && final ? "#ffffff" : "#0f172a"}
            >
              {value}
            </text>
          </g>
        ))}
      </svg>
      <p className="m-0 text-center text-sm font-semibold text-slate-700">
        {final
          ? "中序序列仍为 10, 20, 30；高度差恢复到 1 以内"
          : `${rotation} 型：局部旧根为 ${layout.oldRoot}，调整后 20 应成为新根`}
      </p>
    </div>
  );
}

function CharacterRow({
  label,
  values,
  offset = 0,
  active = -1,
}: {
  label: string;
  values: readonly string[];
  offset?: number;
  active?: number;
}) {
  return (
    <div className="grid grid-cols-[62px_repeat(10,minmax(34px,1fr))] gap-1.5">
      <span className="self-center text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </span>
      {Array.from({ length: 10 }, (_, index) => {
        const value = values[index - offset];
        const highlighted = index - offset === active;
        return (
          <span
            key={index}
            className={`flex aspect-square min-h-9 items-center justify-center rounded-xl border font-mono text-sm font-bold ${
              value === undefined
                ? "border-transparent"
                : highlighted
                  ? "border-fuchsia-500 bg-fuchsia-600 text-white"
                  : "border-slate-200 bg-white text-slate-800"
            }`}
          >
            {value ?? ""}
          </span>
        );
      })}
    </div>
  );
}

function KmpView({ step }: { step: number }) {
  const activePatternIndex = kmpActivePatternIndexes[step] ?? -1;
  const offset = kmpOffsets[step] ?? 0;
  return (
    <div className="flex h-full flex-col justify-center gap-8">
      <div className="overflow-x-auto">
        <div className="mx-auto grid min-w-[620px] max-w-[780px] gap-2">
          <CharacterRow
            label="text"
            values={kmpText}
            active={offset + activePatternIndex}
          />
          <CharacterRow
            label="pattern"
            values={kmpPattern}
            offset={offset}
            active={activePatternIndex}
          />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[620px] rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-fuchsia-700">
          prefix function
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {kmpPrefix.map((value, index) => (
            <div
              key={index}
              className="rounded-xl border border-fuchsia-100 bg-white px-2 py-2 text-center"
            >
              <span className="block font-mono text-xs text-slate-500">
                {kmpPattern[index]}
              </span>
              <strong className="text-sm text-fuchsia-700">{value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickPartitionView({ step }: { step: number }) {
  const frame = quickPartitionFrames[step] ?? quickPartitionFrames[0]!;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-10">
      <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
        pivot = 38
      </div>
      <div className="w-full overflow-x-auto py-7">
        <div className="mx-auto grid min-w-[560px] max-w-[720px] grid-cols-7 gap-2">
          {frame.slots.map((value, index) => {
            const pivotPlaced = step === 4 && index === 4;
            const isHole = frame.hole === index;
            return (
              <motion.div
                key={index}
                layout
                aria-label={
                  isHole
                    ? `下标 ${index}，当前空位`
                    : `下标 ${index}，值 ${value}`
                }
                className={`relative flex aspect-square min-h-14 items-center justify-center rounded-2xl border text-lg font-bold ${
                  pivotPlaced
                    ? "border-amber-500 bg-amber-500 text-white shadow-[0_12px_30px_rgba(245,158,11,0.28)]"
                    : isHole
                      ? "border-dashed border-amber-400 bg-amber-50 text-xs text-amber-800"
                      : "border-slate-200 bg-white text-slate-900"
                }`}
              >
                {isHole ? "空位" : value}
                {frame.low === index ? (
                  <span className="absolute -bottom-6 text-[10px] font-bold text-indigo-700">
                    low
                  </span>
                ) : null}
                {frame.high === index ? (
                  <span className="absolute -top-6 text-[10px] font-bold text-rose-700">
                    high
                  </span>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="grid w-full max-w-[720px] grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-indigo-900">
          已确认左区间：≤ pivot
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
          已确认右区间：≥ pivot
        </div>
      </div>
    </div>
  );
}

function LessonVisualization({
  spec,
  step,
}: {
  spec: Cs408CoreSessionSpec;
  step: number;
}) {
  switch (spec.visualizationId) {
    case VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL:
      return (
        <BinaryTreeView
          step={step}
          traversal={spec.scenario.traversal}
        />
      );
    case VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL:
      return (
        <GraphView step={step} strategy={spec.scenario.strategy} />
      );
    case VISUALIZATION_ID_CS408_BINARY_SEARCH:
      return (
        <BinarySearchView step={step} target={spec.scenario.target} />
      );
    case VISUALIZATION_ID_CS408_AVL_ROTATION:
      return (
        <AvlView step={step} rotation={spec.scenario.rotation} />
      );
    case VISUALIZATION_ID_CS408_KMP_MATCHING:
      return <KmpView step={step} />;
    case VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION:
      return <QuickPartitionView step={step} />;
  }
}

const comparisonNotes: Record<
  Cs408CoreSessionSpec["visualizationId"],
  readonly string[]
> = {
  [VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL]: [
    "先序：A B D E C F G",
    "中序：D B E A F C G",
    "后序：D E B F G C A",
    "层序：A B C D E F G",
  ],
  [VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL]: [
    "BFS 队列：A B C D E F",
    "DFS 栈/递归：A B D E C F",
    "入容器时标记 visited",
    "邻接表复杂度 O(V+E)",
  ],
  [VISUALIZATION_ID_CS408_BINARY_SEARCH]: [
    "前提：关键字有序",
    "不变量：目标只可能在区间内",
    "更新：low=mid+1 或 high=mid-1",
    "失败：low > high",
  ],
  [VISUALIZATION_ID_CS408_AVL_ROTATION]: [
    "LL → 对失衡根右旋",
    "RR → 对失衡根左旋",
    "LR → 先左旋孩子，再右旋根",
    "RL → 先右旋孩子，再左旋根",
  ],
  [VISUALIZATION_ID_CS408_KMP_MATCHING]: [
    "文本指针 i 不回退",
    "模式指针 j 按前缀函数回退",
    "复用最长相等真前后缀",
    "总时间 O(n+m)",
  ],
  [VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION]: [
    "枢轴最终位置一次确定",
    "左区间不大于枢轴",
    "右区间不小于枢轴",
    "划分本身时间 O(n)",
  ],
};

function activeComparisonNoteIndex(
  spec: Cs408CoreSessionSpec,
  step: number,
): number {
  if (
    spec.visualizationId ===
    VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL
  ) {
    return {
      preorder: 0,
      inorder: 1,
      postorder: 2,
      levelorder: 3,
    }[spec.scenario.traversal];
  }
  if (spec.visualizationId === VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL) {
    return step >= 3 ? Math.min(step, 3) : spec.scenario.strategy === "bfs" ? 0 : 1;
  }
  if (spec.visualizationId === VISUALIZATION_ID_CS408_AVL_ROTATION) {
    return { LL: 0, RR: 1, LR: 2, RL: 3 }[spec.scenario.rotation];
  }
  return Math.min(step, 3);
}

interface Prediction {
  question: string;
  options: readonly [string, string];
  correct: 0 | 1;
}

const fixedPredictions: Partial<
  Record<Cs408CoreSessionSpec["visualizationId"], Prediction>
> = {
  [VISUALIZATION_ID_CS408_BINARY_SEARCH]: {
    question: "一次比较未命中时，凭什么排除半个区间？",
    options: ["序列有序且已比较中点", "因为区间长度是奇数"],
    correct: 0,
  },
  [VISUALIZATION_ID_CS408_KMP_MATCHING]: {
    question: "发生失配时，KMP 的文本指针 i 是否回退？",
    options: ["不回退", "回到本次起点"],
    correct: 0,
  },
  [VISUALIZATION_ID_CS408_QUICK_SORT_PARTITION]: {
    question: "左右指针相遇后，应把什么放入空位？",
    options: ["枢轴", "任意未决元素"],
    correct: 0,
  },
};

function predictionForSpec(spec: Cs408CoreSessionSpec): Prediction {
  if (
    spec.visualizationId ===
    VISUALIZATION_ID_CS408_BINARY_TREE_TRAVERSAL
  ) {
    const treePredictions: Record<TreeTraversal, Prediction> = {
      preorder: {
        question: "先序完成 B 的左子树 D 后，下一个访问谁？",
        options: ["E", "C"],
        correct: 0,
      },
      inorder: {
        question: "中序访问左叶子 D 后，下一个访问谁？",
        options: ["B", "E"],
        correct: 0,
      },
      postorder: {
        question: "后序访问左叶子 D 后，下一个访问谁？",
        options: ["E", "B"],
        correct: 0,
      },
      levelorder: {
        question: "层序访问 A 并把 B、C 入队后，谁先出队？",
        options: ["B", "C"],
        correct: 0,
      },
    };
    return treePredictions[spec.scenario.traversal];
  }
  if (spec.visualizationId === VISUALIZATION_ID_CS408_GRAPH_TRAVERSAL) {
    return spec.scenario.strategy === "bfs"
      ? {
          question: "BFS 队列头部是 B、其后是 C，下一步展开谁？",
          options: ["B", "C"],
          correct: 0,
        }
      : {
          question: "DFS 栈顶是 B、其下是 C，下一步展开谁？",
          options: ["B", "C"],
          correct: 0,
        };
  }
  if (spec.visualizationId === VISUALIZATION_ID_CS408_AVL_ROTATION) {
    const layout = getAvlLayout(spec.scenario.rotation, false);
    return {
      question: `${spec.scenario.rotation} 调整完成后，局部新根是谁？`,
      options: ["20", layout.oldRoot],
      correct: 0,
    };
  }
  const prediction = fixedPredictions[spec.visualizationId];
  if (!prediction) {
    throw new Error(`缺少课件预测题：${spec.visualizationId}`);
  }
  return prediction;
}

export function VisualizationComponent({
  sessionId,
  spec: rawSpec,
  state,
  onStateChange,
  onInteraction,
}: Props) {
  const spec = cs408CoreSessionSpecSchema.parse(rawSpec);
  const steps = lessonStepsForSpec(spec);
  const step = Math.min(
    steps.length - 1,
    Math.max(0, Math.trunc(state.step)),
  );
  const current = steps[step]!;
  const prediction = predictionForSpec(spec);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [predictionRetryCount, setPredictionRetryCount] = useState(0);
  // 同一 (sessionId, finalStep) 只上报一次完成事件；回退再走到末步不重复计数
  const completionSentRef = useRef<{
    sessionId: string;
    finalStep: number;
  } | null>(null);
  const predictionComplete =
    selectedAnswer === prediction.correct;

  const setStep = (next: number) => {
    const clamped = Math.min(steps.length - 1, Math.max(0, next));
    const occurredAt = interactionTimestamp();
    onStateChange({ step: clamped, codeOpen: state.codeOpen });
    onInteraction({
      type: "step_changed",
      sessionId,
      visualizationId: spec.visualizationId,
      step: clamped,
      stepId: `${spec.visualizationId}:step-${clamped}`,
      occurredAt,
    });
    if (
      clamped === steps.length - 1 &&
      (completionSentRef.current?.sessionId !== sessionId ||
        completionSentRef.current?.finalStep !== clamped)
    ) {
      completionSentRef.current = { sessionId, finalStep: clamped };
      onInteraction({
        type: "lesson_completed",
        sessionId,
        visualizationId: spec.visualizationId,
        finalStep: clamped,
        occurredAt,
      });
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <LessonFrame
        title={titleByVisualization[spec.visualizationId]}
        teachingGoal={spec.teachingGoal}
        icon={iconByVisualization[spec.visualizationId]}
        step={step}
        stepCount={steps.length}
        stage={`${current.stage} · ${current.title}`}
        description={current.description}
        onReset={() => setStep(0)}
        onPrevious={() => setStep(step - 1)}
        onNext={() => setStep(step + 1)}
        className="h-full"
        aside={
          <div className="space-y-5">
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                解题检查点
              </p>
              <div className="mt-3 space-y-2">
                {comparisonNotes[spec.visualizationId].map((note, index) => (
                  <div
                    key={note}
                    className={`rounded-xl border px-3 py-2 text-xs leading-5 ${
                      index === activeComparisonNoteIndex(spec, step)
                        ? "border-indigo-200 bg-indigo-50 font-semibold text-indigo-900"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {note}
                  </div>
                ))}
              </div>
            </div>

            {step === 2 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="m-0 text-xs font-semibold leading-5 text-amber-950">
                  {prediction.question}
                </p>
                <div className="mt-3 grid gap-2">
                  {prediction.options.map((answer, index) => {
                    const chosen = selectedAnswer === index;
                    const correct = index === prediction.correct;
                    return (
                      <button
                        key={answer}
                        type="button"
                        disabled={predictionComplete}
                        onClick={() => {
                          setSelectedAnswer(index);
                          onInteraction({
                            type: "prediction_submitted",
                            sessionId,
                            visualizationId: spec.visualizationId,
                            pauseId: `${spec.visualizationId}:prediction`,
                            answerId: `option-${index}`,
                            correct,
                            retryCount: predictionRetryCount,
                            occurredAt: Date.now(),
                            prompt: prediction.question,
                            chosenAnswer:
                              prediction.options[index] ??
                              `option-${index}`,
                            correctAnswer:
                              prediction.options[prediction.correct],
                          });
                          if (!correct) {
                            setPredictionRetryCount((count) => count + 1);
                          }
                        }}
                        className={`min-h-11 cursor-pointer rounded-xl border px-3 text-left text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default ${
                          chosen
                            ? correct
                              ? "border-emerald-300 bg-emerald-100 text-emerald-900"
                              : "border-rose-300 bg-rose-100 text-rose-900"
                            : "border-amber-200 bg-white text-slate-700 hover:border-amber-300"
                        }`}
                      >
                        {answer}
                      </button>
                    );
                  })}
                </div>
                {selectedAnswer !== null ? (
                  <p
                    role="status"
                    className={`m-0 mt-2 text-xs font-semibold ${
                      selectedAnswer === prediction.correct
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    {selectedAnswer === prediction.correct
                      ? "正确。继续用这条不变量解释下一步。"
                      : "再看当前指针、容器或局部根的位置。"}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        }
      >
        <section className="h-full min-h-[430px] rounded-[22px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/45 p-4 shadow-sm sm:p-5">
          <LessonVisualization spec={spec} step={step} />
        </section>
      </LessonFrame>
    </MotionConfig>
  );
}
