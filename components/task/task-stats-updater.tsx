"use client"

import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from "react"
import { ObjectStores, Task as DBTask, add, update, getByIndex, getAll, get, remove } from "@/lib/db"

interface TaskStats {
  total: number
  completed: number
  pending: number
}

interface Task {
  id?: number | string
  title: string
  completed: boolean
  dueDate?: string | Date
  plannedDate?: string | Date
  isFrog?: boolean
}

type TimeRange = "today" | "week" | "month" | "all"

interface TaskStatsContextType {
  stats: TaskStats
  timeRange: TimeRange
  setTimeRange: (range: TimeRange) => void
  updateTaskStats: (taskId: string | number, completed: boolean, isNew?: boolean, isRemoved?: boolean) => void
  recalculateStats: (tasks: Task[]) => void
  addTasks: (tasks: Task[]) => void
  removeTasks: (taskIds: (string | number)[]) => void
}

const defaultStats: TaskStats = {
  total: 0,
  completed: 0,
  pending: 0
}

const TaskStatsContext = createContext<TaskStatsContextType>({
  stats: defaultStats,
  timeRange: "today",
  setTimeRange: () => {},
  updateTaskStats: () => {},
  recalculateStats: () => {},
  addTasks: () => {},
  removeTasks: () => {}
})

export function TaskStatsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<TaskStats>(defaultStats)
  const [timeRange, setTimeRange] = useState<TimeRange>("today")
  const [loading, setLoading] = useState<boolean>(true)
  
  // 使用useRef存储所有任务和任务状态
  const tasksRef = useRef<Task[]>([])
  const taskCompletionStatusRef = useRef<Record<string, boolean>>({})
  
  // 判断任务是否在当前选定的时间范围内
  const isTaskInTimeRange = useCallback((task: Task, range: TimeRange): boolean => {
    if (!task.dueDate && !task.plannedDate) {
      // 如果既没有截止日期也没有计划日期，则仅当范围为"all"时才包含
      return range === "all"
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)) // 一周从周一开始
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    
    // 处理 dueDate
    let dueDate: Date | null = null
    if (task.dueDate) {
      dueDate = typeof task.dueDate === 'string' 
        ? new Date(task.dueDate) 
        : new Date(task.dueDate)
      dueDate.setHours(0, 0, 0, 0)
    }
    
    // 处理 plannedDate
    let plannedDate: Date | null = null
    if (task.plannedDate) {
      plannedDate = typeof task.plannedDate === 'string' 
        ? new Date(task.plannedDate) 
        : new Date(task.plannedDate)
      plannedDate.setHours(0, 0, 0, 0)
    }
    
    // 根据时间范围判断任务是否应被包含
    switch (range) {
      case "today":
        return Boolean((dueDate && dueDate >= today && dueDate < tomorrow) || 
               (plannedDate && plannedDate >= today && plannedDate < tomorrow))
      
      case "week":
        return Boolean((dueDate && dueDate >= startOfWeek && dueDate <= endOfWeek) || 
               (plannedDate && plannedDate >= startOfWeek && plannedDate <= endOfWeek))
      
      case "month":
        return Boolean((dueDate && dueDate >= startOfMonth && dueDate <= endOfMonth) || 
               (plannedDate && plannedDate >= startOfMonth && plannedDate <= endOfMonth))
      
      case "all":
      default:
        return true
    }
  }, [])
  
  // 从 IndexedDB 加载所有任务
  const loadTasksFromDB = useCallback(async () => {
    try {
      setLoading(true)
      // 只获取未删除的任务 - 使用数字 0 代替布尔值 false
      const allTasks = await getByIndex<DBTask>(ObjectStores.TASKS, 'byIsDeleted', 0);
      
      // 转换为组件内部使用的任务格式
      const tasks = allTasks.map((task: DBTask) => ({
        id: task.id,
        title: task.title,
        completed: task.completed === 1, // 确保从 DBTask 的 0/1 转换为 boolean
        dueDate: task.dueDate,
        plannedDate: task.plannedDate,
        isFrog: task.isFrog === 1 // 确保从 DBTask 的 0/1 转换为 boolean
      }));
      
      // 更新任务缓存
      tasksRef.current = tasks;
      
      // 更新完成状态记录
      const newCompletionStatus: Record<string, boolean> = {};
      tasks.forEach((task: Task) => {
        if (task.id !== undefined) {
          newCompletionStatus[task.id.toString()] = task.completed;
        }
      });
      taskCompletionStatusRef.current = newCompletionStatus;
      
      // 计算当前时间范围的统计数据
      calculateStatsForTimeRange(timeRange); // calculateStatsForTimeRange 会使用 tasksRef.current
    } catch (error) {
      console.error('从IndexedDB加载任务数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]); // Removed calculateStatsForTimeRange from deps as it uses timeRange which is already a dep
  
  // 在组件挂载和时间范围变化时加载任务
  useEffect(() => {
    loadTasksFromDB();
  }, [loadTasksFromDB]); // loadTasksFromDB has timeRange as dependency

  // 添加事件监听器以响应外部数据更改
  useEffect(() => {
    const handleDataChange = () => {
      // console.log("TaskStatsProvider detected taskDataChangedForStats, reloading tasks for stats.");
      loadTasksFromDB();
    };

    window.addEventListener('taskDataChangedForStats', handleDataChange);
    return () => {
      window.removeEventListener('taskDataChangedForStats', handleDataChange);
    };
  }, [loadTasksFromDB]); // loadTasksFromDB is stable or its dependencies are correctly handled
  
  // 根据当前选择的时间范围过滤任务并计算统计数据
  const calculateStatsForTimeRange = useCallback((range: TimeRange) => {
    const filteredTasks = tasksRef.current.filter(task => isTaskInTimeRange(task, range))
    
    const newStats = {
      total: filteredTasks.length,
      completed: filteredTasks.filter(task => task.completed).length,
      pending: filteredTasks.filter(task => !task.completed).length
    }
    
    setStats(newStats)
  }, [isTaskInTimeRange])
  
  // 当时间范围变化时重新计算统计数据
  useEffect(() => {
    calculateStatsForTimeRange(timeRange)
  }, [timeRange, calculateStatsForTimeRange])
  
  // 更新任务统计的回调函数 - 同时更新IndexedDB
  const updateTaskStats = useCallback(async (
    taskId: string | number, 
    completed: boolean, 
    isNew: boolean = false, 
    isRemoved: boolean = false
  ) => {
    // 获取之前的状态
    const taskIndex = tasksRef.current.findIndex(t => t.id == taskId)
    
    // 任务不存在且不是新增任务，则不处理
    if (taskIndex === -1 && !isNew) return
    
    // 任务被删除
    if (isRemoved) {
      // 更新任务列表
      tasksRef.current = tasksRef.current.filter(t => t.id != taskId)
      
      try {
        // 在IndexedDB中标记为删除（软删除）
        const task = await get<DBTask>(ObjectStores.TASKS, taskId);
        
        if (task) {
          task.isDeleted = 1; // Correct: 1 for true
          task.deletedAt = new Date();
          await update(ObjectStores.TASKS, task);
        }
      } catch (error) {
        console.error('删除任务时发生错误:', error);
      }
      
      // 重新计算统计数据
      calculateStatsForTimeRange(timeRange)
      return
    }
    
    // 新增任务
    if (isNew) {
      try {
        // 创建新任务对象
        const newTask: Partial<DBTask> = {
        title: `Task ${taskId}`, // 这里应该有实际的任务标题
        completed: completed ? 1 : 0, // Correct: convert boolean to 0/1
          isFrog: 0, // Default to false (0)
          isDeleted: 0, // Default to false (0)
          isRecurring: 0, // Default to false (0)
          createdAt: new Date(),
          updatedAt: new Date(),
        // 默认设置为今天作为截止日期
          dueDate: new Date(),
        };
        
        // 添加到 IndexedDB
        const newId = await add(ObjectStores.TASKS, newTask as DBTask); // Cast as DBTask for add
        
        // 使用返回的 ID 创建任务对象
        const taskForState = {
          id: newId,
          title: newTask.title || "",
          completed: completed,
          dueDate: newTask.dueDate,
        };
      
      // 添加到任务列表
        tasksRef.current.push(taskForState);
        
      // 记录完成状态
        taskCompletionStatusRef.current[newId.toString()] = completed;
        
      } catch (error) {
        console.error('添加新任务时发生错误:', error);
      }
    } else {
      // 更新现有任务
      try {
        // 更新本地状态
        tasksRef.current[taskIndex].completed = completed;
        taskCompletionStatusRef.current[taskId.toString()] = completed;
        
        // 更新 IndexedDB
        const task = await get<DBTask>(ObjectStores.TASKS, taskId);
        if (task) {
          task.completed = completed ? 1 : 0; // Correct: convert boolean to 0/1
          if (completed) {
            task.completedAt = new Date();
          } else {
            task.completedAt = undefined;
      }
          task.updatedAt = new Date();
          await update(ObjectStores.TASKS, task);
        }
      } catch (error) {
        console.error('更新任务状态时发生错误:', error);
        // 恢复之前的状态
        tasksRef.current[taskIndex].completed = !completed;
        taskCompletionStatusRef.current[taskId.toString()] = !completed;
      }
    }
      
      // 重新计算统计数据
      calculateStatsForTimeRange(timeRange)
  }, [calculateStatsForTimeRange, timeRange])
  
  // 添加多个任务
  const addTasks = useCallback(async (tasks: Task[]) => {
    try {
      for (const taskData of tasks) {
        if (typeof taskData.id === 'string' && taskData.id.startsWith('new-')) {
          // 新任务，需要添加到 IndexedDB
          const newTask: Partial<DBTask> = {
            title: taskData.title,
            description: '',
            completed: (taskData.completed || false) ? 1 : 0, // Correct
            createdAt: new Date(),
            updatedAt: new Date(),
            isFrog: (taskData.isFrog || false) ? 1 : 0, // Correct
            isRecurring: 0, // Assuming false as default, converted to 0
            isDeleted: 0, // Assuming false as default, converted to 0
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
            plannedDate: taskData.plannedDate ? new Date(taskData.plannedDate) : undefined,
          };
          
          // 添加到 IndexedDB
          const newId = await add(ObjectStores.TASKS, newTask as DBTask); // Cast as DBTask for add
          
          // 更新本地任务 ID
          taskData.id = newId;
        } else {
          // 更新现有任务
          const existingTask = await get<DBTask>(ObjectStores.TASKS, taskData.id!);
          if (existingTask) {
            // 仅更新指定的字段
            const updatedTaskData: Partial<DBTask> = {
              title: taskData.title || existingTask.title,
              completed: taskData.completed !== undefined ? (taskData.completed ? 1 : 0) : existingTask.completed, // Correct
              dueDate: taskData.dueDate ? new Date(taskData.dueDate) : existingTask.dueDate,
              plannedDate: taskData.plannedDate ? new Date(taskData.plannedDate) : existingTask.plannedDate,
              isFrog: taskData.isFrog !== undefined ? (taskData.isFrog ? 1 : 0) : existingTask.isFrog, // Correct
              updatedAt: new Date(),
            };
            // Merge with existingTask to ensure all fields are present for update
            const finalUpdate = { ...existingTask, ...updatedTaskData };
            await update(ObjectStores.TASKS, finalUpdate);
          }
        }
      }
      
      // 重新加载数据
      await loadTasksFromDB();
    } catch (error) {
      console.error('添加或更新任务时发生错误:', error);
    }
  }, [loadTasksFromDB]);
  
  // 移除多个任务（软删除）
  const removeTasks = useCallback(async (taskIds: (string | number)[]) => {
    try {
      for (const taskId of taskIds) {
        // 标记为已删除
        const task = await get<DBTask>(ObjectStores.TASKS, taskId);
        if (task) {
          task.isDeleted = 1; // Correct
          task.deletedAt = new Date();
          await update(ObjectStores.TASKS, task);
        }
      }
      
      // 更新本地状态
      tasksRef.current = tasksRef.current.filter(task => 
        task.id !== undefined && !taskIds.includes(task.id)
      );
      
      // 更新统计
      calculateStatsForTimeRange(timeRange);
    } catch (error) {
      console.error('删除任务时发生错误:', error);
    }
  }, [calculateStatsForTimeRange, timeRange]);
  
  // 根据提供的任务列表重新计算统计数据
  const recalculateStats = useCallback((tasks: Task[]) => {
    const filteredTasks = tasks.filter(task => isTaskInTimeRange(task, timeRange))
    
    const newStats = {
      total: filteredTasks.length,
      completed: filteredTasks.filter(task => task.completed).length,
      pending: filteredTasks.filter(task => !task.completed).length
    }
    
    setStats(newStats)
  }, [isTaskInTimeRange, timeRange])

  return (
    <TaskStatsContext.Provider
      value={{
    stats,
    timeRange,
        setTimeRange,
    updateTaskStats,
    recalculateStats,
    addTasks,
    removeTasks
      }}
    >
      {children}
    </TaskStatsContext.Provider>
  )
}

export function useTaskStats() {
  const context = useContext(TaskStatsContext)
  
  if (context === undefined) {
    throw new Error('useTaskStats must be used within a TaskStatsProvider')
  }
  
  return context
}