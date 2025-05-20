"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ArrowDown,
  ArrowUp,
  MoreHorizontal,
  Timer,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  CalendarDays,
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { type Task as DBTask, ObjectStores, getAll, update as updateDB, add as addDB, type TimeBlock as DBTimeBlock } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { formatTimeForDisplay, checkTimeOverlap } from "@/lib/utils"
import { SelectTimeRangeModal } from "@/components/task/SelectTimeRangeModal"
import { toast } from "sonner"
import { type Task } from "@/lib/task-utils"

interface TodayTasksCardProps {
  onPomodoroClick: (taskId: string, taskTitle: string) => void
  onViewAllClick: () => void
  onAddTaskClick: () => void
}

interface UITodayTask extends DBTask {
  id: number
  priorityDisplay?: "high" | "medium" | "low"
}

const priorityDBToDisplayMap: { [key: string]: "high" | "medium" | "low" } = {
  "importantUrgent": "high",
  "importantNotUrgent": "medium",
  "notImportantUrgent": "low",
  "notImportantNotUrgent": "low",
}

const prioritySortMap: { [key: string]: number } = {
  "high": 1,
  "medium": 2,
  "low": 3,
}

export function TodayTasksCard({ onPomodoroClick, onViewAllClick, onAddTaskClick }: TodayTasksCardProps) {
  const [tasks, setTasks] = useState<UITodayTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSelectTimeModalOpen, setIsSelectTimeModalOpen] = useState(false)
  const [taskForTimelineModal, setTaskForTimelineModal] = useState<UITodayTask | null>(null)

  const loadTodayTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const allDbTasks = await getAll<DBTask>(ObjectStores.TASKS)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)

      const todayDbTasks = allDbTasks.filter(task => {
        if (task.isDeleted || !task.dueDate || task.id === undefined) return false
        const dueDate = new Date(task.dueDate)
        return dueDate >= today && dueDate < tomorrow
      }).map(task => ({
        ...task,
        id: task.id!,
        priorityDisplay: priorityDBToDisplayMap[task.priority as string] || "medium",
      }) as UITodayTask)
      .sort((a, b) => {
        const priorityComparison = (prioritySortMap[a.priorityDisplay!] || 3) - (prioritySortMap[b.priorityDisplay!] || 3)
        if (priorityComparison !== 0) return priorityComparison
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })

      setTasks(todayDbTasks)
    } catch (err) {
      console.error("Failed to load today's tasks:", err)
      setError("无法加载今日任务。")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTodayTasks()
  }, [loadTodayTasks])

  const handleCheckboxChange = async (taskId: number) => {
    const originalTasks = [...tasks]
    const taskIndex = tasks.findIndex(t => t.id === taskId)
    if (taskIndex === -1) return

    const taskToUpdate = { ...tasks[taskIndex] }
    const newCompletedStatus = !taskToUpdate.completed

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: newCompletedStatus ? 1 : 0 } : t))

    try {
      taskToUpdate.completed = newCompletedStatus ? 1 : 0
      taskToUpdate.updatedAt = new Date()
      if (newCompletedStatus) {
        taskToUpdate.completedAt = new Date()
      } else {
        taskToUpdate.completedAt = undefined
      }
      const { priorityDisplay, ...dbTaskPayload } = taskToUpdate
      await updateDB(ObjectStores.TASKS, dbTaskPayload as DBTask)
    } catch (err) {
      console.error("Failed to update task completion status:", err)
      setTasks(originalTasks)
      alert("更新任务状态失败，请重试。")
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    const originalTasks = [...tasks]
    setTasks(prev => prev.filter(t => t.id !== taskId))

    try {
      const taskToDelete = originalTasks.find(t => t.id === taskId)
      if (taskToDelete) {
        const updatedTask = {
          ...taskToDelete,
          isDeleted: 1,
          deletedAt: new Date(),
          updatedAt: new Date()
        }
        const { priorityDisplay, ...dbTaskPayload } = updatedTask
        await updateDB(ObjectStores.TASKS, dbTaskPayload as DBTask)
      } else {
        throw new Error("Task not found for deletion")
      }
    } catch (err) {
      console.error("Failed to delete task:", err)
      setTasks(originalTasks)
      alert("删除任务失败，请重试。")
    }
  }

  const handleAddTaskToTimeline = async (taskItem: UITodayTask) => {
    if (!taskItem.id) {
      toast.error("任务ID无效，无法添加到时间轴。")
      return
    }
    if (taskItem.completed) {
      toast.info(`任务 "${taskItem.title}" 已完成，无法直接添加到时间轴。`)
      return
    }
    setTaskForTimelineModal(taskItem)
    setIsSelectTimeModalOpen(true)
  }

  const handleConfirmTimeRangeAndAddTaskCard = async (
    taskId: string,
    taskTitle: string,
    date: string,
    startTimeString: string,
    endTimeString: string
  ) => {
    try {
      const startDateTime = new Date(`${date}T${startTimeString}`)
      const endDateTime = new Date(`${date}T${endTimeString}`)

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        toast.error("选择的日期或时间无效。")
        return
      }
      if (endDateTime <= startDateTime) {
        toast.error("结束时间必须晚于开始时间。")
        return
      }

      const newTimeBlock: Omit<DBTimeBlock, 'id'> = {
        taskId: taskId,
        title: taskTitle,
        sourceType: 'task_plan_manual_today_card',
        activityCategoryId: undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        actualStartTime: undefined,
        actualEndTime: undefined,
        isLogged: 0,
        notes: undefined,
        date: date,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await addDB(ObjectStores.TIME_BLOCKS, newTimeBlock as DBTimeBlock)
      window.dispatchEvent(new CustomEvent('timelineShouldUpdate'))
      toast.success(
        `任务 "${taskTitle}" 已添加到时间轴 ${formatTimeForDisplay(startDateTime)} - ${formatTimeForDisplay(endDateTime)}。`
      )
      setIsSelectTimeModalOpen(false)
    } catch (err) {
      console.error("添加到时间轴时出错 (TodayTasksCard):", err)
      let errorMessage = "添加到时间轴时发生未知错误。"
      if (err instanceof Error) {
        errorMessage = `添加到时间轴失败: ${err.message}`
      }
      toast.error(errorMessage)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md font-medium">今日任务</CardTitle>
        </CardHeader>
        <CardContent className="pb-2 flex justify-center items-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md font-medium">今日任务</CardTitle>
        </CardHeader>
        <CardContent className="pb-2 flex flex-col justify-center items-center h-32 text-red-500">
          <AlertCircle className="h-6 w-6 mb-2" />
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={loadTodayTasks} className="mt-2">重试</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
          <CardTitle className="text-base font-semibold">今日到期</CardTitle>
          <Button variant="ghost" size="sm" onClick={onViewAllClick}>
            查看全部
          </Button>
        </CardHeader>
        <CardContent className="pb-2">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
              <p className="text-sm text-muted-foreground">今天没有待办任务！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={`today-task-${task.id}`}
                    checked={task.completed === 1}
                    onCheckedChange={() => handleCheckboxChange(task.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`today-task-${task.id}`}
                      className={cn(
                        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                        task.completed === 1 && "line-through text-muted-foreground",
                      )}
                    >
                      {task.title}
                    </label>
                    <div className="flex items-center mt-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs mr-2",
                          task.priorityDisplay === "high" ? "border-red-500 text-red-500"
                            : task.priorityDisplay === "medium" ? "border-amber-500 text-amber-500"
                            : "border-green-500 text-green-500",
                        )}
                      >
                        {task.priorityDisplay === "high" ? "紧急" : task.priorityDisplay === "medium" ? "中等" : "低"}
                      </Badge>
                      {task.dueDate && new Date(task.dueDate).getHours() !== 0 && (
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(task.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onPomodoroClick(String(task.id), task.title)}
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
                        <DropdownMenuItem onClick={() => alert(`编辑任务: ${task.title} (ID: ${task.id})`)}>编辑</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert("标记为青蛙功能待实现")}>标记为青蛙</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddTaskToTimeline(task)} disabled={task.completed === 1}>
                          <CalendarDays className="mr-2 h-4 w-4" />
                          添加到时间轴
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-red-500">删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-2">
          <Button variant="outline" size="sm" className="w-full" onClick={onAddTaskClick}>
            添加任务
          </Button>
        </CardFooter>
      </Card>
      <SelectTimeRangeModal
        isOpen={isSelectTimeModalOpen}
        onOpenChange={setIsSelectTimeModalOpen}
        task={taskForTimelineModal as Task | null}
        onConfirm={handleConfirmTimeRangeAndAddTaskCard}
      />
    </>
  )
} 