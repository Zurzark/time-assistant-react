// 模拟任务数据，包含各种日期和状态的任务

export interface MockTask {
  id: string
  title: string
  completed: boolean
  dueDate?: string
  plannedDate?: string
  isFrog?: boolean
  priority?: "important-urgent" | "important-not-urgent" | "not-important-urgent" | "not-important-not-urgent"
}

// 获取今天的日期字符串 (YYYY-MM-DD)
const today = new Date().toISOString().split('T')[0]

// 获取明天的日期字符串
const getTomorrow = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

// 获取昨天的日期字符串
const getYesterday = () => {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
}

// 获取本周的某一天 (0=今天, 1=明天, -1=昨天, ...)
const getDayOfWeek = (dayOffset: number) => {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  return date.toISOString().split('T')[0]
}

// 获取下周的某一天
const getNextWeekDay = (dayOffset: number) => {
  const date = new Date()
  date.setDate(date.getDate() + 7 + dayOffset)
  return date.toISOString().split('T')[0]
}

// 模拟今日任务
export const todayTasks: MockTask[] = [
  {
    id: "t1",
    title: "完成季度项目计划",
    completed: false,
    dueDate: today,
    priority: "important-urgent",
    isFrog: true
  },
  {
    id: "t2",
    title: "与客户电话会议",
    completed: true,
    dueDate: today,
    priority: "important-urgent"
  },
  {
    id: "t3",
    title: "更新项目文档",
    completed: false,
    dueDate: today,
    priority: "important-not-urgent"
  },
  {
    id: "t4",
    title: "编写周报",
    completed: true,
    plannedDate: today,
    priority: "not-important-urgent"
  },
  {
    id: "t5",
    title: "回复紧急邮件",
    completed: false,
    plannedDate: today,
    priority: "important-urgent",
    isFrog: true
  }
]

// 模拟本周其他日期的任务
export const thisWeekTasks: MockTask[] = [
  {
    id: "w1",
    title: "团队周会",
    completed: false,
    dueDate: getDayOfWeek(1),
    priority: "important-not-urgent"
  },
  {
    id: "w2",
    title: "项目评审会议",
    completed: false,
    dueDate: getDayOfWeek(2),
    priority: "important-urgent"
  },
  {
    id: "w3",
    title: "准备演示文稿",
    completed: false,
    dueDate: getDayOfWeek(3),
    priority: "important-not-urgent",
    isFrog: true
  },
  {
    id: "w4",
    title: "代码审查",
    completed: true,
    dueDate: getDayOfWeek(-1),
    priority: "not-important-urgent"
  },
  {
    id: "w5",
    title: "更新知识库",
    completed: false,
    plannedDate: getDayOfWeek(2),
    priority: "not-important-not-urgent"
  }
]

// 下周的任务
export const nextWeekTasks: MockTask[] = [
  {
    id: "nw1",
    title: "客户项目交付",
    completed: false,
    dueDate: getNextWeekDay(0),
    priority: "important-urgent"
  },
  {
    id: "nw2",
    title: "季度回顾会议",
    completed: false,
    dueDate: getNextWeekDay(3),
    priority: "important-not-urgent"
  },
  {
    id: "nw3",
    title: "团队建设活动",
    completed: false,
    plannedDate: getNextWeekDay(4),
    priority: "not-important-not-urgent"
  }
]

// 组合所有任务
export const allTasks: MockTask[] = [
  ...todayTasks,
  ...thisWeekTasks,
  ...nextWeekTasks
]

// 统计函数，用于测试
export const getTaskStats = (tasks: MockTask[]) => {
  return {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length
  }
}

// 根据时间范围获取任务
export const getTasksByTimeRange = (range: 'today' | 'week' | 'month' | 'all') => {
  switch (range) {
    case 'today':
      return todayTasks
    case 'week':
      return [...todayTasks, ...thisWeekTasks]
    case 'month':
      return allTasks
    case 'all':
    default:
      return allTasks
  }
}