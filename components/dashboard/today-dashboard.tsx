"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PomodoroModal } from "../pomodoro/pomodoro-modal"
import { TaskStatsProvider } from "../task/task-stats-updater"
import DatabaseInitializer from "../common/database-initializer"
import { TaskStatsCard } from "../today/task-stats-card"
import { FrogTasksCard } from "../today/frog-tasks-card"
import { TimelineCard } from "../today/timeline-card"
import { UnifiedAddModal } from "../common/UnifiedAddModal"
import { TodayFocusTasks } from "../today/TodayFocusTasks"
import { Task as TaskUtilsTask } from "@/lib/task-utils"
import * as db from "@/lib/db"; // 导入数据库操作
import { toast } from "sonner"; // 导入 toast 用于提示

export function TodayDashboard() {
  const [timeRange, setTimeRange] = useState("today")
  const [pomodoroModalOpen, setPomodoroModalOpen] = useState(false)
  const [selectedTaskForPomodoro, setSelectedTaskForPomodoro] = useState<{ id: number; title: string } | null>(null)
  const [isUnifiedAddModalOpen, setIsUnifiedAddModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskUtilsTask | null>(null)
  const [todayFocusRefreshKey, setTodayFocusRefreshKey] = useState(0)

  const today = new Date()
  const formattedDate = today.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })

  const getDynamicGreeting = () => {
    const hour = today.getHours();
    if (hour >= 0 && hour < 5) return "凌晨好";
    if (hour >= 5 && hour < 9) return "早上好";
    if (hour >= 9 && hour < 12) return "上午好";
    if (hour >= 12 && hour < 14) return "中午好";
    if (hour >= 14 && hour < 18) return "下午好";
    if (hour >= 18 && hour < 19) return "傍晚好";
    if (hour >= 19 && hour < 24) return "晚上好";
    return "你好"; // Fallback
  };

  const handlePomodoroClick = (taskId: number, taskTitle: string) => {
    setSelectedTaskForPomodoro({ id: taskId, title: taskTitle })
    setPomodoroModalOpen(true)
  }

  const triggerTodayFocusRefresh = () => {
    setTodayFocusRefreshKey(prev => prev + 1)
  }

  const handleSuccessfulCreate = () => {
    console.log("Content created successfully via UnifiedAddModal, refreshing TodayFocusTasks.")
    triggerTodayFocusRefresh()
    setEditingTask(null)
  }

  const handleOpenEditTaskModal = (task: TaskUtilsTask) => {
    setEditingTask(task)
    setIsUnifiedAddModalOpen(true)
  }

  const getProjectNameById = (projectId: number | string | undefined): string => {
    if (projectId === 1) return "项目A"
    if (projectId === "proj2") return "项目B"
    return "未知项目"
  }

  const onEditTask = (task: TaskUtilsTask) => {
    handleOpenEditTaskModal(task)
  }

  const onToggleComplete = async (taskId: number) => {
    console.log("Toggle complete task in dashboard for ID:", taskId);
    try {
      const taskToUpdate = await db.get<db.Task>(db.ObjectStores.TASKS, taskId);
      if (taskToUpdate) {
        taskToUpdate.completed = taskToUpdate.completed === 1 ? 0 : 1;
        taskToUpdate.completedAt = taskToUpdate.completed === 1 ? new Date() : undefined;
        await db.update(db.ObjectStores.TASKS, taskToUpdate);
        triggerTodayFocusRefresh(); // Refresh UI after DB update
        console.log("Task completion status updated in DB and UI refreshed.");
      } else {
        console.warn("Task not found for toggling completion, ID:", taskId);
      }
    } catch (error) {
      console.error("Error toggling task complete status:", error);
      // Consider adding a user-facing error notification (e.g., toast)
    }
  }

  const onDeleteTask = async (taskId: number) => {
    console.log("Delete task in dashboard for ID:", taskId);
    // It's good practice to add a confirmation dialog before actual deletion.
    // For now, proceeding with logical deletion.
    try {
      const taskToDelete = await db.get<db.Task>(db.ObjectStores.TASKS, taskId);
      if (taskToDelete) {
        taskToDelete.isDeleted = 1;
        taskToDelete.deletedAt = new Date();
        await db.update(db.ObjectStores.TASKS, taskToDelete);
        triggerTodayFocusRefresh(); // Refresh UI after DB update
        console.log("Task marked as deleted in DB and UI refreshed.");
      } else {
        console.warn("Task not found for deletion, ID:", taskId);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      // Consider adding a user-facing error notification
    }
  }

  const onToggleFrogStatus = async (taskId: number) => {
    console.log("Toggle frog status task in dashboard for ID:", taskId);
    try {
      const taskToUpdate = await db.get<db.Task>(db.ObjectStores.TASKS, taskId);
      if (taskToUpdate) {
        taskToUpdate.isFrog = taskToUpdate.isFrog === 1 ? 0 : 1;
        await db.update(db.ObjectStores.TASKS, taskToUpdate);
        triggerTodayFocusRefresh(); // Refresh UI after DB update
        console.log("Task frog status updated in DB and UI refreshed.");
      } else {
        console.warn("Task not found for toggling frog status, ID:", taskId);
      }
    } catch (error) {
      console.error("Error toggling frog status:", error);
      toast.error("切换青蛙状态失败，请稍后重试。");
    }
  }

  const onAddTaskToTimeline = (task: TaskUtilsTask) => {
    console.log("Attempting to add task to timeline:", task.title, task.id);
    // TODO: Implement the actual logic to add the task to the timeline data store.
    // This might involve updating IndexedDB, a state variable, or calling an API.
    // Example: await db.addTimeToBlock(task) or similar.
    toast.info(`"${task.title}" 已尝试添加到时间轴。请实现具体添加逻辑。`);
    console.warn(`请在 TodayDashboard.tsx 中的 onAddTaskToTimeline 函数中实现将任务 "${task.title}" 添加到时间轴的实际逻辑。`);
    // Assuming timeline might need a refresh similar to TodayFocusTasks
    triggerTodayFocusRefresh(); 
  }

  return (
    <TaskStatsProvider>
      <DatabaseInitializer />
      
      <div className="container py-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">今日</h1>
            <p className="text-muted-foreground">{formattedDate} · {getDynamicGreeting()}，今天将是充满成就的一天！</p>
          </div>
          <Button 
            onClick={() => {
              setEditingTask(null)
              setIsUnifiedAddModalOpen(true)
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" /> 添加
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <TaskStatsCard timeRange={timeRange} setTimeRange={setTimeRange} />
              <FrogTasksCard onPomodoroClick={handlePomodoroClick} />
            </div>
            <div>
              <TodayFocusTasks
                key={todayFocusRefreshKey}
                refreshTrigger={todayFocusRefreshKey}
                getProjectNameById={getProjectNameById}
                onEditTask={onEditTask}
                onToggleComplete={onToggleComplete}
                onDeleteTask={onDeleteTask}
                onToggleFrogStatus={onToggleFrogStatus}
                onAddTaskToTimeline={onAddTaskToTimeline}
                onPomodoroClick={handlePomodoroClick}
              />
            </div>
          </div>

          <div className="lg:col-span-1 h-full">
            <TimelineCard onPomodoroClick={handlePomodoroClick} />
          </div>
        </div>

        <PomodoroModal open={pomodoroModalOpen} onOpenChange={setPomodoroModalOpen} initialTask={selectedTaskForPomodoro} />
        <UnifiedAddModal 
          open={isUnifiedAddModalOpen} 
          onOpenChange={setIsUnifiedAddModalOpen} 
          onSuccessfulCreate={handleSuccessfulCreate}
          editingTask={editingTask}
          clearEditingTask={() => setEditingTask(null)}
        />
      </div>
    </TaskStatsProvider>
  )
}
