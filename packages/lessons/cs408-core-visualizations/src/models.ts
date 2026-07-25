export type TreeTraversal =
  | "preorder"
  | "inorder"
  | "postorder"
  | "levelorder";

export const treeTraversalOrders: Record<
  TreeTraversal,
  readonly string[]
> = {
  preorder: ["A", "B", "D", "E", "C", "F", "G"],
  inorder: ["D", "B", "E", "A", "F", "C", "G"],
  postorder: ["D", "E", "B", "F", "G", "C", "A"],
  levelorder: ["A", "B", "C", "D", "E", "F", "G"],
};

export const treeTraversalLabels: Record<TreeTraversal, string> = {
  preorder: "先序",
  inorder: "中序",
  postorder: "后序",
  levelorder: "层序",
};

const treeVisitedCounts: Record<TreeTraversal, readonly number[]> = {
  preorder: [0, 2, 3, 5, 7],
  inorder: [0, 1, 3, 5, 7],
  postorder: [0, 1, 3, 5, 7],
  levelorder: [1, 3, 3, 5, 7],
};

export function getTreeVisitedCount(
  traversal: TreeTraversal,
  step: number,
): number {
  return treeVisitedCounts[traversal][step] ?? 0;
}

export type GraphStrategy = "bfs" | "dfs";

export interface GraphTraversalFrame {
  visited: readonly string[];
  frontier: readonly string[];
  expanded: readonly string[];
}

export const graphTraversalOrders: Record<
  GraphStrategy,
  readonly string[]
> = {
  bfs: ["A", "B", "C", "D", "E", "F"],
  dfs: ["A", "B", "D", "E", "C", "F"],
};

export const graphTraversalFrames: Record<
  GraphStrategy,
  readonly GraphTraversalFrame[]
> = {
  bfs: [
    { visited: ["A"], frontier: ["A"], expanded: [] },
    {
      visited: ["A", "B", "C"],
      frontier: ["B", "C"],
      expanded: ["A"],
    },
    {
      visited: ["A", "B", "C"],
      frontier: ["B", "C"],
      expanded: ["A"],
    },
    {
      visited: ["A", "B", "C", "D", "E"],
      frontier: ["C", "D", "E"],
      expanded: ["A", "B"],
    },
    {
      visited: ["A", "B", "C", "D", "E", "F"],
      frontier: [],
      expanded: ["A", "B", "C", "D", "E", "F"],
    },
  ],
  dfs: [
    { visited: ["A"], frontier: ["A"], expanded: [] },
    {
      visited: ["A", "B", "C"],
      frontier: ["B", "C"],
      expanded: ["A"],
    },
    {
      visited: ["A", "B", "C"],
      frontier: ["B", "C"],
      expanded: ["A"],
    },
    {
      visited: ["A", "B", "C", "D", "E"],
      frontier: ["D", "E", "C"],
      expanded: ["A", "B"],
    },
    {
      visited: ["A", "B", "C", "D", "E", "F"],
      frontier: [],
      expanded: ["A", "B", "D", "E", "C", "F"],
    },
  ],
};

export const binarySearchValues = [
  3, 7, 11, 18, 23, 29, 31, 42, 57,
] as const;

export interface BinarySearchFrame {
  low: number;
  high: number;
  mid: number | null;
  status: "checking" | "found" | "not_found";
}

export function buildBinarySearchTrace(
  target: number,
): BinarySearchFrame[] {
  const trace: BinarySearchFrame[] = [];
  let low = 0;
  let high = binarySearchValues.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = binarySearchValues[mid]!;
    const found = value === target;
    trace.push({
      low,
      high,
      mid,
      status: found ? "found" : "checking",
    });
    if (found) {
      return trace;
    }
    if (value < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  trace.push({ low, high, mid: null, status: "not_found" });
  return trace;
}

export function getBinarySearchFrame(
  target: number,
  step: number,
): BinarySearchFrame {
  const trace = buildBinarySearchTrace(target);
  const lastIndex = trace.length - 1;
  const indexes = [
    0,
    0,
    Math.min(1, lastIndex),
    Math.max(Math.min(2, lastIndex), lastIndex - 1),
    lastIndex,
  ];
  return trace[indexes[step] ?? 0] ?? trace[0]!;
}

export type AvlRotation = "LL" | "RR" | "LR" | "RL";

export interface AvlNodeLayout {
  value: "10" | "20" | "30";
  x: number;
  y: number;
}

export interface AvlLayout {
  nodes: readonly AvlNodeLayout[];
  edges: readonly (readonly [
    AvlNodeLayout["value"],
    AvlNodeLayout["value"],
  ])[];
  oldRoot: "10" | "30";
}

const finalAvlLayout = {
  nodes: [
    { value: "20", x: 200, y: 55 },
    { value: "10", x: 110, y: 180 },
    { value: "30", x: 290, y: 180 },
  ],
  edges: [
    ["20", "10"],
    ["20", "30"],
  ],
} as const;

const initialAvlLayouts: Record<AvlRotation, AvlLayout> = {
  LL: {
    nodes: [
      { value: "30", x: 290, y: 45 },
      { value: "20", x: 200, y: 130 },
      { value: "10", x: 110, y: 220 },
    ],
    edges: [
      ["30", "20"],
      ["20", "10"],
    ],
    oldRoot: "30",
  },
  RR: {
    nodes: [
      { value: "10", x: 110, y: 45 },
      { value: "20", x: 200, y: 130 },
      { value: "30", x: 290, y: 220 },
    ],
    edges: [
      ["10", "20"],
      ["20", "30"],
    ],
    oldRoot: "10",
  },
  LR: {
    nodes: [
      { value: "30", x: 290, y: 45 },
      { value: "10", x: 110, y: 150 },
      { value: "20", x: 200, y: 225 },
    ],
    edges: [
      ["30", "10"],
      ["10", "20"],
    ],
    oldRoot: "30",
  },
  RL: {
    nodes: [
      { value: "10", x: 110, y: 45 },
      { value: "30", x: 290, y: 150 },
      { value: "20", x: 200, y: 225 },
    ],
    edges: [
      ["10", "30"],
      ["30", "20"],
    ],
    oldRoot: "10",
  },
};

export function getAvlLayout(
  rotation: AvlRotation,
  final: boolean,
): AvlLayout {
  const initial = initialAvlLayouts[rotation];
  if (!final) {
    return initial;
  }
  return {
    ...finalAvlLayout,
    oldRoot: initial.oldRoot,
  };
}

export const kmpText = "ababdababc".split("");
export const kmpPattern = "ababc".split("");
export const kmpPrefix = [0, 0, 1, 2, 0] as const;
export const kmpOffsets = [0, 0, 0, 2, 5] as const;
export const kmpActivePatternIndexes = [-1, 3, 4, 2, 4] as const;

export interface QuickPartitionFrame {
  slots: readonly (number | null)[];
  low: number;
  high: number;
  hole: number | null;
}

export const quickPartitionFrames: readonly QuickPartitionFrame[] = [
  {
    slots: [null, 27, 43, 3, 9, 82, 10],
    low: 0,
    high: 6,
    hole: 0,
  },
  {
    slots: [10, 27, 43, 3, 9, 82, null],
    low: 0,
    high: 6,
    hole: 6,
  },
  {
    slots: [10, 27, null, 3, 9, 82, 43],
    low: 2,
    high: 6,
    hole: 2,
  },
  {
    slots: [10, 27, 9, 3, null, 82, 43],
    low: 4,
    high: 4,
    hole: 4,
  },
  {
    slots: [10, 27, 9, 3, 38, 82, 43],
    low: 4,
    high: 4,
    hole: null,
  },
];
