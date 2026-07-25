import {
  communityExamCatalogSchema,
  type CommunityExamModule,
  type CommunityExamSubject,
} from "./schemas/community";

export const EXAM_MODULES: CommunityExamModule[] =
  communityExamCatalogSchema.parse([
    {
      id: "computer-science-408",
      title: "408 计算机学科专业基础",
      shortTitle: "408",
      category: "全国硕士研究生招生考试",
      description:
        "考试涵盖数据结构、计算机组成原理、操作系统和计算机网络。当前可从数据结构开始，按考纲学习核心概念与互动课件。",
      authorityLabel: "教育部统一命题科目",
      subjectLabel: "科目",
      subjects: [
        {
          id: "data-structures",
          name: "数据结构",
          description: "线性结构、树、图、查找与排序",
          availability: "first_party",
        },
        {
          id: "computer-organization",
          name: "计算机组成原理",
          description: "数据表示、存储系统与处理器",
          availability: "community_open",
        },
        {
          id: "operating-systems",
          name: "操作系统",
          description: "进程、内存、文件与 I/O",
          availability: "community_open",
        },
        {
          id: "computer-network",
          name: "计算机网络",
          description: "网络体系、协议与可靠传输",
          availability: "community_open",
        },
      ],
    },
    {
      id: "national-gaokao",
      title: "普通高考",
      shortTitle: "高考",
      category: "国家教育考试",
      description:
        "汇集语文、数学、英语与物理、化学、生物、政治、历史、地理科目课程，围绕核心考点梳理知识框架。",
      authorityLabel: "教育部教育考试院",
      subjectLabel: "科目",
      subjects: [
        {
          id: "gaokao-mathematics",
          name: "高考数学",
          description: "函数、几何、概率统计与综合应用",
          availability: "community_open",
        },
        {
          id: "gaokao-chinese",
          name: "高考语文",
          description: "阅读、语言运用与写作",
          availability: "community_open",
        },
        {
          id: "gaokao-english",
          name: "高考英语",
          description: "语言知识与综合运用",
          availability: "community_open",
        },
        {
          id: "gaokao-physics",
          name: "高考物理",
          description: "力学、电磁学与实验能力",
          availability: "community_open",
        },
        {
          id: "gaokao-chemistry",
          name: "高考化学",
          description: "物质结构、反应原理与实验",
          availability: "community_open",
        },
        {
          id: "gaokao-biology",
          name: "高考生物学",
          description: "生命过程、遗传与生态",
          availability: "community_open",
        },
        {
          id: "gaokao-politics",
          name: "思想政治",
          description: "核心概念、材料分析与表达",
          availability: "community_open",
        },
        {
          id: "gaokao-history",
          name: "高考历史",
          description: "时空线索、史料与历史解释",
          availability: "community_open",
        },
        {
          id: "gaokao-geography",
          name: "高考地理",
          description: "自然过程、人文空间与图表",
          availability: "community_open",
        },
      ],
    },
    {
      id: "postgraduate-public",
      title: "考研公共课",
      shortTitle: "考研公共课",
      category: "全国硕士研究生招生考试",
      description:
        "汇集思想政治理论、英语（一）（二）与数学（一）（二）（三）课程，按卷种组织复习讲解与练习。",
      authorityLabel: "教育部教育考试院",
      subjectLabel: "科目",
      subjects: [
        {
          id: "postgraduate-politics",
          name: "思想政治理论",
          description: "理论框架、时政材料与分析",
          availability: "community_open",
        },
        {
          id: "postgraduate-english-one",
          name: "英语（一）",
          description: "阅读、翻译与写作",
          availability: "community_open",
        },
        {
          id: "postgraduate-english-two",
          name: "英语（二）",
          description: "阅读、翻译与写作",
          availability: "community_open",
        },
        {
          id: "postgraduate-math-one",
          name: "数学（一）",
          description: "高等数学、线代与概率统计",
          availability: "community_open",
        },
        {
          id: "postgraduate-math-two",
          name: "数学（二）",
          description: "高等数学与线性代数",
          availability: "community_open",
        },
        {
          id: "postgraduate-math-three",
          name: "数学（三）",
          description: "微积分、线代与概率统计",
          availability: "community_open",
        },
      ],
    },
    {
      id: "college-english-test",
      title: "大学英语四六级",
      shortTitle: "CET",
      category: "全国教育考试",
      description:
        "设置四级、六级两个级别课程，围绕听力、阅读、翻译与写作展开系统训练。",
      authorityLabel: "教育部教育考试院",
      subjectLabel: "级别",
      subjects: [
        {
          id: "cet-four",
          name: "英语四级 CET-4",
          description: "基础阶段综合英语能力",
          availability: "community_open",
        },
        {
          id: "cet-six",
          name: "英语六级 CET-6",
          description: "进阶阶段综合英语能力",
          availability: "community_open",
        },
      ],
    },
    {
      id: "national-computer-rank",
      title: "全国计算机等级考试",
      shortTitle: "NCRE",
      category: "全国教育考试",
      description:
        "设置一级到四级课程，从计算机基础与办公应用逐步进阶到程序设计与工程师级综合能力。",
      authorityLabel: "教育部教育考试院",
      subjectLabel: "级别",
      subjects: [
        {
          id: "ncre-level-one",
          name: "一级",
          description: "计算机基础与办公应用",
          availability: "community_open",
        },
        {
          id: "ncre-level-two",
          name: "二级",
          description: "程序设计与办公高级应用",
          availability: "community_open",
        },
        {
          id: "ncre-level-three",
          name: "三级",
          description: "网络、数据库等技术方向",
          availability: "community_open",
        },
        {
          id: "ncre-level-four",
          name: "四级",
          description: "工程师级综合能力",
          availability: "community_open",
        },
      ],
    },
    {
      id: "teacher-qualification",
      title: "中小学教师资格考试",
      shortTitle: "教师资格",
      category: "国家教育考试",
      description:
        "按幼儿园、小学、初中、高中四个学段设置课程，覆盖综合素质、教育知识与学科能力。",
      authorityLabel: "教育部教育考试院",
      subjectLabel: "类别",
      subjects: [
        {
          id: "teacher-kindergarten",
          name: "幼儿园",
          description: "综合素质与保教知识能力",
          availability: "community_open",
        },
        {
          id: "teacher-primary",
          name: "小学",
          description: "综合素质与教育教学能力",
          availability: "community_open",
        },
        {
          id: "teacher-junior-secondary",
          name: "初级中学",
          description: "综合素质、教育知识与学科能力",
          availability: "community_open",
        },
        {
          id: "teacher-senior-secondary",
          name: "高级中学",
          description: "综合素质、教育知识与学科能力",
          availability: "community_open",
        },
      ],
    },
    {
      id: "adult-gaokao",
      title: "成人高考",
      shortTitle: "成人高考",
      category: "国家教育考试",
      description:
        "按高起专、高起本、专升本三个报考层次设置课程，梳理公共科目与专业基础内容。",
      authorityLabel: "教育部教育考试院",
      subjectLabel: "报考层次",
      subjects: [
        {
          id: "adult-gaokao-junior",
          name: "高中起点升专科",
          description: "按层次整理公共科目与复习经验",
          availability: "community_open",
        },
        {
          id: "adult-gaokao-bachelor",
          name: "高中起点升本科",
          description: "按层次整理公共与专业基础内容",
          availability: "community_open",
        },
        {
          id: "adult-gaokao-upgrade",
          name: "专科起点升本科",
          description: "按专业类别整理复习重点",
          availability: "community_open",
        },
      ],
    },
    {
      id: "self-taught-exam",
      title: "高等教育自学考试",
      shortTitle: "自学考试",
      category: "国家教育考试",
      description:
        "涵盖公共基础课、专业核心课、选修课与实践考核四类课程，支持按专业计划安排复习。",
      authorityLabel: "教育部教育考试院",
      subjectLabel: "类别",
      subjects: [
        {
          id: "self-taught-public",
          name: "公共基础课",
          description: "跨专业公共课程复习经验",
          availability: "community_open",
        },
        {
          id: "self-taught-core",
          name: "专业核心课",
          description: "按专业计划沉淀核心课程资料",
          availability: "community_open",
        },
        {
          id: "self-taught-elective",
          name: "选修课",
          description: "选课与阶段复习方法",
          availability: "community_open",
        },
        {
          id: "self-taught-practice",
          name: "实践考核",
          description: "实践环节准备与经验",
          availability: "community_open",
        },
      ],
    },
  ]);

function normalizeStoreSearchValue(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
}

export function filterStoreModules(query: string) {
  const normalizedQuery = normalizeStoreSearchValue(query);
  if (!normalizedQuery) {
    return EXAM_MODULES;
  }

  return EXAM_MODULES.filter((module) => {
    const searchableValues = [
      module.title,
      module.shortTitle,
      module.category,
      module.description,
      module.authorityLabel,
      module.subjectLabel,
      ...module.subjects.flatMap((subject) => [
        subject.name,
        subject.description,
      ]),
    ];
    return searchableValues.some((value) =>
      normalizeStoreSearchValue(value).includes(normalizedQuery),
    );
  });
}

export const EXAM_COURSES = EXAM_MODULES.flatMap((module) =>
  module.subjects.map((subject) => ({
    ...subject,
    examId: module.id,
    examTitle: module.title,
  })),
);

export function getExamModule(examId: string) {
  return EXAM_MODULES.find((module) => module.id === examId);
}

export function getExamCourse(courseId: string) {
  return EXAM_COURSES.find((course) => course.id === courseId);
}

export function getExamForCourse(courseId: string) {
  const course = getExamCourse(courseId);
  return course ? getExamModule(course.examId) : undefined;
}

export function getFirstExamCourse(
  module: CommunityExamModule,
): CommunityExamSubject {
  const course = module.subjects[0];
  if (!course) {
    throw new Error(`考试模块 ${module.id} 缺少科目。`);
  }
  return course;
}
