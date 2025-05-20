// IndexedDB 数据库实现
// 定义数据库名称和版本号
const DB_NAME = 'FocusPilotDB';
const DB_VERSION = 8;

// 定义对象存储名称
export enum ObjectStores {
  TASKS = 'tasks',
  CATEGORIES = 'categories',
  SESSIONS = 'sessions',
  SETTINGS = 'settings',
  GOALS = 'goals',
  PROJECTS = 'projects',
  EVENTS = 'events',
  TIME_LOGS = 'timeLogs',
  TAGS = 'tags',
  APP_SETTINGS = 'appSettings',
  MILESTONES = 'milestones',
  TIME_BLOCKS = 'timeBlocks',
  FIXED_BREAK_RULES = 'fixedBreakRules',
  ACTIVITY_CATEGORIES = 'activityCategories',
  INBOX_ITEMS = 'inboxItems',
}

// 定义打开数据库的接口
export interface IDBResult {
  db: IDBDatabase | null;
  error: Error | null;
}

/**
 * 打开数据库连接
 * @returns Promise 解析为包含数据库连接或错误的对象
 */
export const openDB = (): Promise<IDBResult> => {
  return new Promise((resolve) => {
    // 检查浏览器是否支持 IndexedDB
    if (!window.indexedDB) {
      resolve({
        db: null,
        error: new Error('您的浏览器不支持 IndexedDB，某些功能可能无法正常工作'),
      });
      return;
    }

    try {
      // 打开数据库
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      // 处理数据库打开错误
      request.onerror = (event) => {
        console.error('打开数据库时出错:', event);
        resolve({
          db: null,
          error: new Error('打开数据库时出错'),
        });
      };

      // 处理数据库成功打开
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 设置通用错误处理器
        db.onerror = (event) => {
          console.error('数据库错误:', event);
        };
        
        resolve({
          db,
          error: null,
        });
      };

      // 数据库升级或创建
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        console.log(`数据库从版本 ${oldVersion} 升级到版本 ${DB_VERSION}`);

        // 版本 1: 创建基本对象存储
        if (oldVersion < 1) {
          // 创建任务存储
          if (!db.objectStoreNames.contains(ObjectStores.TASKS)) {
            const taskStore = db.createObjectStore(ObjectStores.TASKS, { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            
            // 创建索引
            taskStore.createIndex('title', 'title', { unique: false });
            taskStore.createIndex('byDueDate', 'dueDate', { unique: false });
            taskStore.createIndex('byCompleted', 'completed', { unique: false });
            taskStore.createIndex('byPriority', 'priority', { unique: false });
            taskStore.createIndex('byProjectId', 'projectId', { unique: false });
            taskStore.createIndex('byGoalId', 'goalId', { unique: false });
            taskStore.createIndex('byIsFrog', 'isFrog', { unique: false });
            taskStore.createIndex('byTags', 'tags', { unique: false, multiEntry: true });
            taskStore.createIndex('byPlannedDate', 'plannedDate', { unique: false });
            taskStore.createIndex('byIsDeleted', 'isDeleted', { unique: false });
            
            console.log('创建任务存储及其索引');
          }

          // 创建分类存储
          if (!db.objectStoreNames.contains(ObjectStores.CATEGORIES)) {
            const categoryStore = db.createObjectStore(ObjectStores.CATEGORIES, { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            
            // 创建索引
            categoryStore.createIndex('name', 'name', { unique: true });
            categoryStore.createIndex('color', 'color', { unique: false });
            
            console.log('创建分类存储及其索引');
          }

          // 创建专注会话存储
          if (!db.objectStoreNames.contains(ObjectStores.SESSIONS)) {
            const sessionStore = db.createObjectStore(ObjectStores.SESSIONS, { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            
            // 创建索引
            sessionStore.createIndex('taskId', 'taskId', { unique: false });
            sessionStore.createIndex('startTime', 'startTime', { unique: false });
            sessionStore.createIndex('endTime', 'endTime', { unique: false });
            sessionStore.createIndex('duration', 'duration', { unique: false });
            
            console.log('创建专注会话存储及其索引');
          }

          // 创建设置存储
          if (!db.objectStoreNames.contains(ObjectStores.SETTINGS)) {
            const settingsStore = db.createObjectStore(ObjectStores.SETTINGS, { 
              keyPath: 'id' 
            });
            
            console.log('创建设置存储');
          }
        }
        
        // 版本 2: 添加 Goals 对象存储
        if (oldVersion < 2) {
          // 创建目标存储
          if (!db.objectStoreNames.contains(ObjectStores.GOALS)) {
            const goalStore = db.createObjectStore(ObjectStores.GOALS, { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            
            // 创建索引
            goalStore.createIndex('name', 'name', { unique: false });
            goalStore.createIndex('byTargetDate', 'targetDate', { unique: false });
            goalStore.createIndex('byStatus', 'status', { unique: false });
            
            console.log('创建目标存储及其索引');
          }
        }
        
        // 版本 3: 添加 Projects、Events、TimeLogs、Tags 和 AppSettings 对象存储
        if (oldVersion < 3) {
          // 创建项目存储
          if (!db.objectStoreNames.contains(ObjectStores.PROJECTS)) {
            const projectStore = db.createObjectStore(ObjectStores.PROJECTS, { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            
            // 创建索引
            projectStore.createIndex('name', 'name', { unique: false });
            projectStore.createIndex('byGoalId', 'goalId', { unique: false });
            projectStore.createIndex('byStatus', 'status', { unique: false });
            projectStore.createIndex('byDueDate', 'dueDate', { unique: false });
            
            console.log('创建项目存储及其索引');
          }
          
          // 创建事件存储
          if (!db.objectStoreNames.contains(ObjectStores.EVENTS)) {
            const eventStore = db.createObjectStore(ObjectStores.EVENTS, { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            
            // 创建索引
            eventStore.createIndex('title', 'title', { unique: false });
            eventStore.createIndex('byStartTime', 'startTime', { unique: false });
            eventStore.createIndex('byIsRecurring', 'isRecurring', { unique: false });
            
            console.log('创建事件存储及其索引');
          }
          
          // 创建时间日志存储
          if (!db.objectStoreNames.contains(ObjectStores.TIME_LOGS)) {
            const timeLogStore = db.createObjectStore(ObjectStores.TIME_LOGS, { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            
            // 创建索引
            timeLogStore.createIndex('byTaskId', 'taskId', { unique: false });
            timeLogStore.createIndex('byProjectId', 'projectId', { unique: false });
            timeLogStore.createIndex('byStartTime', 'startTime', { unique: false });
            timeLogStore.createIndex('byDate', 'dateString', { unique: false });
            
            console.log('创建时间日志存储及其索引');
          }
          
          // 创建标签存储
          if (!db.objectStoreNames.contains(ObjectStores.TAGS)) {
            const tagStore = db.createObjectStore(ObjectStores.TAGS, { 
              keyPath: 'name' 
            });
            
            // 创建索引 (通常不需要额外索引，因为键路径已经是name)
            tagStore.createIndex('byUsageCount', 'usageCount', { unique: false });
            
            console.log('创建标签存储及其索引');
          }
          
          // 创建应用设置存储
          if (!db.objectStoreNames.contains(ObjectStores.APP_SETTINGS)) {
            const appSettingsStore = db.createObjectStore(ObjectStores.APP_SETTINGS, { 
              keyPath: 'key' 
            });
            
            console.log('创建应用设置存储');
          }
        }

        // 版本 4: 添加 Milestones 对象存储
        if (oldVersion < 4) {
          // 创建 Milestones 存储
          if (!db.objectStoreNames.contains(ObjectStores.MILESTONES)) {
            const milestoneStore = db.createObjectStore(ObjectStores.MILESTONES, {
              keyPath: 'id',
              autoIncrement: true
            });
            milestoneStore.createIndex('byGoalId', 'goalId', { unique: false });
            milestoneStore.createIndex('byTargetDate', 'targetDate', { unique: false });
            milestoneStore.createIndex('byStatus', 'status', { unique: false });
            console.log('创建 Milestones 存储及其索引');
          }
        }

        // 版本 5: 添加 TimeBlocks 对象存储
        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains(ObjectStores.TIME_BLOCKS)) {
            const timeBlockStore = db.createObjectStore(ObjectStores.TIME_BLOCKS, {
              keyPath: 'id',
              autoIncrement: true,
            });
            timeBlockStore.createIndex('byDate', 'date', { unique: false });
            timeBlockStore.createIndex('byTaskId', 'taskId', { unique: false }); // taskId 可以为 undefined，但索引仍然可以创建
            console.log('创建 TimeBlocks 存储及其索引');
          }
        }

        // 版本 6: 添加 FixedBreakRules 对象存储
        if (oldVersion < 6) {
          if (!db.objectStoreNames.contains(ObjectStores.FIXED_BREAK_RULES)) {
            const fixedBreakRuleStore = db.createObjectStore(ObjectStores.FIXED_BREAK_RULES, {
              keyPath: 'id',
              autoIncrement: true,
            });
            fixedBreakRuleStore.createIndex('byIsEnabled', 'isEnabled', { unique: false });
            console.log('创建 FixedBreakRules 存储及其索引');
          }
        }

        // 版本 7: 调整 TIME_BLOCKS, 新增 ACTIVITY_CATEGORIES, 调整 TASKS
        if (oldVersion < 7) {
          console.log(`数据库从版本 ${oldVersion} 升级到版本 7: 调整 TIME_BLOCKS, 新增 ACTIVITY_CATEGORIES`);
          const transaction = (event.target as IDBOpenDBRequest).transaction!; // Get transaction from event

          // 1. 调整 TIME_BLOCKS 对象存储
          if (db.objectStoreNames.contains(ObjectStores.TIME_BLOCKS)) {
            const timeBlockStore = transaction.objectStore(ObjectStores.TIME_BLOCKS);

            // 新增索引
            if (!timeBlockStore.indexNames.contains('byActivityCategory')) {
              timeBlockStore.createIndex('byActivityCategory', 'activityCategoryId', { unique: false });
              console.log('为 TIME_BLOCKS 添加 byActivityCategory 索引');
            }
            if (!timeBlockStore.indexNames.contains('byIsLogged')) {
              timeBlockStore.createIndex('byIsLogged', 'isLogged', { unique: false });
              console.log('为 TIME_BLOCKS 添加 byIsLogged 索引');
            }
            console.log('TIME_BLOCKS 存储结构已按版本 7 要求评估和调整索引。');
          } else {
            console.warn('TIME_BLOCKS store 不存在，无法在升级到 v7 时调整。它应该在 v5 创建。');
          }

          // 2. 新增 ACTIVITY_CATEGORIES 对象存储
          if (!db.objectStoreNames.contains(ObjectStores.ACTIVITY_CATEGORIES)) {
            const activityCategoryStore = db.createObjectStore(ObjectStores.ACTIVITY_CATEGORIES, {
              keyPath: 'id',
              autoIncrement: true, 
            });
            activityCategoryStore.createIndex('name', 'name', { unique: true });
            activityCategoryStore.createIndex('byUserId', 'userId', { unique: false }); 
            console.log('创建 ACTIVITY_CATEGORIES 存储及其索引');
          }

          // 3. (可选) 调整 TASKS 对象存储
          // 对于 TASKS，新增 defaultActivityCategoryId 字段。
          // IndexedDB 是 schemaless 的，所以不需要在 onupgradeneeded 中显式添加列。
          // 只需要更新 Task 接口，并在应用代码中写入时包含这个字段。
          console.log('TASKS 存储结构已按版本 7 要求评估（defaultActivityCategoryId 为可选字段，接口层面处理）。');
        }

        // 版本 8: 添加 INBOX_ITEMS 对象存储
        if (oldVersion < 8) {
          console.log(`数据库从版本 ${oldVersion} 升级到版本 8: 添加 INBOX_ITEMS 对象存储`);
          
          // 创建收集篮条目存储
          if (!db.objectStoreNames.contains(ObjectStores.INBOX_ITEMS)) {
            const inboxItemsStore = db.createObjectStore(ObjectStores.INBOX_ITEMS, { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            
            // 创建索引
            inboxItemsStore.createIndex('byContent', 'content', { unique: false });
            inboxItemsStore.createIndex('byCreatedAt', 'createdAt', { unique: false });
            inboxItemsStore.createIndex('byStatus', 'status', { unique: false });
            inboxItemsStore.createIndex('byRelatedTaskId', 'relatedTaskId', { unique: false });
            inboxItemsStore.createIndex('byRelatedGoalId', 'relatedGoalId', { unique: false });
            
            console.log('创建收集篮条目存储及其索引');
          }
        }
      };
    } catch (error) {
      console.error('尝试打开数据库时发生异常:', error);
      resolve({
        db: null,
        error: error instanceof Error ? error : new Error('未知错误'),
      });
    }
  });
};

/**
 * 通用添加数据方法
 * @param storeName 存储名称
 * @param data 要添加的数据
 * @returns Promise 解析为添加的数据ID
 */
export const add = <T>(storeName: ObjectStores, data: T): Promise<number> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { db, error } = await openDB();
      
      if (error || !db) {
        reject(error || new Error('无法打开数据库'));
        return;
      }
      
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.add(data);
      
      request.onsuccess = () => {
        resolve(request.result as number);
      };
      
      request.onerror = () => {
        reject(new Error('添加数据失败'));
      };
      
      // 完成后关闭数据库连接
      transaction.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      reject(error instanceof Error ? error : new Error('添加数据时发生未知错误'));
    }
  });
};

/**
 * 通用获取数据方法
 * @param storeName 存储名称
 * @param id 数据ID
 * @returns Promise 解析为查询到的数据
 */
export const get = <T>(storeName: ObjectStores, id: number | string): Promise<T> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { db, error } = await openDB();
      
      if (error || !db) {
        reject(error || new Error('无法打开数据库'));
        return;
      }
      
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result as T);
        } else {
          reject(new Error('未找到数据'));
        }
      };
      
      request.onerror = () => {
        reject(new Error('获取数据失败'));
      };
      
      // 完成后关闭数据库连接
      transaction.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      reject(error instanceof Error ? error : new Error('获取数据时发生未知错误'));
    }
  });
};

/**
 * 通用更新数据方法
 * @param storeName 存储名称
 * @param data 要更新的数据（必须包含ID）
 * @returns Promise 解析为成功状态
 */
export const update = <T>(storeName: ObjectStores, data: T): Promise<boolean> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { db, error } = await openDB();
      
      if (error || !db) {
        reject(error || new Error('无法打开数据库'));
        return;
      }
      
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put(data);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        reject(new Error('更新数据失败'));
      };
      
      // 完成后关闭数据库连接
      transaction.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      reject(error instanceof Error ? error : new Error('更新数据时发生未知错误'));
    }
  });
};

/**
 * 通用删除数据方法
 * @param storeName 存储名称
 * @param id 要删除的数据ID
 * @returns Promise 解析为成功状态
 */
export const remove = (storeName: ObjectStores, id: number | string): Promise<boolean> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { db, error } = await openDB();
      
      if (error || !db) {
        reject(error || new Error('无法打开数据库'));
        return;
      }
      
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        reject(new Error('删除数据失败'));
      };
      
      // 完成后关闭数据库连接
      transaction.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      reject(error instanceof Error ? error : new Error('删除数据时发生未知错误'));
    }
  });
};

/**
 * 获取存储中的所有数据
 * @param storeName 存储名称
 * @returns Promise 解析为所有数据的数组
 */
export const getAll = <T>(storeName: ObjectStores): Promise<T[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { db, error } = await openDB();
      
      if (error || !db) {
        reject(error || new Error('无法打开数据库'));
        return;
      }
      
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result as T[]);
      };
      
      request.onerror = () => {
        reject(new Error('获取所有数据失败'));
      };
      
      // 完成后关闭数据库连接
      transaction.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      reject(error instanceof Error ? error : new Error('获取所有数据时发生未知错误'));
    }
  });
};

/**
 * 根据索引查询数据
 * @param storeName 存储名称
 * @param indexName 索引名称
 * @param value 索引值
 * @returns Promise 解析为查询到的数据数组
 */
export const getByIndex = <T>(
  storeName: ObjectStores,
  indexName: string,
  value: IDBValidKey | IDBKeyRange
): Promise<T[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { db, error } = await openDB();
      
      if (error || !db) {
        reject(error || new Error('无法打开数据库'));
        return;
      }
      
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      if (!store.indexNames.contains(indexName)) {
        reject(new Error(`索引 ${indexName} 不存在`));
        return;
      }
      
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = () => {
        resolve(request.result as T[]);
      };
      
      request.onerror = () => {
        reject(new Error('通过索引查询数据失败'));
      };
      
      // 完成后关闭数据库连接
      transaction.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      reject(error instanceof Error ? error : new Error('通过索引查询数据时发生未知错误'));
    }
  });
};

/**
 * 清空存储
 * @param storeName 存储名称
 * @returns Promise 解析为成功状态
 */
export const clearStore = (storeName: ObjectStores): Promise<boolean> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { db, error } = await openDB();
      
      if (error || !db) {
        reject(error || new Error('无法打开数据库'));
        return;
      }
      
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.clear();
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        reject(new Error('清空存储失败'));
      };
      
      // 完成后关闭数据库连接
      transaction.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      reject(error instanceof Error ? error : new Error('清空存储时发生未知错误'));
    }
  });
};

/**
 * 初始化数据库
 * 此函数会尝试打开数据库以触发数据库创建和升级
 */
export const initDB = async (): Promise<void> => {
  try {
    const { db, error } = await openDB();
    
    if (error) {
      console.error('初始化数据库失败:', error);
      return;
    }
    
    if (db) {
      console.log('数据库初始化成功，版本:', db.version);
      db.close();
    }
  } catch (error) {
    console.error('初始化数据库时发生异常:', error);
  }
};

// 定义常见的数据类型接口，供应用其他部分使用
export interface DBMilestone {
  id?: number;
  goalId: number | string;
  title: string;
  description?: string;
  targetDate?: Date;
  status: 'pending' | 'inProgress' | 'completed' | 'blocked';
  completedDate?: Date;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id?: number;
  title: string;
  description?: string;
  priority?: 'importantUrgent' | 'importantNotUrgent' | 'notImportantUrgent' | 'notImportantNotUrgent';
  dueDate?: Date;
  completed: 0 | 1;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  projectId?: number;
  goalId?: number | string;
  isFrog: 0 | 1;
  actualPomodoros?: number;
  subtasks?: { title: string; completed: 0 | 1 }[];
  tags?: string[];
  reminderDate?: Date;
  isRecurring: 0 | 1;
  recurrenceRule?: string | object;
  plannedDate?: Date;
  order?: number;
  isDeleted: 0 | 1;
  deletedAt?: Date;
  category?: string;
  estimatedDurationHours?: number;
  recurrenceEndDate?: Date;
  recurrenceCount?: number;
  defaultActivityCategoryId?: number;
}

export interface Category {
  id?: number;
  name: string;
  color: string;
  createdAt: Date;
}

export interface Session {
  id?: number;
  taskId: number;
  startTime: Date;
  endTime?: Date;
  duration?: number; // 以毫秒为单位
  notes?: string;
}

export interface Settings {
  id: string;
  value: any;
}

export interface Goal {
  id?: number;
  name: string;
  description?: string;
  goalMeaning?: string;
  targetDate?: Date;
  status: 'active' | 'completed' | 'paused' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  progress?: number;
}

export interface Project {
  id?: number;
  name: string;
  description?: string;
  goalId?: number | string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  color?: string;
  progress: number; // 0-100 的进度值
  totalTasks?: number;
  completedTasks?: number;
}

export interface Event {
  id?: number;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrenceRule?: string | object;
  color?: string;
  location?: string;
  relatedTaskId?: number | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeLog {
  id?: number;
  taskId?: number | string;
  projectId?: number | string;
  activityDescription: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  isPomodoro: boolean;
  pomodoroCycle?: number;
  tags?: string[];
  dateString: string; // 格式为 YYYY-MM-DD，用于按日期索引
  createdAt: Date;
}

export interface Tag {
  name: string; // 作为主键
  color?: string;
  createdAt: Date;
  usageCount?: number;
}

export interface AppSetting {
  key: string; // 作为主键
  value: any;
}

export interface TimeBlock {
  id?: number; // 主键，自增
  taskId?: number | string; // 关联的任务ID (来自 'tasks' 表), 可选
  title: string; // 时间块的标题
  sourceType: string; // 新增：标识时间块的来源，例如：'fixed_break', 'task_plan', 'manual_entry', 'pomodoro_log'
  activityCategoryId?: number; // 新增：关联到 ACTIVITY_CATEGORIES (数字ID)
  startTime: Date; // 预定开始时间 (包含日期和时间)
  endTime: Date; // 预定结束时间 (包含日期和时间)
  actualStartTime?: Date; // 新增：实际开始时间
  actualEndTime?: Date; // 新增：实际结束时间
  durationMinutes?: number; // 新增: 实际花费时长（分钟），当 actualStartTime/EndTime 不方便精确提供时
  isLogged: 0 | 1; // 新增：标记是否已记录为日志 (默认为0, 在创建时处理)
  notes?: string; // 新增：备注
  date: string; // YYYY-MM-DD格式，用于快速按天查询
  createdAt: Date; // 创建时间
  updatedAt: Date; // 最后更新时间
  fixedBreakId?: string; // 新增：用于标识此时间块是否由固定休息规则生成
}

/**
 * 根据 Goal ID 获取所有里程碑
 * @param goalId 目标ID
 * @returns Promise 解析为里程碑数组
 */
export const getMilestonesByGoalId = (goalId: number | string): Promise<DBMilestone[]> => {
  return getByIndex<DBMilestone>(ObjectStores.MILESTONES, 'byGoalId', goalId);
};

/**
 * 添加新的里程碑
 * @param milestoneData 要添加的里程碑数据 (不含id)
 * @returns Promise 解析为添加的里程碑ID
 */
export const addMilestone = (milestoneData: Omit<DBMilestone, 'id'>): Promise<number> => {
  return add<Omit<DBMilestone, 'id'>>(ObjectStores.MILESTONES, milestoneData);
};

/**
 * 更新里程碑数据
 * @param milestoneData 要更新的里程碑数据 (必须包含id)
 * @returns Promise 解析为成功状态
 */
export const updateMilestone = (milestoneData: DBMilestone): Promise<boolean> => {
  return update<DBMilestone>(ObjectStores.MILESTONES, milestoneData);
};

/**
 * 删除里程碑
 * @param milestoneId 要删除的里程碑ID
 * @returns Promise 解析为成功状态
 */
export const deleteMilestone = (milestoneId: number): Promise<boolean> => {
  return remove(ObjectStores.MILESTONES, milestoneId);
};

// 定义固定休息时段的结构 (如果计划从 AppSetting 中读取)
export interface FixedBreakSchedule {
  id: string; // 唯一标识符, e.g., 'morning_break'
  title: string;
  startTime: string; // 'HH:MM'
  endTime: string;   // 'HH:MM'
  // daysOfWeek?: number[]; // 可选，简化版可不实现
}

export interface FixedBreakRule {
  id?: number; // 主键, 自增
  label?: string; // 规则标签/名称, 例如 '午休'
  startTime: string; // HH:MM格式, 例如 '12:00'
  endTime: string; // HH:MM格式, 例如 '13:00'
  daysOfWeek: string[]; // 例如 ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  isEnabled: boolean; // 此规则当前是否启用, 默认为 true
  createdAt: Date;
  updatedAt: Date;
}

// 新增 ActivityCategory 接口
export interface ActivityCategory {
  id?: number; // 主键，自增
  name: string; // 必须唯一
  color?: string; // 十六进制颜色代码
  icon?: string; // 图标名称或SVG
  isSystemCategory: 0 | 1; // 默认为0 (false)
  userId?: number; // 可选，关联用户 (数字ID)
  createdAt: Date;
  updatedAt: Date;
}

// 新增函数：根据日期获取已记录的时间块 (isLogged = 1)
export const getLoggedTimeBlocksByDate = (targetDate: string): Promise<TimeBlock[]> => {
  return new Promise(async (resolve, reject) => {
    const { db, error } = await openDB();
    if (error || !db) {
      reject(error || new Error('无法打开数据库'));
      return;
    }
    const transaction = db.transaction(ObjectStores.TIME_BLOCKS, 'readonly');
    const store = transaction.objectStore(ObjectStores.TIME_BLOCKS);
    // 假设 'byDate' 索引存在于 'date' 字段 (string YYYY-MM-DD)
    // 并且 'byIsLogged' 索引存在于 'isLogged' 字段
    // 由于 IndexedDB 标准 API 不易直接支持多索引AND查询，我们将获取日期匹配项后过滤
    // 或者，如果 'isLogged' 字段基数较低（0或1），可以考虑先查isLogged=1，再过滤日期，但通常按日期查范围更小。
    // 此处采用游标方式，在遍历日期匹配项时检查 isLogged 状态，更高效。

    const dateIndex = store.index('byDate');
    const request = dateIndex.openCursor(IDBKeyRange.only(targetDate));
    const results: TimeBlock[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const timeBlock = cursor.value as TimeBlock;
        if (timeBlock.isLogged === 1) {
          results.push(timeBlock);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => {
      console.error("Error fetching logged time blocks by date:", request.error);
      reject(new Error('按日期查询已记录的时间块失败'));
    };

    transaction.oncomplete = () => {
      db.close();
    };

    transaction.onerror = () => {
      console.error("Transaction error fetching logged time blocks by date:", transaction.error);
      reject(new Error('事务执行失败: 按日期查询已记录的时间块'));
      // Ensure db is closed on transaction error as well if not already handled by oncomplete
      // db.close(); // Be cautious about closing DB multiple times or if transaction auto-closes
    };
  });
};

// 新增函数：根据日期范围获取已记录的时间块 (isLogged = 1)
export const getLoggedTimeBlocksByDateRange = (startDate: string, endDate: string): Promise<TimeBlock[]> => {
  return new Promise(async (resolve, reject) => {
    const { db, error } = await openDB();
    if (error || !db) {
      reject(error || new Error('无法打开数据库'));
      return;
    }
    const transaction = db.transaction(ObjectStores.TIME_BLOCKS, 'readonly');
    const store = transaction.objectStore(ObjectStores.TIME_BLOCKS);
    const dateIndex = store.index('byDate'); // 确保 'byDate' 索引存在
    // IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen)
    const request = dateIndex.openCursor(IDBKeyRange.bound(startDate, endDate, false, false));
    const results: TimeBlock[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const timeBlock = cursor.value as TimeBlock;
        if (timeBlock.isLogged === 1) {
          results.push(timeBlock);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => {
      console.error("Error fetching logged time blocks by date range:", request.error);
      reject(new Error('按日期范围查询已记录的时间块失败'));
    };
    transaction.oncomplete = () => {
      db.close();
    };
    transaction.onerror = () => {
      console.error("Transaction error fetching logged time blocks by date range:", transaction.error);
      reject(new Error('事务执行失败: 按日期范围查询已记录的时间块'));
    };
  });
};

// 收集篮条目接口定义
export interface InboxItem {
  id?: number;
  content: string; // 主要内容
  notes?: string; // 可选的详细备注
  tags?: string[]; // 可选的标签
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
  status: 'unprocessed' | 'processed_to_task' | 'processed_to_goal' | 'someday_maybe' | 'archived' | 'deleted'; // 状态
  relatedTaskId?: number; // 关联的任务ID（如果已转化为任务）
  relatedGoalId?: number; // 关联的目标ID（如果已转化为目标）
}

// 获取所有未处理的收集篮条目
export const getUnprocessedInboxItems = (): Promise<InboxItem[]> => {
  return getByIndex<InboxItem>(ObjectStores.INBOX_ITEMS, 'byStatus', 'unprocessed');
};

// 添加新的收集篮条目
export const addInboxItem = (inboxItemData: Omit<InboxItem, 'id'>): Promise<number> => {
  return add<Omit<InboxItem, 'id'>>(ObjectStores.INBOX_ITEMS, inboxItemData);
};

// 更新收集篮条目
export const updateInboxItem = (inboxItemData: InboxItem): Promise<boolean> => {
  return update<InboxItem>(ObjectStores.INBOX_ITEMS, inboxItemData);
};

// 删除收集篮条目
export const deleteInboxItem = (inboxItemId: number): Promise<boolean> => {
  return remove(ObjectStores.INBOX_ITEMS, inboxItemId);
};

// 批量更新收集篮条目状态
export const updateInboxItemsStatus = async (
  itemIds: number[], 
  status: InboxItem['status'],
  relatedId?: { taskId?: number, goalId?: number }
): Promise<boolean> => {
  try {
    const { db, error } = await openDB();
    
    if (error || !db) {
      throw error || new Error('无法打开数据库');
    }
    
    const transaction = db.transaction(ObjectStores.INBOX_ITEMS, 'readwrite');
    const store = transaction.objectStore(ObjectStores.INBOX_ITEMS);
    
    // 使用Promise.all等待所有更新完成
    await Promise.all(itemIds.map(async (id) => {
      const request = store.get(id);
      
      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          const item = request.result as InboxItem;
          if (item) {
            item.status = status;
            item.updatedAt = new Date();
            
            // 如果提供了关联ID，则更新
            if (relatedId?.taskId) {
              item.relatedTaskId = relatedId.taskId;
            }
            if (relatedId?.goalId) {
              item.relatedGoalId = relatedId.goalId;
            }
            
            const updateRequest = store.put(item);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject(new Error('更新收集篮条目状态失败'));
          } else {
            resolve(); // 如果找不到项目，则跳过
          }
        };
        request.onerror = () => reject(new Error('获取收集篮条目失败'));
      });
    }));
    
    db.close();
    return true;
  } catch (error) {
    console.error('批量更新收集篮条目状态时出错:', error);
    return false;
  }
};

// 获取最近的收集篮条目（例如过去7天内创建的）
export const getRecentInboxItems = (): Promise<InboxItem[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const { db, error } = await openDB();
      
      if (error || !db) {
        reject(error || new Error('无法打开数据库'));
        return;
      }
      
      const transaction = db.transaction(ObjectStores.INBOX_ITEMS, 'readonly');
      const store = transaction.objectStore(ObjectStores.INBOX_ITEMS);
      
      // 获取7天前的日期
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const index = store.index('byCreatedAt');
      const range = IDBKeyRange.lowerBound(sevenDaysAgo);
      
      const request = index.openCursor(range);
      const results: InboxItem[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const item = cursor.value as InboxItem;
          if (item.status === 'unprocessed') {
            results.push(item);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => {
        reject(new Error('获取最近收集篮条目失败'));
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      reject(error instanceof Error ? error : new Error('获取最近收集篮条目时发生未知错误'));
    }
  });
};

// 清空所有未处理的收集篮条目（标记为deleted或物理删除）
export const clearUnprocessedInboxItems = async (shouldPhysicalDelete: boolean = false): Promise<boolean> => {
  try {
    const unprocessedItems = await getUnprocessedInboxItems();
    const itemIds = unprocessedItems.map(item => item.id!);
    
    if (shouldPhysicalDelete) {
      // 物理删除
      const { db, error } = await openDB();
      
      if (error || !db) {
        throw error || new Error('无法打开数据库');
      }
      
      const transaction = db.transaction(ObjectStores.INBOX_ITEMS, 'readwrite');
      const store = transaction.objectStore(ObjectStores.INBOX_ITEMS);
      
      await Promise.all(itemIds.map(id => 
        new Promise<void>((resolve, reject) => {
          const request = store.delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error(`删除收集篮条目 ${id} 失败`));
        })
      ));
      
      db.close();
    } else {
      // 标记为deleted
      await updateInboxItemsStatus(itemIds, 'deleted');
    }
    
    return true;
  } catch (error) {
    console.error('清空未处理收集篮条目时出错:', error);
    return false;
  }
};