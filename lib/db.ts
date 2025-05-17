// IndexedDB 数据库实现
// 定义数据库名称和版本号
const DB_NAME = 'FocusPilotDB';
const DB_VERSION = 1;

// 定义对象存储名称
export enum ObjectStores {
  TASKS = 'tasks',
  CATEGORIES = 'categories',
  SESSIONS = 'sessions',
  SETTINGS = 'settings',
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

        // 根据旧版本进行数据迁移
        if (oldVersion < 1) {
          // 创建任务存储
          if (!db.objectStoreNames.contains(ObjectStores.TASKS)) {
            const taskStore = db.createObjectStore(ObjectStores.TASKS, { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            
            // 创建索引
            taskStore.createIndex('title', 'title', { unique: false });
            taskStore.createIndex('completed', 'completed', { unique: false });
            taskStore.createIndex('dueDate', 'dueDate', { unique: false });
            taskStore.createIndex('categoryId', 'categoryId', { unique: false });
            taskStore.createIndex('priority', 'priority', { unique: false });
            
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

        // 如果将来有版本 2 的迁移，添加如下代码：
        // if (oldVersion < 2) {
        //   // 版本 2 的数据库迁移逻辑
        // }
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
export interface Task {
  id?: number;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: Date;
  categoryId?: number;
  priority?: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
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