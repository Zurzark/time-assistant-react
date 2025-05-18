import { Task as DBTaskType } from "./db";

// Constant for no project selection in Select components
export const NO_PROJECT_VALUE = "__NONE__";

// Frontend Task Interface
export interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: "important-urgent" | "important-not-urgent" | "not-important-urgent" | "not-important-not-urgent";
  dueDate?: Date;
  projectId?: number;
  tags?: string[];
  subtasks?: { id: number; title: string; completed: boolean }[];
  isFrog?: boolean;
}

// Priority mapping from Frontend Task to DBTaskType
export const priorityMapToDB: Record<Task['priority'], DBTaskType['priority']> = {
  "important-urgent": "importantUrgent",
  "important-not-urgent": "importantNotUrgent",
  "not-important-urgent": "notImportantUrgent",
  "not-important-not-urgent": "notImportantNotUrgent",
};

// Priority mapping from DBTaskType to Frontend Task
export const priorityMapFromDB: Record<string, Task['priority']> = {
  importantUrgent: "important-urgent",
  importantNotUrgent: "important-not-urgent",
  notImportantUrgent: "not-important-urgent",
  notImportantNotUrgent: "not-important-not-urgent",
};

// Converts a partial Frontend Task to a shape suitable for DBTaskType (excluding DB-generated fields)
export const toDBTaskShape = (task: Partial<Task>): Partial<Omit<DBTaskType, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'completedAt'>> => {
  const dbTaskShape: Partial<Omit<DBTaskType, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'completedAt'>> = {
    title: task.title,
    description: task.description,
    completed: task.completed === undefined ? undefined : (task.completed ? 1 : 0) as DBTaskType['completed'],
    priority: task.priority ? priorityMapToDB[task.priority] : undefined,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    projectId: task.projectId,
    tags: task.tags,
    subtasks: task.subtasks?.map(st => ({ title: st.title, completed: st.completed ? 1 : 0 })),
    isFrog: task.isFrog === undefined ? undefined : (task.isFrog ? 1 : 0) as DBTaskType['isFrog'],
  };
  // Remove undefined keys to prevent overwriting existing DB fields with undefined
  Object.keys(dbTaskShape).forEach(key => (dbTaskShape as any)[key] === undefined && delete (dbTaskShape as any)[key]);
  return dbTaskShape;
};

// Converts a DBTaskType to a Frontend Task
export const fromDBTaskShape = (dbTask: DBTaskType): Task => {
  return {
    id: dbTask.id!,
    title: dbTask.title,
    description: dbTask.description,
    completed: !!dbTask.completed,
    priority: dbTask.priority ? (priorityMapFromDB[dbTask.priority as string] || "not-important-not-urgent") : "not-important-not-urgent",
    dueDate: dbTask.dueDate ? new Date(dbTask.dueDate) : undefined,
    projectId: dbTask.projectId,
    tags: dbTask.tags,
    subtasks: dbTask.subtasks?.map((st, index) => ({ id: index, title: st.title, completed: !!(st as any).completed })),
    isFrog: !!dbTask.isFrog,
  };
}; 