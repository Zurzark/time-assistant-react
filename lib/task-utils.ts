import { Task as DBTaskType } from "@/lib/db";

export type TaskPriority = "important-urgent" | "important-not-urgent" | "not-important-urgent" | "not-important-not-urgent";

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: TaskPriority;
  projectId?: number;
  completed: boolean;
  isFrog: boolean;
  tags: string[];
  dueDate?: Date;
  subtasks: { id: number; title: string; completed: boolean }[];
  estimatedPomodoros?: number;
  createdAt: Date; // 创建时间
  completedAt?: Date; // 完成时间
}

export const NO_PROJECT_VALUE = "NO_PROJECT";

// Mapping from UI priority to DB priority string literal type
export const priorityMapToDB: Record<TaskPriority, NonNullable<DBTaskType['priority']>> = {
  "important-urgent": "importantUrgent",
  "important-not-urgent": "importantNotUrgent",
  "not-important-urgent": "notImportantUrgent",
  "not-important-not-urgent": "notImportantNotUrgent",
};

// Mapping from DB priority string literal type to UI priority
export const priorityMapFromDB: Record<NonNullable<DBTaskType['priority']>, TaskPriority> = {
  importantUrgent: "important-urgent",
  importantNotUrgent: "important-not-urgent",
  notImportantUrgent: "not-important-urgent",
  notImportantNotUrgent: "not-important-not-urgent",
};

export const fromDBTaskShape = (dbTask: DBTaskType): Task => {
  if (!dbTask || typeof dbTask.id === 'undefined') {
    console.error("Invalid dbTask provided to fromDBTaskShape:", dbTask);
    throw new Error("Invalid dbTask provided to fromDBTaskShape");
  }
  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description || "",
    priority: priorityMapFromDB[dbTask.priority || 'notImportantNotUrgent'],
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
    estimatedPomodoros: dbTask.estimatedPomodoros,
    createdAt: new Date(dbTask.createdAt),
    completedAt: dbTask.completedAt ? new Date(dbTask.completedAt) : undefined,
  };
};

export const toDBTaskShape = (task: Partial<Task>): Partial<Omit<DBTaskType, 'id' | 'createdAt' | 'updatedAt'>> => {
  const dbShape: Partial<Omit<DBTaskType, 'id' | 'createdAt' | 'updatedAt'>> = {};

  if (task.hasOwnProperty('title') && typeof task.title === 'string') dbShape.title = task.title;
  if (task.hasOwnProperty('description') && typeof task.description === 'string') dbShape.description = task.description;
  if (task.priority) dbShape.priority = priorityMapToDB[task.priority];
  
  if (typeof task.completed === 'boolean') {
    dbShape.completed = task.completed ? 1 : 0;
    if (task.hasOwnProperty('completedAt')) {
      dbShape.completedAt = task.completedAt ? new Date(task.completedAt) : undefined;
    } else if (task.completed) {
      // If task is marked complete and completedAt is not given, set to now.
      // This aligns with toggleTaskCompletion implicitly setting to now.
      dbShape.completedAt = new Date(); 
    } else {
      // If task is marked incomplete, completedAt must be undefined.
      dbShape.completedAt = undefined; 
    }
  } else if (task.hasOwnProperty('completedAt')) {
    // If completed status is not changing, but completedAt is explicitly provided (e.g. null)
     dbShape.completedAt = task.completedAt ? new Date(task.completedAt) : undefined;
  }

  if (typeof task.isFrog === 'boolean') dbShape.isFrog = task.isFrog ? 1 : 0;
  if (task.tags) dbShape.tags = task.tags;
  if (task.hasOwnProperty('dueDate')) dbShape.dueDate = task.dueDate ? new Date(task.dueDate) : undefined;
  
  if (task.hasOwnProperty('projectId')) {
    dbShape.projectId = task.projectId; 
  }

  if (task.subtasks) {
    dbShape.subtasks = task.subtasks.map(st => ({ title: st.title, completed: (st.completed ? 1 : 0) as (0|1) }));
  }
  if (task.hasOwnProperty('estimatedPomodoros')) {
    dbShape.estimatedPomodoros = task.estimatedPomodoros;
  }
  
  return dbShape;
}; 