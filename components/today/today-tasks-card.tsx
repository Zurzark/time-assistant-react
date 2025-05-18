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
      alert("任务ID无效，无法添加到时间轴。");
      return;
    }
    try {
      const todayString = new Date().toISOString().split('T')[0];
      const todayDateObj = new Date(todayString + 'T00:00:00Z');

      const taskId = String(taskItem.id);
      const title = taskItem.title;
      const type = 'task';
      const date = todayString;

      let durationMinutes = 60;
      if (taskItem.estimatedPomodoros && taskItem.estimatedPomodoros > 0) {
        durationMinutes = taskItem.estimatedPomodoros * 25;
      }
      const durationMilliseconds = durationMinutes * 60 * 1000;

      const existingDbBlocks = await getAll<DBTimeBlock>(ObjectStores.TIME_BLOCKS);
      const todayBlocks = existingDbBlocks
        .filter(block => block.date === todayString && block.id !== undefined)
        .map(block => ({
          ...block,
          startTime: new Date(block.startTime), 
          endTime: new Date(block.endTime),
        }))
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      let proposedStartTime: Date | null = null;
      let proposedEndTime: Date | null = null;
      
      const now = new Date();
      const localTodayDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const earliestPossibleStart = new Date(localTodayDateObj);
      earliestPossibleStart.setHours(7, 0, 0, 0); 

      let searchStart = now > earliestPossibleStart ? new Date(now.getTime()) : new Date(earliestPossibleStart.getTime());
      
      const minutes = searchStart.getMinutes();
      const remainder = minutes % 5;
      if (remainder !== 0) {
        searchStart.setMinutes(minutes + (5 - remainder), 0, 0);
      }

      let slotFound = false;
      const MIN_GAP_MINUTES = 5; 
      const MAX_ITERATIONS = 100;
      let iterations = 0;

      while(!slotFound && iterations < MAX_ITERATIONS) {
        iterations++;
        let currentProposedStart = new Date(searchStart);
        let currentProposedEnd = new Date(currentProposedStart.getTime() + durationMilliseconds);

        let overlap = false;
        for (const block of todayBlocks) {
          if (checkTimeOverlap(currentProposedStart, currentProposedEnd, block.startTime, block.endTime, MIN_GAP_MINUTES)) {
            overlap = true;
            searchStart = new Date(block.endTime.getTime() + MIN_GAP_MINUTES * 60 * 1000);
            const currentMinutes = searchStart.getMinutes();
            const currentRemainder = currentMinutes % 5;
            if (currentRemainder !== 0) {
              searchStart.setMinutes(currentMinutes + (5 - currentRemainder), 0, 0);
            }
            break;
          }
        }

        if (!overlap) {
          const endOfDayLimit = new Date(localTodayDateObj);
          endOfDayLimit.setHours(22, 0, 0, 0); 
          if (currentProposedEnd > endOfDayLimit) {
            alert(`未能为任务 "${title}" 找到今天 ${durationMinutes} 分钟的合适时段（已到${formatTimeForDisplay(endOfDayLimit)}）。请尝试缩短任务时长或手动在时间轴上安排。`);
            return;
          }
          proposedStartTime = currentProposedStart;
          proposedEndTime = currentProposedEnd;
          slotFound = true;
        }
      }
      
      if (!slotFound || !proposedStartTime || !proposedEndTime) { 
          alert(`无法为任务 "${title}" 自动找到 ${durationMinutes} 分钟的空闲时间段。请尝试手动安排或检查当天日程。`);
          return;
      }

      const newTimeBlock: Omit<DBTimeBlock, 'id'> = {
        taskId: taskId,
        title: title,
        type: type,
        startTime: proposedStartTime,
        endTime: proposedEndTime,
        date: date,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      newTimeBlock.date = proposedStartTime.toISOString().split('T')[0];

      await addDB(ObjectStores.TIME_BLOCKS, newTimeBlock);

      window.dispatchEvent(new CustomEvent('timelineShouldUpdate'));
      alert(`任务 "${title}" 已添加到今日时间轴 ${formatTimeForDisplay(proposedStartTime)} - ${formatTimeForDisplay(proposedEndTime)}。`);

    } catch (error) {
      console.error("添加到时间轴时出错:", error);
      let errorMessage = "添加到时间轴时发生未知错误。";
      if (error instanceof Error) {
        errorMessage = `添加到时间轴失败: ${error.message}`;
      }
      alert(errorMessage);
    }
  };

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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-md font-medium">今日任务</CardTitle>
          <Button variant="ghost" size="sm" onClick={onViewAllClick}>
            查看全部
          </Button>
        </div>
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
                      <DropdownMenuItem onClick={() => handleAddTaskToTimeline(task)}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        添加到时间轴
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50">删除</DropdownMenuItem>
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
  )
} 