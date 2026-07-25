"""生成第 2 章试点的人工策划 authoring 输入。

本文件保存经源记录逐项核对后的知识点边界与中文标准内容；它不调用模型，
也不替代 kb_pipeline 的 Schema、引用、关系和派生物校验。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from knowledge_base.scripts.kb_pipeline.io_utils import (
    read_jsonl,
    write_json_atomic,
    write_jsonl_atomic,
)


ROOT = Path(__file__).resolve().parents[2]
CHAPTER = "02-array-based-lists"
CHAPTER_ID = "array-based-lists"
COURSE_ID = "open-data-structures"

VISUALIZATION_BINDINGS = {
    "ods-array-size-capacity": ["ods.arraystack-insertion.v1"],
    "ods-arraystack-insertion": ["ods.arraystack-insertion.v1"],
    "ods-arrayqueue-representation": ["ods.arrayqueue-representation.v1"],
    "ods-modular-array-indexing": ["ods.arrayqueue-representation.v1"],
    "ods-dualarraydeque-representation": ["ods.dualarraydeque-balance.v1"],
    "ods-dualarraydeque-balance": ["ods.dualarraydeque-balance.v1"],
}


def main() -> None:
    source_path = ROOT / "corpus" / "chapters" / f"{CHAPTER}.jsonl"
    records = read_jsonl(source_path)
    by_order = {row["document_order"]: row for row in records}

    def source_ids(orders: list[int]) -> list[str]:
        missing = [order for order in orders if order not in by_order]
        if missing:
            raise ValueError(f"源记录 document_order 不存在: {missing}")
        return [by_order[order]["id"] for order in orders]

    specs: list[dict[str, Any]] = [
        {
            "id": "ods-array-backed-storage",
            "title": "数组后备存储的共同特征",
            "aliases": ["后备数组", "backing array", "数组式存储"],
            "type": "concept",
            "section": "2-1-arraystack",
            "question": "用数组作为后备存储会带来哪些共同的性能与空间特征？",
            "summary": "数组后备存储支持常数时间随机访问，但中间更新需要搬移元素，容量调整的偶发成本需摊还分析。",
            "definition": "数组后备存储是用一个或多个数组保存线性序列元素的实现方式。它利用数组按下标直接定位元素，同时受连续槽位和固定数组长度约束；插入、删除可能搬移元素，容量不足或空闲过多时还要调整存储空间。",
            "analogy": "它像一排带编号的固定座位：按号码找座位很快，但在中间加减座位会让一侧的人移动，座位不够时还要换更大的排。",
            "mapping": {"编号座位": "数组下标", "移动一侧的人": "搬移数组元素", "换更大的排": "调整后备数组容量"},
            "boundary": "类比只解释寻址、搬移和容量变化，不表示数组元素在物理环境中真的由人逐个搬运。",
            "orders": [207, 209, 211, 212, 213, 214, 215, 216],
            "leads_to": "ods-array-size-capacity",
        },
        {
            "id": "ods-array-size-capacity",
            "title": "元素数量与数组容量",
            "aliases": ["size 与 capacity", "逻辑长度", "数组容量"],
            "type": "concept",
            "section": "2-1-arraystack",
            "question": "数组式线性表中的元素数量与后备数组容量有什么区别？",
            "summary": "元素数量 n 只统计有效元素，容量 length(a) 是可用槽位总数，必须始终满足 n 不超过容量。",
            "definition": "在数组式线性表中，元素数量 n 表示当前有效元素个数，后备数组容量 length(a) 表示已分配槽位总数。有效元素只占其中一部分，基本不变量是 $0\\le n\\le \\mathrm{length}(a)$；空闲槽位不是逻辑元素。",
            "analogy": "容量像教室座位总数，元素数量像实际到场人数；空座位可供后来者使用，但不能被算作已经到场的人。",
            "mapping": {"座位总数": "capacity", "到场人数": "size", "空座位": "未使用数组槽位"},
            "boundary": "类比不说明具体扩容比例，也不表示所有语言都公开提供 capacity 属性。",
            "orders": [218, 219],
            "prereq": ["ods-array-backed-storage"],
            "leads_to": "ods-arraystack-resize",
        },
        {
            "id": "ods-arraystack-random-access",
            "title": "ArrayStack 的随机访问",
            "aliases": ["ArrayStack get/set", "数组栈随机访问"],
            "type": "algorithm",
            "section": "2-1-1-the-basics",
            "question": "ArrayStack 为什么能在常数时间读取或修改任意位置？",
            "summary": "ArrayStack 将逻辑下标 i 直接映射到 a[i]，所以边界检查后的 get 与 set 都是常数时间。",
            "definition": "ArrayStack 把逻辑序列的第 i 个元素保存在后备数组 a 的第 i 个槽位。get(i) 在下标合法时返回 a[i]；set(i,x) 保存旧值、把 a[i] 改为 x 并返回旧值。两者均不随元素数量增长而增加定位步骤。",
            "analogy": "像按储物柜编号直接开柜：知道编号 i 后无需从第一个柜子逐个查找，就能读取或替换该柜中的物品。",
            "mapping": {"柜号 i": "逻辑下标 i", "柜中物品": "a[i] 中的元素", "直接开柜": "数组随机访问"},
            "boundary": "类比只说明定位成本；合法下标检查、缓存和底层内存访问常数并未在类比中体现。",
            "orders": [221, 222],
            "prereq": ["ods-array-size-capacity"],
        },
        {
            "id": "ods-arraystack-insertion",
            "title": "ArrayStack 的按位插入",
            "aliases": ["ArrayStack add", "数组中间插入"],
            "type": "algorithm",
            "section": "2-1-1-the-basics",
            "question": "ArrayStack 在位置 i 插入元素时为什么要向右搬移元素？",
            "summary": "插入前需确保容量足够，再把区间 i 到 n-1 右移一格，空出 a[i] 后写入新元素。",
            "definition": "ArrayStack 的 add(i,x) 在后备数组已满时先扩容，然后把原有下标 i 至 n-1 的元素按从右到左的安全顺序整体右移一位，把 x 写入 a[i]，最后令 n 增加 1。忽略扩容时，其时间为 $O(n-i)$。",
            "analogy": "在坐满一排人的第 i 个位置加入新人时，右侧所有人先各向右挪一位，才能给新人空出连续的位置。",
            "mapping": {"新人": "待插入元素 x", "向右挪一位": "元素右移", "第 i 个位置": "插入下标 i"},
            "boundary": "类比不说明实际实现可能使用批量内存移动，也不包含扩容所需的额外复制成本。",
            "orders": [223, 224, 225, 226],
            "prereq": ["ods-array-size-capacity"],
            "leads_to": "ods-arraystack-performance",
        },
        {
            "id": "ods-arraystack-removal",
            "title": "ArrayStack 的按位删除",
            "aliases": ["ArrayStack remove", "数组中间删除"],
            "type": "algorithm",
            "section": "2-1-1-the-basics",
            "question": "ArrayStack 删除位置 i 的元素时为什么要向左搬移元素？",
            "summary": "删除 a[i] 后需把 i+1 到 n-1 的元素左移填补空位，因此忽略缩容时耗时 O(n-i)。",
            "definition": "ArrayStack 的 remove(i) 先保存 a[i]，再把下标 i+1 至 n-1 的元素整体左移一位覆盖空缺，令 n 减少 1，并在数组空闲比例达到阈值时触发 resize，最后返回被删除值。忽略 resize 时，其时间为 $O(n-i)$。",
            "analogy": "一排座位中有人离开后，右边的人依次向左补位，才能让仍在场的人继续占据从起点开始的连续座位。",
            "mapping": {"离开的人": "被删除元素", "向左补位": "元素左移", "连续座位": "a[0] 到 a[n-1]"},
            "boundary": "类比不表示清理尾部旧槽位的语言细节，也不计算可能发生的缩容成本。",
            "orders": [226, 227, 228],
            "prereq": ["ods-array-size-capacity"],
            "leads_to": "ods-arraystack-performance",
        },
        {
            "id": "ods-arraystack-resize",
            "title": "ArrayStack 的容量调整",
            "aliases": ["ArrayStack resize", "动态数组扩缩容"],
            "type": "mechanism",
            "section": "2-1-2-growing-and-shrinking",
            "question": "ArrayStack 如何在容量不足或空闲过多时调整后备数组？",
            "summary": "resize 分配大小 max(1,2n) 的新数组并复制 n 个有效元素，使容量重新与元素数量保持同阶。",
            "definition": "ArrayStack 的 resize 创建长度为 $\\max(1,2n)$ 的新数组 b，把旧数组中 n 个有效元素按原顺序复制到 b[0..n-1]，再令 a 指向 b。一次调用复制 n 个元素，因而耗时 $O(n)$；相同机制既可扩容也可在删除后的低占用率下缩容。",
            "analogy": "像把资料从过大或已装满的文件柜搬到一个约为当前资料量两倍的新柜中，资料顺序保持不变。",
            "mapping": {"资料量": "有效元素数 n", "新文件柜": "新数组 b", "逐份搬运": "复制有效元素"},
            "boundary": "类比只反映本书采用的 2n 策略；不同库可能使用其他增长因子或内存管理方式。",
            "orders": [230, 231, 232],
            "prereq": ["ods-array-size-capacity"],
            "leads_to": "ods-arraystack-amortized-resize",
        },
        {
            "id": "ods-arraystack-amortized-resize",
            "title": "ArrayStack 调整容量的摊还成本",
            "aliases": ["摊还分析", "amortized resize", "动态数组均摊复杂度"],
            "type": "theorem",
            "section": "2-1-2-growing-and-shrinking",
            "question": "为什么 ArrayStack 的单次 resize 虽为 O(n)，平均到更新操作仍是 O(1)？",
            "summary": "两次足够昂贵的容量调整之间必须积累足够多次更新，因此 m 次更新的全部 resize 总成本为 O(m)。",
            "definition": "从空 ArrayStack 开始执行任意 $m\\ge1$ 次 add 与 remove，所有 resize 调用花费的总时间为 $O(m)$。依据是一次调整完成后，容量与 n 保持固定比例；再次达到扩容或缩容阈值前必须发生与当时 n 同阶的更新，这些更新可共同承担下一次线性复制成本。",
            "analogy": "搬一次大仓库很贵，但搬完后要经过许多次进货或出货才会再次触发搬仓；把搬仓费分摊给这些日常操作，每次只承担常数份额。",
            "mapping": {"搬仓费": "resize 的 O(n) 复制", "日常进出货": "add/remove", "分摊份额": "摊还 O(1) 成本"},
            "boundary": "摊还界保证操作序列的总成本，不保证每一次触发 resize 的操作本身是常数时间。",
            "orders": list(range(232, 240)),
            "prereq": ["ods-arraystack-resize"],
            "leads_to": "ods-arraystack-performance",
        },
        {
            "id": "ods-arraystack-performance",
            "title": "ArrayStack 的操作复杂度",
            "aliases": ["ArrayStack complexity", "数组栈性能"],
            "type": "theorem",
            "section": "2-1-3-summary",
            "question": "ArrayStack 各项操作的时间复杂度是什么？",
            "summary": "get/set 为 O(1)，add/remove(i) 为 O(1+n-i)，尾端 push/pop 的摊还时间为 O(1)。",
            "definition": "ArrayStack 实现 List 接口时，get(i) 与 set(i,x) 的最坏时间为 $O(1)$；忽略 resize，add(i,x) 与 remove(i) 为 $O(1+n-i)$。从空结构开始的更新序列中，resize 总成本为线性，因此在尾端实现 push 与 pop 时每次操作具有 $O(1)$ 摊还时间。",
            "analogy": "在一排编号座位中，直接找某个号码很快；越靠近末尾加减人，需要移动的人越少，所以只操作末尾最省事。",
            "mapping": {"直接找号码": "get/set", "移动人数": "n-i", "末尾加减": "push/pop"},
            "boundary": "类比区分了位置相关成本，但没有表达最坏单次扩容仍可能花费线性时间。",
            "orders": [241, 242, 243, 244, 245, 246],
            "prereq": ["ods-arraystack-insertion", "ods-arraystack-removal", "ods-arraystack-amortized-resize"],
        },
        {
            "id": "ods-fastarraystack-block-copy",
            "title": "FastArrayStack 的批量复制优化",
            "aliases": ["FastArrayStack", "block copy", "批量数组移动"],
            "type": "mechanism",
            "section": "2-2-fastarraystack",
            "question": "FastArrayStack 如何在不改变渐近复杂度的情况下加速元素搬移？",
            "summary": "它用运行环境提供的批量复制或移动操作替代解释执行的逐元素循环，降低常数开销但不改变大 O。",
            "definition": "FastArrayStack 保留 ArrayStack 的数据布局与算法边界，但把插入、删除和 resize 中的连续区间搬移交给经过优化的块复制函数。这样仍需处理相同数量的元素，渐近时间不变，却可能利用底层机器指令显著降低实际运行时间。",
            "analogy": "同样要搬一排箱子，逐箱手搬和使用传送带都搬相同数量，但传送带能降低每个箱子的处理开销。",
            "mapping": {"逐箱手搬": "显式循环", "传送带": "批量复制函数", "箱子数量": "需要移动的元素数"},
            "boundary": "类比不保证固定加速倍数；实际收益依赖语言、元素类型、库实现和硬件。",
            "orders": [248, 249, 250, 251, 252, 253],
            "prereq": ["ods-arraystack-insertion", "ods-arraystack-removal", "ods-arraystack-resize"],
        },
        {
            "id": "ods-modular-array-indexing",
            "title": "模运算实现循环下标",
            "aliases": ["modular arithmetic", "模运算", "wrap around"],
            "type": "formula",
            "section": "2-3-arrayqueue",
            "question": "模运算如何把不断增长的逻辑下标映射到有限数组？",
            "summary": "对容量 m 取模会把任意整数下标映射到 0 至 m-1，使越过数组末端的位置回绕到开头。",
            "definition": "对整数 a 和正整数 m，$a\\bmod m$ 是满足 $a=r+km$ 且 $0\\le r<m$ 的唯一余数 r。将逻辑位置 p 映射为 $p\\bmod m$，可保证所得物理下标始终落在长度为 m 的数组合法范围内，从而形成循环下标。",
            "analogy": "钟表走过 12 点会回到 1 点；同理，数组下标越过最后一个槽位后通过取模回到起点。",
            "mapping": {"钟表一圈": "数组容量 m", "继续走时": "逻辑下标增加", "回到起点": "取模后的下标"},
            "boundary": "钟表类比只解释周期回绕；编程语言对负数取模的定义可能不同，必须按具体语言处理。",
            "orders": [257, 258, 259, 260, 261, 262, 263, 264, 265],
            "prereq": ["ods-array-size-capacity"],
            "leads_to": "ods-arrayqueue-representation",
        },
        {
            "id": "ods-arrayqueue-representation",
            "title": "ArrayQueue 的循环数组表示",
            "aliases": ["ArrayQueue", "circular array queue", "循环数组队列"],
            "type": "concept",
            "section": "2-3-arrayqueue",
            "question": "ArrayQueue 如何用有限数组表示 FIFO 队列？",
            "summary": "ArrayQueue 用 j 标记队首、n 记录元素数，并把第 k 个队列元素存到 (j+k) mod capacity。",
            "definition": "ArrayQueue 用后备数组 a、队首物理下标 j 和元素数 n 表示 FIFO 序列。逻辑位置 k 的元素位于 $a[(j+k)\\bmod \\mathrm{length}(a)]$，其中 $0\\le k<n$。这一不变量让队首可以随删除向前移动而无需整体搬移。",
            "analogy": "像环形传送带：j 指向当前最先取货的位置，n 表示带上有多少件货，走到末端后位置编号从开头继续。",
            "mapping": {"环形传送带": "循环数组", "取货指针": "j", "货物数量": "n"},
            "boundary": "类比不包含数组满时的扩容，也不表示数据会在内存中物理旋转。",
            "orders": [255, 256, 266, 267],
            "prereq": ["ods-modular-array-indexing"],
            "leads_to": "ods-arrayqueue-enqueue",
        },
        {
            "id": "ods-arrayqueue-enqueue",
            "title": "ArrayQueue 的入队",
            "aliases": ["enqueue", "ArrayQueue add", "循环队列入队"],
            "type": "algorithm",
            "section": "2-3-arrayqueue",
            "question": "ArrayQueue 如何在不搬移已有元素的情况下完成入队？",
            "summary": "容量足够时，新元素直接写入 (j+n) mod capacity，再把 n 加一，不移动已有队列元素。",
            "definition": "ArrayQueue 的 add(x) 在 n+1 超过容量时先 resize；随后把 x 写入物理槽位 $(j+n)\\bmod \\mathrm{length}(a)$，再令 n 增加 1。该槽位对应当前逻辑队尾之后的位置，已有元素无需移动。",
            "analogy": "在环形传送带的队尾空位放入新货，只需根据队首和现有货物数找到下一个槽位，无需推动整条货物队列。",
            "mapping": {"队尾空位": "(j+n) mod capacity", "新货": "x", "现有货物数": "n"},
            "boundary": "类比不包含数组已满时 resize 的线性复制成本。",
            "orders": [268, 269, 270],
            "prereq": ["ods-arrayqueue-representation"],
            "leads_to": "ods-arrayqueue-performance",
        },
        {
            "id": "ods-arrayqueue-dequeue",
            "title": "ArrayQueue 的出队",
            "aliases": ["dequeue", "ArrayQueue remove", "循环队列出队"],
            "type": "algorithm",
            "section": "2-3-arrayqueue",
            "question": "ArrayQueue 如何通过移动队首下标完成出队？",
            "summary": "出队保存 a[j]，把 j 更新为 (j+1) mod capacity 并把 n 减一，不搬移其余元素。",
            "definition": "ArrayQueue 的 remove() 保存队首元素 a[j]，令 $j=(j+1)\\bmod \\mathrm{length}(a)$、n 减少 1，在低占用率时可触发 resize，最后返回保存的元素。改变 j 即可让下一个元素成为新队首。",
            "analogy": "取走环形传送带当前指针处的货物后，只把取货指针前移一格，其他货物仍留在原槽位。",
            "mapping": {"当前指针": "j", "取走货物": "返回队首元素", "前移一格": "j=(j+1) mod capacity"},
            "boundary": "类比不讨论空队列错误处理，也不包含可能发生的缩容复制。",
            "orders": [271, 272],
            "prereq": ["ods-arrayqueue-representation"],
            "leads_to": "ods-arrayqueue-performance",
        },
        {
            "id": "ods-arrayqueue-resize",
            "title": "ArrayQueue 调整容量时的线性化复制",
            "aliases": ["ArrayQueue resize", "循环数组扩容", "队列线性化"],
            "type": "mechanism",
            "section": "2-3-arrayqueue",
            "question": "ArrayQueue 调整容量时如何保持队列的逻辑顺序？",
            "summary": "resize 按逻辑队列顺序复制到新数组的 0 至 n-1，并把队首 j 重置为 0。",
            "definition": "ArrayQueue 的 resize 创建长度为 $\\max(1,2n)$ 的新数组 b，并对 $k=0,\\ldots,n-1$ 执行 $b[k]=a[(j+k)\\bmod \\mathrm{length}(a)]$。复制后令 a=b、j=0，使可能跨越旧数组末端的逻辑队列在新数组中连续排列。",
            "analogy": "把环形跑道上的选手按当前领先顺序排到一条新的直道上，第一名放在直道起点，后续顺序不变。",
            "mapping": {"环形跑道": "旧循环数组", "当前领先顺序": "从 j 开始的逻辑顺序", "直道起点": "新数组下标 0"},
            "boundary": "类比只解释顺序保持与 j 归零；新容量比例仍是本实现的具体策略。",
            "orders": [273, 274, 275, 276, 277, 278],
            "prereq": ["ods-arrayqueue-representation", "ods-arraystack-resize"],
        },
        {
            "id": "ods-arrayqueue-performance",
            "title": "ArrayQueue 的操作复杂度",
            "aliases": ["ArrayQueue complexity", "循环队列复杂度"],
            "type": "theorem",
            "section": "2-3-1-summary",
            "question": "ArrayQueue 的入队、出队和容量调整具有怎样的复杂度保证？",
            "summary": "忽略 resize 时入队与出队均为 O(1)，从空队列开始的 m 次操作中所有 resize 总成本为 O(m)。",
            "definition": "ArrayQueue 实现 FIFO Queue 接口时，add(x) 与 remove() 在不触发 resize 的情况下均执行常数次数的下标计算和读写，时间为 $O(1)$。从空队列开始执行任意 m 次更新，所有 resize 的总时间为 $O(m)$，所以更新具有 $O(1)$ 摊还时间。",
            "analogy": "日常收货和取货只动队尾或队首指针；偶尔更换整条传送带的成本可分摊给更换前积累的许多次操作。",
            "mapping": {"动指针": "常数时间入队/出队", "更换传送带": "resize", "分摊": "摊还分析"},
            "boundary": "摊还常数时间不等于每次操作的最坏时间都是常数。",
            "orders": [280, 281],
            "prereq": ["ods-arrayqueue-enqueue", "ods-arrayqueue-dequeue", "ods-arrayqueue-resize"],
        },
        {
            "id": "ods-arraydeque-representation",
            "title": "ArrayDeque 的循环数组表示与访问",
            "aliases": ["ArrayDeque", "array deque", "数组双端队列"],
            "type": "concept",
            "section": "2-4-arraydeque",
            "question": "ArrayDeque 如何在循环数组中定位任意逻辑下标？",
            "summary": "ArrayDeque 复用队首 j 与元素数 n，把逻辑下标 i 映射为 (j+i) mod capacity。",
            "definition": "ArrayDeque 用数组 a、逻辑起点 j 和元素数 n 表示 List。逻辑元素 i 存放于 $a[(j+i)\\bmod \\mathrm{length}(a)]$；get 与 set 直接使用该映射，因此为常数时间。循环布局允许逻辑序列在数组末端回绕。",
            "analogy": "像环形编号的抽屉组：从标记为起点的抽屉 j 数 i 格，就能找到逻辑上的第 i 件物品。",
            "mapping": {"起点抽屉": "j", "数 i 格": "j+i", "环形编号": "对容量取模"},
            "boundary": "类比只解释逻辑到物理位置的映射，不包含插入删除时的元素搬移。",
            "orders": [283, 284, 285, 286],
            "prereq": ["ods-modular-array-indexing"],
            "leads_to": "ods-arraydeque-nearest-end-shifting",
        },
        {
            "id": "ods-arraydeque-nearest-end-shifting",
            "title": "ArrayDeque 向较近端搬移",
            "aliases": ["nearest-end shifting", "ArrayDeque add/remove"],
            "type": "mechanism",
            "section": "2-4-arraydeque",
            "question": "ArrayDeque 为什么根据 i 与 n/2 的关系选择搬移方向？",
            "summary": "它只搬移插入或删除位置到较近端之间的元素，把搬移数量限制为 min(i,n-i)。",
            "definition": "ArrayDeque 在位置 i 更新时比较 i 与 n/2。若 i 靠近逻辑前端，就调整 j 并搬移前缀；否则搬移后缀。插入与删除采用相反但对称的搬移方向，使被移动元素数不超过 $\\min\\{i,n-i\\}$，忽略 resize 的时间为 $O(1+\\min\\{i,n-i\\})$。",
            "analogy": "在一排人中腾出或补上一个位置时，选择让距离该位置更近的一端人群移动，而不是固定让整条右侧队伍移动。",
            "mapping": {"更近的一端": "min(i,n-i)", "一端人群": "前缀或后缀", "移动方向": "循环数组中的搬移分支"},
            "boundary": "类比不展示回绕下标计算，也不包含 resize 的成本。",
            "orders": [287, 288, 289, 290, 291],
            "prereq": ["ods-arraydeque-representation"],
            "leads_to": "ods-arraydeque-performance",
        },
        {
            "id": "ods-arraydeque-performance",
            "title": "ArrayDeque 的操作复杂度",
            "aliases": ["ArrayDeque complexity", "双端队列复杂度"],
            "type": "theorem",
            "section": "2-4-1-summary",
            "question": "ArrayDeque 为什么能在两端附近高效插入和删除？",
            "summary": "get/set 为 O(1)，add/remove(i) 为 O(1+min(i,n-i))，容量调整总成本可线性摊还。",
            "definition": "ArrayDeque 实现 List 接口时，get 与 set 为 $O(1)$；忽略 resize，add(i,x) 与 remove(i) 为 $O(1+\\min\\{i,n-i\\})$。从空结构开始的 m 次更新中，所有 resize 总时间为 $O(m)$，因此两端位置的更新具有常数摊还时间。",
            "analogy": "入口位于长队两端，靠近任一入口的位置都能少移动人；越接近中间，需要移动的人越多。",
            "mapping": {"两端入口": "逻辑前端与后端", "较少移动": "min(i,n-i)", "中间位置": "复杂度接近 O(n)"},
            "boundary": "类比只解释位置相关的搬移量，不保证中间位置更新是常数时间。",
            "orders": [293, 294, 295, 296, 297],
            "prereq": ["ods-arraydeque-nearest-end-shifting", "ods-arraystack-amortized-resize"],
        },
        {
            "id": "ods-dualarraydeque-representation",
            "title": "DualArrayDeque 的双栈表示",
            "aliases": ["DualArrayDeque", "two-stack deque", "双栈双端队列"],
            "type": "concept",
            "section": "2-5-dualarraydeque",
            "question": "DualArrayDeque 如何用两个 ArrayStack 表示一个逻辑序列？",
            "summary": "front 逆序保存前半段，back 正序保存后半段，元素总数等于两个栈的 size 之和。",
            "definition": "DualArrayDeque 用 front 与 back 两个 ArrayStack 表示 List。front 逆序保存逻辑前缀，back 正序保存逻辑后缀，$n=front.size()+back.size()$。若 $i<front.size()$，对应 front 中的下标为 $front.size()-i-1$；否则对应 back 中的 $i-front.size()$。",
            "analogy": "把一列卡片从中间分成两摞：左半摞倒序叠放、右半摞正序叠放，两端卡片都靠近各自栈顶。",
            "mapping": {"左半摞": "front", "右半摞": "back", "倒序叠放": "front 的反向下标映射"},
            "boundary": "类比不保证两摞始终等大；尺寸失衡由独立的 balance 机制处理。",
            "orders": [299, 300, 301, 302, 303, 304, 305],
            "prereq": ["ods-arraystack-random-access"],
            "leads_to": "ods-dualarraydeque-end-operations",
        },
        {
            "id": "ods-dualarraydeque-end-operations",
            "title": "DualArrayDeque 的按位更新",
            "aliases": ["DualArrayDeque add/remove", "双栈按位插入删除"],
            "type": "algorithm",
            "section": "2-5-dualarraydeque",
            "question": "DualArrayDeque 如何把按位插入删除转交给正确的内部栈？",
            "summary": "位置落在前半段时用反向下标操作 front，否则用偏移后的下标操作 back，随后检查平衡。",
            "definition": "DualArrayDeque 根据 i 是否小于 front.size() 选择内部栈。前半段使用反向下标，后半段使用减去 front.size() 的局部下标；add 与 remove 完成后调用 balance。忽略平衡成本，更新时间为 $O(1+\\min\\{i,n-i\\})$。",
            "analogy": "管理员先判断目标卡片属于左摞还是右摞，再换算成该摞内部的位置完成操作，最后检查两摞是否过度失衡。",
            "mapping": {"判断左右摞": "与 front.size() 比较", "换算位置": "反向或偏移下标", "检查失衡": "调用 balance"},
            "boundary": "类比不展开 balance 搬移元素的具体步骤和摊还成本。",
            "orders": [305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315],
            "prereq": ["ods-dualarraydeque-representation", "ods-arraystack-insertion", "ods-arraystack-removal"],
            "leads_to": "ods-dualarraydeque-balance",
        },
        {
            "id": "ods-dualarraydeque-balance",
            "title": "DualArrayDeque 的再平衡",
            "aliases": ["balance", "双栈再平衡", "factor-of-three invariant"],
            "type": "mechanism",
            "section": "2-5-1-balancing",
            "question": "DualArrayDeque 在什么条件下重新分配 front 与 back 的元素？",
            "summary": "当一侧超过另一侧三倍时，balance 按逻辑顺序重建两栈，使两侧分别约占一半。",
            "definition": "当元素数至少为 2 且 front 与 back 的大小相差超过 3 倍时，DualArrayDeque 的 balance 按逻辑序列重建两个 ArrayStack，使 front 保存前 $\\lfloor n/2\\rfloor$ 个元素并逆序排列，back 保存其余 $\\lceil n/2\\rceil$ 个元素并正序排列。一次重建移动 $O(n)$ 个元素。",
            "analogy": "两边货架一旦一边拥挤到远超另一边，就按整条货物顺序重新均分，左架仍反向摆放以便从左端操作。",
            "mapping": {"两边货架": "front 与 back", "超过三倍": "触发条件", "重新均分": "重建两个栈"},
            "boundary": "类比说明结构不变量，不表示每次更新都会搬货；未超过阈值时 balance 不重建。",
            "orders": [317, 318],
            "prereq": ["ods-dualarraydeque-representation"],
            "leads_to": "ods-dualarraydeque-amortized-balance",
        },
        {
            "id": "ods-dualarraydeque-amortized-balance",
            "title": "DualArrayDeque 再平衡的摊还成本",
            "aliases": ["potential method", "再平衡摊还分析", "势能法"],
            "type": "theorem",
            "section": "2-5-1-balancing",
            "question": "为什么 DualArrayDeque 的线性再平衡成本可以摊还为每次更新 O(1)？",
            "summary": "再平衡后两栈大小几乎相等，再次失衡前需积累 Ω(n) 次更新，足以分摊 O(n) 搬移。",
            "definition": "从空 DualArrayDeque 开始执行 m 次 add 与 remove，所有 balance 重建的总时间为 $O(m)$。可用势能 $\\Phi=|front.size()-back.size()|$ 说明：重建后 $\\Phi\\le1$，单次未重建更新最多让势能增加 1，而触发三倍失衡时势能大于 n/2，因此两次重建之间有与 n 同阶的更新。",
            "analogy": "天平被重新调平后，每次只加减一个砝码，必须经过许多次变化才会再次严重倾斜；调平成本可由这些变化共同承担。",
            "mapping": {"天平倾斜量": "势能 Φ", "加减砝码": "单次更新", "重新调平": "O(n) balance"},
            "boundary": "类比不替代势能不等式证明，也不保证触发重建的单次操作为常数时间。",
            "orders": [319, 320, 321, 322, 323, 324, 325],
            "prereq": ["ods-dualarraydeque-balance"],
            "leads_to": "ods-dualarraydeque-performance",
        },
        {
            "id": "ods-dualarraydeque-performance",
            "title": "DualArrayDeque 的操作复杂度",
            "aliases": ["DualArrayDeque complexity", "双栈双端队列复杂度"],
            "type": "theorem",
            "section": "2-5-2-summary",
            "question": "DualArrayDeque 是否达到与 ArrayDeque 相同的渐近性能？",
            "summary": "它的 get/set 为 O(1)，按位更新为 O(1+min(i,n-i))，resize 与 balance 总成本均可线性摊还。",
            "definition": "DualArrayDeque 实现 List 接口时，get 与 set 为 $O(1)$；忽略内部 resize 和 balance，add(i,x) 与 remove(i) 为 $O(1+\\min\\{i,n-i\\})$。从空结构开始的 m 次更新中，所有 resize 与 balance 总时间为 $O(m)$，渐近性能与 ArrayDeque 相同。",
            "analogy": "一条双向通道既可由一个环形设施实现，也可由两条背靠背的通道拼成；内部结构不同，但到两端的路程等级相同。",
            "mapping": {"环形设施": "ArrayDeque", "背靠背通道": "DualArrayDeque", "路程等级": "渐近复杂度"},
            "boundary": "相同的渐近复杂度不表示常数开销、内存布局或实际速度相同。",
            "orders": [327, 328, 329, 330, 331],
            "prereq": ["ods-dualarraydeque-end-operations", "ods-dualarraydeque-amortized-balance"],
            "relations": [{
                "type": "related",
                "target_id": "ods-arraydeque-performance",
                "description": "两种结构实现机制不同，但达到相同的按位置更新复杂度界。"
            }],
        },
        {
            "id": "ods-rootisharraystack-block-layout",
            "title": "RootishArrayStack 的递增块布局",
            "aliases": ["RootishArrayStack", "rootish blocks", "递增数组块"],
            "type": "concept",
            "section": "2-6-rootisharraystack",
            "question": "RootishArrayStack 如何用递增大小的数组块保存线性序列？",
            "summary": "它使用大小依次为 1,2,…,r 的数组块，总容量为 r(r+1)/2，并按逻辑顺序跨块存放元素。",
            "definition": "RootishArrayStack 维护 r 个数组块，第 b 个块的长度为 b+1。所有块总容量为 $1+2+\\cdots+r=r(r+1)/2$，逻辑元素按下标顺序依次填入这些块。与单一后备数组相比，它通过增加或删除整块控制额外空间。",
            "analogy": "像一组逐层变长的书架：第一层放 1 本、第二层放 2 本，依次增加，书按层连续编号摆放。",
            "mapping": {"第 b 层书架": "块 b", "层长 b+1": "块容量", "连续编号": "逻辑元素顺序"},
            "boundary": "类比不说明如何由全局下标计算块号，也不表示块在内存中彼此连续。",
            "orders": [333, 334, 335, 336, 337, 338],
            "prereq": ["ods-array-backed-storage"],
            "leads_to": "ods-rootisharraystack-index-mapping",
        },
        {
            "id": "ods-rootisharraystack-index-mapping",
            "title": "RootishArrayStack 的下标到块映射",
            "aliases": ["i2b", "rootish index mapping", "块号公式"],
            "type": "formula",
            "section": "2-6-rootisharraystack",
            "question": "RootishArrayStack 如何由逻辑下标 i 计算块号和块内下标？",
            "summary": "块号为 ceil((-3+sqrt(9+8i))/2)，块内下标为 i-b(b+1)/2。",
            "definition": "对逻辑下标 i，所在块 b 是满足 $(b+1)(b+2)/2\\ge i+1$ 的最小非负整数，因此 $b=\\lceil(-3+\\sqrt{9+8i})/2\\rceil$。在 b 之前共有 $b(b+1)/2$ 个槽位，所以块内下标为 $j=i-b(b+1)/2$。据此 get 与 set 可直接访问 blocks[b][j]。",
            "analogy": "知道一本书的总编号后，先用各层累计容量找出它落在哪层，再减去此前所有层的书数得到层内位置。",
            "mapping": {"总编号": "逻辑下标 i", "所在层": "块号 b", "此前书数": "b(b+1)/2"},
            "boundary": "类比不讨论平方根计算的机器成本、浮点舍入或替代实现。",
            "orders": [339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349],
            "prereq": ["ods-rootisharraystack-block-layout"],
            "leads_to": "ods-rootisharraystack-update",
        },
        {
            "id": "ods-rootisharraystack-update",
            "title": "RootishArrayStack 的按位插入与删除",
            "aliases": ["RootishArrayStack add/remove", "分块数组更新"],
            "type": "algorithm",
            "section": "2-6-rootisharraystack",
            "question": "RootishArrayStack 如何跨数组块完成按位插入和删除？",
            "summary": "它通过 get/set 按逻辑下标逐位搬移元素，插入右移后写入，删除左移后收回空块。",
            "definition": "RootishArrayStack 的 add(i,x) 在总容量不足时先 grow，令 n 增加，再从尾部向 i 逐个执行 set(j,get(j-1))，最后 set(i,x)。remove(i) 保存原值，从 i 起执行 set(j,get(j+1)) 左移，令 n 减少，并在存在多余空块时 shrink。忽略块增删时，两者分别为 $O(1+n-i)$ 与 $O(n-i)$。",
            "analogy": "书虽分布在不同层书架，但仍按一个总编号序列搬移；插入时从后向前挪，删除时从前向后补。",
            "mapping": {"总编号序列": "逻辑下标", "跨层挪书": "get/set 搬移", "空出或补上位置": "插入或删除"},
            "boundary": "类比不表示相邻逻辑元素一定处在同一数组块，也不含 grow/shrink 的分配成本。",
            "orders": [350, 351, 354, 355, 357],
            "prereq": ["ods-rootisharraystack-index-mapping"],
            "leads_to": "ods-rootisharraystack-performance",
        },
        {
            "id": "ods-rootisharraystack-grow-shrink",
            "title": "RootishArrayStack 的块增长与收缩",
            "aliases": ["grow/shrink", "块级扩缩容", "Rootish capacity"],
            "type": "mechanism",
            "section": "2-6-1-analysis-of-growing-and-shrinking",
            "question": "RootishArrayStack 何时增加或删除数组块？",
            "summary": "容量不足时追加长度 r+1 的块，空块超过一个时删除尾部多余块，并保持最多两个块未完全装满。",
            "definition": "若 r 个块的总容量 $r(r+1)/2$ 小于 n+1，grow 追加一个长度为 r+1 的数组块。删除后，shrink 在移除倒数第二块仍能容纳 n 个元素时持续删除尾块，从而只保留必要块和至多一个额外空块。grow 与 shrink 本身不复制已有元素。",
            "analogy": "书架坐满时只在末尾加一层更长的书架；书减少后，若末尾整层已经多余，就整层撤掉。",
            "mapping": {"加一层": "grow 追加块", "整层撤掉": "shrink 删除尾块", "坐满": "总容量不足"},
            "boundary": "类比不决定数组分配和释放的实际时间；不同运行环境可能把分配视为不同成本。",
            "orders": [352, 353, 356, 359],
            "prereq": ["ods-rootisharraystack-block-layout"],
            "leads_to": "ods-rootisharraystack-space",
        },
        {
            "id": "ods-rootisharraystack-space",
            "title": "RootishArrayStack 的浪费空间界",
            "aliases": ["wasted space", "Rootish space usage", "O(sqrt(n)) space"],
            "type": "theorem",
            "section": "2-6-2-space-usage",
            "question": "为什么 RootishArrayStack 只浪费 O(sqrt(n)) 个数组槽位？",
            "summary": "收缩规则保证最多两个末尾块不满，而块数 r=O(sqrt(n))，所以未用槽位与块目录开销均为 O(sqrt(n))。",
            "definition": "若 RootishArrayStack 存有 n 个元素和 r 个块，收缩不变量给出 $(r-2)(r-1)/2\\le n$，从而 $r\\le(3+\\sqrt{8n+1})/2=O(\\sqrt n)$。仅最后两个块可能不满，其总长度至多 2r-1；保存 r 个块引用也需 O(r) 空间，因此总浪费空间为 $O(\\sqrt n)$。",
            "analogy": "逐层变长的书架中，只有最后一两层可能空着较多位置；层数只按藏书量的平方根增长，所以空位也受平方根级别限制。",
            "mapping": {"层数": "块数 r", "最后一两层空位": "未使用数组槽位", "平方根增长": "r=O(sqrt(n))"},
            "boundary": "类比表达渐近上界，不给出具体 n 下的精确内存字节数或对象头开销。",
            "orders": [361, 362, 363, 364, 365],
            "prereq": ["ods-rootisharraystack-grow-shrink"],
            "leads_to": "ods-rootisharraystack-performance",
        },
        {
            "id": "ods-rootisharraystack-performance",
            "title": "RootishArrayStack 的时间与空间复杂度",
            "aliases": ["RootishArrayStack complexity", "Rootish 性能"],
            "type": "theorem",
            "section": "2-6-3-summary",
            "question": "RootishArrayStack 在随机访问、更新和额外空间之间做了怎样的权衡？",
            "summary": "它保留 O(1) 随机访问和 O(1+n-i) 按位更新，同时把浪费空间降为 O(sqrt(n))。",
            "definition": "RootishArrayStack 的 get 与 set 为 $O(1)$，忽略 grow 与 shrink 时，add(i,x) 与 remove(i) 为 $O(1+n-i)$。从空结构开始的 m 次更新中，块增长和收缩的总成本为 $O(m)$；在任意时刻，未使用槽位和块目录造成的额外空间为 $O(\\sqrt n)$。",
            "analogy": "它用多层书架换取更少的长期空座：找书仍可由公式直达，但在序列中间加减书仍要搬动后续书籍。",
            "mapping": {"多层书架": "递增数组块", "公式直达": "O(1) 下标映射", "搬动后续书籍": "O(n-i) 更新"},
            "boundary": "类比不表示分块一定比单数组更快；它主要改善浪费空间的渐近界。",
            "orders": [367, 368, 369, 370, 371, 372],
            "prereq": ["ods-rootisharraystack-update", "ods-rootisharraystack-grow-shrink", "ods-rootisharraystack-space"],
        },
        {
            "id": "ods-array-layout-tradeoffs",
            "title": "数组式线性表的布局权衡",
            "aliases": ["array layout comparison", "ArrayDeque vs DualArrayDeque", "tiered vector"],
            "type": "comparison",
            "section": "2-7-discussion-and-exercises",
            "question": "不同数组式线性表主要在更新位置、空间浪费和实现机制上如何取舍？",
            "summary": "单数组结构实现直接，双端结构优化靠近两端的更新，分块结构降低空闲空间但增加下标映射复杂度。",
            "definition": "ArrayStack 以单数组获得直接访问但中间更新搬移后缀；ArrayDeque 与 DualArrayDeque 把更新成本限制到距较近端的范围，后者以两个栈组合实现；RootishArrayStack 用递增块把浪费空间降为 $O(\\sqrt n)$，但需要块号计算。相关分层向量还可用不同块布局取得其他更新界。",
            "analogy": "同一批书可放在一排长架、两排背靠背的架子或逐层变长的架子上；取书、挪书和空位数量会因布局不同而变化。",
            "mapping": {"一排长架": "ArrayStack", "背靠背架子": "DualArrayDeque", "逐层变长架子": "RootishArrayStack"},
            "boundary": "类比只比较本章给出的渐近特征，不能据此断定某结构在所有工作负载和硬件上都更优。",
            "orders": [209, 242, 294, 328, 368, 374, 375],
            "prereq": ["ods-arraystack-performance", "ods-arraydeque-performance", "ods-dualarraydeque-performance", "ods-rootisharraystack-performance"],
        },
    ]

    concepts: list[dict[str, Any]] = []
    plan_sections: dict[str, list[dict[str, Any]]] = {}
    for order, spec in enumerate(specs, 1):
        prereq = spec.get("prereq", [])
        relations = list(spec.get("relations", []))
        if spec.get("leads_to"):
            relations.append({
                "type": "leads_to",
                "target_id": spec["leads_to"],
                "description": f"理解《{spec['title']}》是继续学习目标知识点的直接基础。",
            })
        src = source_ids(spec["orders"])
        concepts.append({
            "id": spec["id"],
            "title": spec["title"],
            "aliases": spec["aliases"],
            "content_type": spec["type"],
            "location": {
                "course_id": COURSE_ID,
                "chapter_id": CHAPTER_ID,
                "section_id": spec["section"],
                "parent_id": None,
                "order": order,
            },
            "core_question": spec["question"],
            "summary": spec["summary"],
            "definition": spec["definition"],
            "prerequisite_ids": prereq,
            "relations": relations,
            "rookie_explanation": {
                "analogy": spec["analogy"],
                "mapping": spec["mapping"],
                "boundary": spec["boundary"],
            },
            "retrieval": {
                "keywords": list(dict.fromkeys([spec["title"], *spec["aliases"]])),
                "query_examples": spec.get("queries", [
                    spec["question"],
                    f"{spec['title']}怎么理解",
                    f"{spec['title']}的关键条件是什么",
                ]),
            },
            "visualization_ids": VISUALIZATION_BINDINGS.get(spec["id"], []),
            "source_record_ids": src,
            "quality": {"status": "review_pending", "issues": []},
            "version": 2 if spec["id"] in VISUALIZATION_BINDINGS else 1,
        })
        plan_sections.setdefault(spec["section"], []).append({
            "temporary_id": f"candidate-{order:03d}",
            "proposed_title": spec["title"],
            "core_question": spec["question"],
            "content_type": spec["type"],
            "source_record_ids": src,
            "reason_for_separation": "该问题可独立检索和教学，并具有独立的定义、机制或复杂度结论。",
        })

    plan = {
        "chapter": CHAPTER,
        "sections": [
            {"section_id": section, "proposed_concepts": candidates}
            for section, candidates in plan_sections.items()
        ],
    }
    authoring = ROOT / "knowledge_base" / "authoring"
    write_json_atomic(authoring / "plans" / f"{CHAPTER}.json", plan)
    write_jsonl_atomic(authoring / "drafts" / f"{CHAPTER}.jsonl", concepts)

    viz_specs = {
        "ods-arraystack-insertion": ("high", "state_transition", ["容量检查", "后缀右移", "写入新元素"]),
        "ods-arraystack-resize": ("high", "state_transition", ["旧数组与有效区", "分配新数组", "复制并切换"]),
        "ods-arraystack-amortized-resize": ("medium", "math_relation", ["操作时间线", "resize 触发点", "成本分摊"]),
        "ods-arrayqueue-representation": ("high", "structure_layout", ["队首 j", "逻辑顺序", "数组末端回绕"]),
        "ods-arrayqueue-resize": ("high", "state_transition", ["跨界队列", "按逻辑顺序复制", "j 重置为 0"]),
        "ods-arraydeque-nearest-end-shifting": ("high", "algorithm_execution", ["选择较近端", "前缀搬移", "后缀搬移"]),
        "ods-dualarraydeque-representation": ("high", "structure_layout", ["front 逆序", "back 正序", "下标换算"]),
        "ods-dualarraydeque-balance": ("high", "state_transition", ["三倍失衡", "读取逻辑序列", "两侧均分"]),
        "ods-dualarraydeque-amortized-balance": ("medium", "math_relation", ["势能接近 0", "逐次变化", "达到触发阈值"]),
        "ods-rootisharraystack-block-layout": ("high", "structure_layout", ["大小 1 到 r 的块", "累计容量", "逻辑序列"]),
        "ods-rootisharraystack-index-mapping": ("high", "math_relation", ["输入 i", "计算块号 b", "计算块内下标 j"]),
        "ods-rootisharraystack-update": ("medium", "algorithm_execution", ["跨块右移", "跨块左移", "块边界高亮"]),
    }
    titles_by_id = {concept["id"]: concept["title"] for concept in concepts}
    viz_rows = [{
        "concept_id": cid,
        "recommended": True,
        "priority": priority,
        "suggested_type": viz_type,
        "reason": (
            f"《{titles_by_id[cid]}》需要同时观察"
            f"{'、'.join(scenes)}，动态或结构视图能直接呈现这些状态之间的关系。"
        ),
        "possible_scenes": scenes,
    } for cid, (priority, viz_type, scenes) in viz_specs.items()]
    write_jsonl_atomic(authoring / "viz" / f"{CHAPTER}.jsonl", viz_rows)

    dedup = [
        {
            "candidate_a": "ods-arraydeque-performance",
            "candidate_b": "ods-dualarraydeque-performance",
            "decision": "keep_both",
            "reason": "复杂度界相同，但一个基于循环数组、一个基于双栈组合，机制与检索意图不同。",
        },
        {
            "candidate_a": "ods-arraystack-resize",
            "candidate_b": "ods-arrayqueue-resize",
            "decision": "keep_both",
            "reason": "两者都重新分配数组，但 ArrayQueue 还必须按循环逻辑顺序线性化并重置 j。",
        },
    ]
    write_jsonl_atomic(authoring / "dedup" / f"{CHAPTER}.jsonl", dedup)

    analysis = """## 五、试点分析与扩展建议

- 本章按核心问题拆为 30 个知识点，覆盖表示不变量、基础操作、容量调整、摊还分析、复杂度总结与布局比较。
- 相似的复杂度总结未与机制知识点合并：机制回答“如何工作”，定理回答“可保证什么”，检索意图不同。
- 源语料中的图像已缺失，因此知识点正文不依赖图号；图注仅用于识别可视化候选。
- 当前内容全部保持 `review_pending`。自动验证通过只说明结构、引用和派生关系一致，不代表正确性已获外部审查。
- 在扩展全书前，应先完成外部 AI 结构化审查，并用至少 30 个真实中英文查询做检索回归。
"""
    (authoring / "pilot_analysis.md").parent.mkdir(parents=True, exist_ok=True)
    (authoring / "pilot_analysis.md").write_text(analysis, encoding="utf-8")

    print(f"seeded {len(concepts)} concepts and {len(viz_rows)} visualization candidates")


if __name__ == "__main__":
    main()
