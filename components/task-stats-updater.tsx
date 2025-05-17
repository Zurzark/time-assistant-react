"use client"

import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from "react"

interface TaskStats {
  total: number
  completed: number
  pending: number
}

interface Task {
  id: string
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
  updateTaskStats: (taskId: string, completed: boolean, isNew?: boolean, isRemoved?: boolean) => void
  recalculateStats: (tasks: Task[]) => void
  addTasks: (tasks: Task[]) => void
  removeTasks: (taskIds: string[]) => void
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
        return (dueDate && dueDate >= today && dueDate < tomorrow) || 
               (plannedDate && plannedDate >= today && plannedDate < tomorrow)
      
      case "week":
        return (dueDate && dueDate >= startOfWeek && dueDate <= endOfWeek) || 
               (plannedDate && plannedDate >= startOfWeek && plannedDate <= endOfWeek)
      
      case "month":
        return (dueDate && dueDate >= startOfMonth && dueDate <= endOfMonth) || 
               (plannedDate && plannedDate >= startOfMonth && plannedDate <= endOfMonth)
      
      case "all":
      default:
        return true
    }
  }, [])
  
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
  
  // 更新任务统计的回调函数
  const updateTaskStats = useCallback((
    taskId: string, 
    completed: boolean, 
    isNew: boolean = false, 
    isRemoved: boolean = false
  ) => {
    // 获取之前的状态
    const taskIndex = tasksRef.current.findIndex(t => t.id === taskId)
    
    // 任务不存在且不是新增任务，则不处理
    if (taskIndex === -1 && !isNew) return
    
    // 任务被删除
    if (isRemoved) {
      // 更新任务列表
      tasksRef.current = tasksRef.current.filter(t => t.id !== taskId)
      // 重新计算统计数据
      calculateStatsForTimeRange(timeRange)
      return
    }
    
    // 新增任务
    if (isNew) {
      const newTask: Task = {
        id: taskId,
        title: `Task ${taskId}`, // 这里应该有实际的任务标题
        completed: completed,
        // 默认设置为今天作为截止日期
        dueDate: new Date().toISOString().split('T')[0]
      }
      
      // 添加到任务列表
      tasksRef.current.push(newTask)
      // 记录完成状态
      taskCompletionStatusRef.current[taskId] = completed
      
      // 重新计算统计数据
      calculateStatsForTimeRange(timeRange)
      return
    }
    
    // 更新现有任务的完成状态
    if (taskIndex !== -1) {
      const updatedTasks = [...tasksRef.current]
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        completed
      }
      tasksRef.current = updatedTasks
      
      // 记录完成状态
      taskCompletionStatusRef.current[taskId] = completed
      
      // 重新计算统计数据
      calculateStatsForTimeRange(timeRange)
    }
  }, [timeRange, calculateStatsForTimeRange])
  
  // 添加多个任务
  const addTasks = useCallback((tasks: Task[]) => {
    // 合并任务列表，避免重复
    const newTasks = [...tasksRef.current]
    let tasksChanged = false
    
    tasks.forEach(task => {
      const existingIndex = newTasks.findIndex(t => t.id === task.id)
      if (existingIndex === -1) {
        newTasks.push(task)
        taskCompletionStatusRef.current[task.id] = task.completed
        tasksChanged = true
      }
    })
    
    if (tasksChanged) {
      tasksRef.current = newTasks
      calculateStatsForTimeRange(timeRange)
    }
  }, [timeRange, calculateStatsForTimeRange])
  
  // 移除多个任务
  const removeTasks = useCallback((taskIds: string[]) => {
    // 过滤掉要删除的任务
    const newTasks = tasksRef.current.filter(task => !taskIds.includes(task.id))
    
    if (newTasks.length !== tasksRef.current.length) {
      tasksRef.current = newTasks
      
      // 从状态记录中移除这些任务
      const newCompletionStatus = { ...taskCompletionStatusRef.current }
      taskIds.forEach(id => {
        delete newCompletionStatus[id]
      })
      taskCompletionStatusRef.current = newCompletionStatus
      
      // 重新计算统计数据
      calculateStatsForTimeRange(timeRange)
    }
  }, [timeRange, calculateStatsForTimeRange])
  
  // 重新计算统计数据
  const recalculateStats = useCallback((tasks: Task[]) => {
    if (!tasks || tasks.length === 0) return
    
    // 更新任务列表
    tasksRef.current = tasks
    
    // 更新完成状态记录
    const newCompletionStatus: Record<string, boolean> = {}
    tasks.forEach(task => {
      newCompletionStatus[task.id] = task.completed
    })
    taskCompletionStatusRef.current = newCompletionStatus
    
    // 计算当前时间范围的统计数据
    calculateStatsForTimeRange(timeRange)
  }, [timeRange, calculateStatsForTimeRange])
  
  // 处理时间范围变更
  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range)
  }, [])
  
  // 使用memoized值包装context value，避免不必要的重渲染
  const contextValue = React.useMemo(() => ({
    stats,
    timeRange,
    setTimeRange: handleTimeRangeChange,
    updateTaskStats,
    recalculateStats,
    addTasks,
    removeTasks
  }), [
    stats, 
    timeRange, 
    handleTimeRangeChange, 
    updateTaskStats, 
    recalculateStats, 
    addTasks, 
    removeTasks
  ])
  
  return (
    <TaskStatsContext.Provider value={contextValue}>
      {children}
    </TaskStatsContext.Provider>
  )
}

export function useTaskStats() {
  return useContext(TaskStatsContext)
}