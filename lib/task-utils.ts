import { Task as DBTaskType } from "@/lib/db";

// 该模块定义了与任务相关的类型、常量和工具函数，用于在UI层和数据库层之间转换任务数据。

// 统一优先级定义，与 db.ts 和 UIPriority 一致
export type TaskPriority = "importantUrgent" | "importantNotUrgent" | "notImportantUrgent" | "notImportantNotUrgent";
export type TaskCategory = "next_action" | "someday_maybe" | "waiting_for";

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: TaskPriority; // 已更新为驼峰式
  projectId?: number;
  completed: boolean;
  isFrog: boolean;
  tags: string[];
  dueDate?: Date;
  subtasks: { id: number; title: string; completed: boolean }[];
  createdAt: Date; // 创建时间
  completedAt?: Date; // 完成时间

  category: TaskCategory;
  plannedDate?: Date;
  estimatedDurationHours?: number;
  isRecurring: boolean;
  recurrenceRule?: string;
  recurrenceEndDate?: Date;
  recurrenceCount?: number;
}

export const NO_PROJECT_VALUE = "NO_PROJECT";

// 由于 TaskPriority 已与 DBTaskType['priority'] 统一，这些映射不再需要直接转换不同格式。
// 保留这些常量可能用于其他逻辑，或可以移除。为简化，暂时注释掉，后续可根据需要恢复或移除。
/*
// Mapping from UI priority to DB priority string literal type
export const priorityMapToDB: Record<TaskPriority, NonNullable<DBTaskType['priority']>> = {
  "importantUrgent": "importantUrgent",
  "importantNotUrgent": "importantNotUrgent",
  "notImportantUrgent": "notImportantUrgent",
  "notImportantNotUrgent": "notImportantNotUrgent",
};

// Mapping from DB priority string literal type to UI priority
export const priorityMapFromDB: Record<NonNullable<DBTaskType['priority']>, TaskPriority> = {
  importantUrgent: "importantUrgent",
  importantNotUrgent: "importantNotUrgent",
  notImportantUrgent: "notImportantUrgent",
  notImportantNotUrgent: "notImportantNotUrgent",
};
*/

export const fromDBTaskShape = (dbTask: DBTaskType): Task => {
  if (!dbTask || typeof dbTask.id === 'undefined') {
    console.error("Invalid dbTask provided to fromDBTaskShape:", dbTask);
    throw new Error("Invalid dbTask provided to fromDBTaskShape");
  }
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description || "",
    // 直接使用，因为类型已统一
    priority: dbTask.priority || 'notImportantNotUrgent', 
    projectId: dbTask.projectId,
    completed: dbTask.completed === 1,
    isFrog: dbTask.isFrog === 1,
    tags: dbTask.tags || [],
    dueDate: dbTask.dueDate ? new Date(dbTask.dueDate) : undefined,
    subtasks: dbTask.subtasks?.map((st, index) => ({
      id: index, 
      title: st.title,
      completed: st.completed === 1,
    })) || [],
    createdAt: new Date(dbTask.createdAt),
    completedAt: dbTask.completedAt ? new Date(dbTask.completedAt) : undefined,

    category: (dbTask.category as TaskCategory) || "next_action",
    plannedDate: dbTask.plannedDate ? new Date(dbTask.plannedDate) : undefined,
    estimatedDurationHours: dbTask.estimatedDurationHours,
    isRecurring: dbTask.isRecurring === 1,
    recurrenceRule: dbTask.recurrenceRule as string|undefined,
    recurrenceEndDate: dbTask.recurrenceEndDate ? new Date(dbTask.recurrenceEndDate) : undefined,
    recurrenceCount: dbTask.recurrenceCount,
  };
};

export const toDBTaskShape = (task: Partial<Task>): Partial<Omit<DBTaskType, 'id' | 'createdAt' | 'updatedAt'>> => {
  const dbShape: Partial<Omit<DBTaskType, 'id' | 'createdAt' | 'updatedAt'>> = {};

  if (task.hasOwnProperty('title') && typeof task.title === 'string') dbShape.title = task.title;
  if (task.hasOwnProperty('description') && typeof task.description === 'string') dbShape.description = task.description;
  // 直接使用，因为类型已统一
  if (task.priority) dbShape.priority = task.priority; 
  
  if (typeof task.isFrog === 'boolean') dbShape.isFrog = task.isFrog ? 1 : 0;
  if (task.tags) dbShape.tags = task.tags;
  
  if (task.hasOwnProperty('isRecurring') && task.isRecurring && task.recurrenceRule) {
    dbShape.dueDate = undefined;
  } else if (task.hasOwnProperty('dueDate')) {
    dbShape.dueDate = task.dueDate ? new Date(task.dueDate) : undefined;
  }
  
  if (task.hasOwnProperty('projectId')) {
    dbShape.projectId = task.projectId; 
  }

  if (task.subtasks) {
    dbShape.subtasks = task.subtasks.map(st => ({ title: st.title, completed: (st.completed ? 1 : 0) as (0|1) }));
  }

  if (task.hasOwnProperty('category')) dbShape.category = task.category;
  if (task.hasOwnProperty('plannedDate')) dbShape.plannedDate = task.plannedDate ? new Date(task.plannedDate) : undefined;
  if (task.hasOwnProperty('estimatedDurationHours')) dbShape.estimatedDurationHours = task.estimatedDurationHours;
  
  if (typeof task.isRecurring === 'boolean') {
    dbShape.isRecurring = task.isRecurring ? 1 : 0;
    if (task.hasOwnProperty('recurrenceRule')) {
        dbShape.recurrenceRule = task.recurrenceRule;
    }
    if (task.hasOwnProperty('recurrenceEndDate')) {
        dbShape.recurrenceEndDate = task.recurrenceEndDate ? new Date(task.recurrenceEndDate) : undefined;
    } else if (task.isRecurring && task.recurrenceRule && !task.hasOwnProperty('recurrenceEndDate')) {
        dbShape.recurrenceEndDate = undefined;
    }
    if (task.hasOwnProperty('recurrenceCount')) {
        dbShape.recurrenceCount = task.recurrenceCount;
    } else if (task.isRecurring && task.recurrenceRule && !task.hasOwnProperty('recurrenceCount')) {
        dbShape.recurrenceCount = undefined;
    }

  } else {
     if (task.hasOwnProperty('recurrenceRule')) dbShape.recurrenceRule = task.recurrenceRule;
     if (task.hasOwnProperty('recurrenceEndDate')) dbShape.recurrenceEndDate = task.recurrenceEndDate ? new Date(task.recurrenceEndDate) : undefined;
     if (task.hasOwnProperty('recurrenceCount')) dbShape.recurrenceCount = task.recurrenceCount;
  }

  if (typeof task.completed === 'boolean') {
    dbShape.completed = task.completed ? 1 : 0;
    if (task.hasOwnProperty('completedAt')) {
      dbShape.completedAt = task.completedAt ? new Date(task.completedAt) : undefined;
    } else if (task.completed) {
      dbShape.completedAt = new Date(); 
    } else {
      dbShape.completedAt = undefined; 
    }
  } else if (task.hasOwnProperty('completedAt')) {
    dbShape.completedAt = task.completedAt ? new Date(task.completedAt) : undefined;
  }
  
  return dbShape;
}; 