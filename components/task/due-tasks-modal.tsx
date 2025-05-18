"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  AlertCircle, 
  ArrowDown, 
  ArrowUp, 
  Calendar, 
  Check, 
  Clock, 
  Loader2,
  MoreHorizontal, 
  Timer, 
  X 
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { type Task as DBTask, ObjectStores, getAll, update as updateDB } from "@/lib/db"

interface DueTasksModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface UITask extends DBTask {
  id: number
  dueTime?: string
  priorityDisplay?: 'high' | 'medium' | 'low'
}

export function DueTasksModal({ open, onOpenChange }: DueTasksModalProps) {
  const [allTasks, setAllTasks] = useState<UITask[]>([])
  const [processedTasks, setProcessedTasks] = useState<UITask[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<string>("date-asc")
  const [filterOption, setFilterOption] = useState<string>("all")
  const [visibleTasksCount, setVisibleTasksCount] = useState<number>(20)

  const priorityDBToDisplayMap: { [key: string]: 'high' | 'medium' | 'low' } = {
    'importantUrgent': 'high',
    'importantNotUrgent': 'medium',
    'notImportantUrgent': 'low',
    'notImportantNotUrgent': 'low',
  }
  
  const priorityDisplayToSortOrder: { [key: string]: number } = {
    'high': 1,
    'medium': 2,
    'low': 3,
  }

  const loadTasksFromDB = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const dbTasks = await getAll<DBTask>(ObjectStores.TASKS)
      const uiTasks = dbTasks
        .filter(task => !task.isDeleted && task.id !== undefined)
        .map(task => {
          let timeStr = ''
          if (task.dueDate) {
            const date = new Date(task.dueDate)
            timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
          return {
            ...task,
            id: task.id!,
            dueTime: timeStr,
            priorityDisplay: priorityDBToDisplayMap[task.priority as string] || 'medium',
          } as UITask
        })
      setAllTasks(uiTasks)
    } catch (error) {
      console.error("Error loading tasks from DB:", error)
      setLoadError("加载任务失败，请稍后重试。")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadTasksFromDB()
    }
  }, [open, loadTasksFromDB])

  useEffect(() => {
    let tasksToProcess = [...allTasks]

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in7Days = new Date(today)
    in7Days.setDate(today.getDate() + 7)

    switch (filterOption) {
      case "overdue":
        tasksToProcess = tasksToProcess.filter(task => task.dueDate && new Date(task.dueDate) < today && !task.completed)
        break
      case "today":
        tasksToProcess = tasksToProcess.filter(task => {
          if (!task.dueDate) return false
          const taskDate = new Date(task.dueDate)
          taskDate.setHours(0, 0, 0, 0)
          return taskDate.getTime() === today.getTime()
        })
        break
      case "next7days":
        tasksToProcess = tasksToProcess.filter(task => {
          if (!task.dueDate) return false
          const taskDate = new Date(task.dueDate)
          return taskDate >= today && taskDate < in7Days
        })
        break
      case "incomplete":
        tasksToProcess = tasksToProcess.filter(task => !task.completed)
        break
    }

    switch (sortOption) {
      case "date-asc":
        tasksToProcess.sort((a, b) => {
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0
          return dateA - dateB
        })
        break
      case "date-desc":
        tasksToProcess.sort((a, b) => {
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0
          return dateB - dateA
        })
        break
      case "priority-desc":
        tasksToProcess.sort((a, b) => {
          const priorityA = priorityDisplayToSortOrder[a.priorityDisplay!] || 4
          const priorityB = priorityDisplayToSortOrder[b.priorityDisplay!] || 4
          return priorityA - priorityB
        })
        break
      case "created-desc":
        tasksToProcess.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          return dateB - dateA
        })
        break
    }
    setProcessedTasks(tasksToProcess)
  }, [allTasks, sortOption, filterOption])

  const displayedTasks = processedTasks.slice(0, visibleTasksCount)
  const hasMoreTasks = visibleTasksCount < processedTasks.length

  const loadMoreTasks = () => {
    setVisibleTasksCount(prev => prev + 20)
  }

  const isTaskOverdue = (task: UITask) => {
    if (!task.dueDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(task.dueDate) < today && !task.completed
  }

  const handleTaskClick = (taskId: number) => {
    console.log(`查看任务详情: ${taskId}`)
  }

  const toggleTaskCompletion = async (taskId: number) => {
    const originalTasks = [...allTasks]
    const taskIndex = allTasks.findIndex(t => t.id === taskId)
    if (taskIndex === -1) return

    const taskToUpdate = { ...allTasks[taskIndex] }
    const newCompletedStatusBoolean = !taskToUpdate.completed

    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: newCompletedStatusBoolean ? 1 : 0 } : t))

    try {
      taskToUpdate.completed = newCompletedStatusBoolean ? 1 : 0
      taskToUpdate.updatedAt = new Date()
      const { dueTime, priorityDisplay, ...dbTask } = taskToUpdate
      await updateDB(ObjectStores.TASKS, dbTask as DBTask)
    } catch (error) {
      console.error("Error updating task completion:", error)
      setAllTasks(originalTasks)
      alert("更新任务状态失败，请重试。")
    }
  }
  
  const handleDeleteTask = async (taskId: number) => {
    const originalTasks = [...allTasks]
    
    setAllTasks(prevTasks => prevTasks.filter(task => task.id !== taskId))

    try {
      const taskToUpdate = originalTasks.find(t => t.id === taskId)
      if (taskToUpdate) {
        taskToUpdate.isDeleted = 1
        taskToUpdate.updatedAt = new Date()
        const { dueTime, priorityDisplay, ...dbTask } = taskToUpdate
        await updateDB(ObjectStores.TASKS, dbTask as DBTask)
      } else {
        throw new Error("Task not found for deletion")
      }
    } catch (error) {
      console.error('删除任务时出错:', error)
      setAllTasks(originalTasks)
      alert('删除任务失败，请重试。')
    }
  }

  const handleEditTask = (taskId: number) => {
    console.log("准备编辑任务:", taskId)
    alert(`编辑功能待实现 (任务ID: ${taskId})`)
  }

  const delayTask = async (taskId: number, delayOption: string) => {
    console.log(`推迟任务 ${taskId} 到: ${delayOption}`)
    let newDueDate: Date | undefined
    const task = allTasks.find(t => t.id === taskId)
    if (!task || !task.dueDate) {
        alert("无法推迟没有截止日期的任务。")
        return
    }

    const currentDueDate = new Date(task.dueDate)

    if (delayOption === "tomorrow") {
        newDueDate = new Date(currentDueDate.setDate(currentDueDate.getDate() + 1))
    } else if (delayOption === "next-monday") {
        newDueDate = new Date(currentDueDate)
        newDueDate.setDate(currentDueDate.getDate() + ( (1 + 7 - currentDueDate.getDay()) % 7 || 7) )
    } else if (delayOption === "custom") {
        alert("自定义日期选择待实现")
        return
    }

    if (newDueDate) {
        const originalTasks = [...allTasks]
        setAllTasks(prev => prev.map(t => t.id === taskId && t.dueDate ? { ...t, dueDate: newDueDate, dueTime: newDueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } : t))

        try {
            const taskToUpdate = originalTasks.find(t => t.id === taskId)
            if (taskToUpdate) {
                taskToUpdate.dueDate = newDueDate
                taskToUpdate.updatedAt = new Date()
                const { dueTime, priorityDisplay, ...dbTask } = taskToUpdate
                await updateDB(ObjectStores.TASKS, dbTask as DBTask)
            }
        } catch (error) {
            console.error("Error delaying task:", error)
            setAllTasks(originalTasks)
            alert("推迟任务失败，请重试。")
        }
    }
  }

  const startPomodoro = (taskId: number, taskTitle: string) => {
    console.log(`为任务 ${taskId} (${taskTitle}) 启动番茄钟`)
  }

  if (!open && !loading) {
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen)
      if (!isOpen) {
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            <span>所有到期任务</span>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex justify-between items-center py-3 border-b">
          <div className="flex space-x-2">
            <Button 
              variant={filterOption === "all" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("all")}
            >
              全部
            </Button>
            <Button 
              variant={filterOption === "overdue" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("overdue")}
            >
              已过期
            </Button>
            <Button 
              variant={filterOption === "today" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("today")}
            >
              今日到期
            </Button>
            <Button 
              variant={filterOption === "next7days" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("next7days")}
            >
              7天内到期
            </Button>
            <Button 
              variant={filterOption === "incomplete" ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilterOption("incomplete")}
            >
              未完成
            </Button>
          </div>
          
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-asc">截止日期 - 升序</SelectItem>
              <SelectItem value="date-desc">截止日期 - 降序</SelectItem>
              <SelectItem value="priority-desc">优先级 - 降序</SelectItem>
              <SelectItem value="created-desc">创建日期 - 降序</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center h-full text-red-600">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>{loadError}</p>
              <Button onClick={loadTasksFromDB} variant="outline" size="sm" className="mt-4">
                重试
              </Button>
            </div>
          ) : displayedTasks.length > 0 ? (
            <div className="space-y-3">
              {displayedTasks.map(task => (
                <div 
                  key={task.id} 
                  className={cn(
                    "flex items-start p-3 rounded-md border",
                    isTaskOverdue(task) && !task.completed 
                      ? "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800" 
                      : "border-muted bg-background"
                  )}
                >
                  <Checkbox 
                    id={`modal-task-${task.id}`} 
                    checked={!!task.completed}
                    className="mt-1 mr-3"
                    onCheckedChange={() => toggleTaskCompletion(task.id)}
                  />
                  
                  <div className="flex-1 cursor-pointer" onClick={() => handleTaskClick(task.id)}>
                    <label
                      htmlFor={`modal-task-${task.id}`}
                      className={cn(
                        "text-sm font-medium cursor-pointer",
                        task.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </label>
                    
                    <div className="flex items-center mt-1 flex-wrap gap-y-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs mr-2",
                          task.priorityDisplay === "high"
                            ? "border-red-500 text-red-500"
                            : task.priorityDisplay === "medium"
                              ? "border-amber-500 text-amber-500"
                              : "border-green-500 text-green-500",
                        )}
                      >
                        {task.priorityDisplay === "high" ? "紧急" : task.priorityDisplay === "medium" ? "中等" : "低"}
                      </Badge>
                      
                      {task.dueDate && (
                        <span className={cn(
                          "text-xs flex items-center mr-3",
                          isTaskOverdue(task) && !task.completed ? "text-red-500" : "text-muted-foreground"
                        )}>
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(task.dueDate).toLocaleDateString()} {task.dueTime}
                          {isTaskOverdue(task) && !task.completed && (
                            <AlertCircle className="h-3 w-3 ml-1 text-red-500" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => startPomodoro(task.id, task.title)}
                      title="启动番茄钟"
                    >
                      <Timer className="h-4 w-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleTaskCompletion(task.id)}>
                          {task.completed ? "标记为未完成" : "标记为已完成"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditTask(task.id)}>编辑任务</DropdownMenuItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-left">
                                推迟任务
                             </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => delayTask(task.id, "tomorrow")}>
                              推迟1天
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => delayTask(task.id, "next-monday")}>
                              推迟到下周一
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => delayTask(task.id, "custom")}>
                              选择日期...
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <DropdownMenuItem>添加到时间轴</DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50"
                        >
                          删除任务
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              
              {hasMoreTasks && (
                <Button 
                  variant="outline" 
                  className="w-full mt-4" 
                  onClick={loadMoreTasks}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  加载更多任务
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full py-12">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">太棒了！</h3>
              <p className="text-muted-foreground">
                当前筛选条件下没有任务。
              </p>
            </div>
          )}
        </div>
        
        <div className="pt-4 border-t flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            共 {processedTasks.length} 条任务符合当前筛选
          </span>
          <Button variant="default" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}