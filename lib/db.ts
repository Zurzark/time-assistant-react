// IndexedDB 数据库实现
// 定义数据库名称和版本号
const DB_NAME = 'FocusPilotDB';
const DB_VERSION = 6;

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

        // 版本 4: 添加 Milestones 对象存储并调整 Goals
        if (oldVersion < 4) {
          // 调整 Goals 存储 (如果需要显式移除旧的 milestones 字段的残留数据, 会更复杂)
          // 目前的策略是应用层不再使用 Goal.milestones 字段
          if (db.objectStoreNames.contains(ObjectStores.GOALS)) {
            // If 'milestones' was an index or part of the structure that needs changing beyond just the interface,
            // it would be handled here. Since it was just a field in the object, new code ignoring it is sufficient.
            console.log('Goals store re-evaluated for version 4: No direct milestones field.');
          }

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
  type: 'task' | 'meeting' | 'break' | 'personal' | 'plan'; // 时间块的类别/类型
  startTime: Date; // 开始时间 (包含日期和时间)
  endTime: Date; // 结束时间 (包含日期和时间)
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