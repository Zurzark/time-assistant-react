"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PomodoroModal } from "../pomodoro/pomodoro-modal"
import { TaskStatsProvider } from "../task/task-stats-updater"
import DatabaseInitializer from "../common/database-initializer"
import { TaskStatsCard } from "../today/task-stats-card"
import { QuickInboxCard } from "../today/quick-inbox-card"
import { TimelineCard } from "../today/timeline-card"
import { UnifiedAddModal } from "../common/UnifiedAddModal"
import { TodayFocusTasks } from "../today/TodayFocusTasks"
import { Task as TaskUtilsTask, toDBTaskShape } from "@/lib/task-utils"
import * as db from "@/lib/db"
import { toast } from "sonner"

// Import useTaskData and SelectTimeRangeModal
import { useTaskData } from "@/components/task/tasks-view/hooks/useTaskData"
import { SelectTimeRangeModal } from "@/components/task/SelectTimeRangeModal";
import { usePomodoroController } from "@/components/pomodoro/pomodoro-context"

export function TodayDashboard() {
  const [timeRange, setTimeRange] = useState("today")
  const [isUnifiedAddModalOpen, setIsUnifiedAddModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskUtilsTask | null>(null)
  const [todayFocusRefreshKey, setTodayFocusRefreshKey] = useState(0)
  const [projects, setProjects] = useState<db.Project[]>([])

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const allProjects = await db.getAll<db.Project>(db.ObjectStores.PROJECTS)
        setProjects(allProjects)
      } catch (error) {
        console.error("Failed to fetch projects:", error)
      }
    }
    fetchProjects()
  }, [])

  useEffect(() => {
    const handleTaskUpdate = () => {
        triggerTodayFocusRefresh()
    }
    window.addEventListener('taskDataChangedForStats', handleTaskUpdate)
    return () => {
        window.removeEventListener('taskDataChangedForStats', handleTaskUpdate)
    }
  }, [])
  
  // Use useTaskData for timeline functionality
  const {
    handleAddTaskToTimeline: openTimeSelectModal, // Rename for clarity in this context
    isSelectTimeModalOpen,
    setIsSelectTimeModalOpen,
    taskForTimelineModal,
    handleConfirmTimeRangeAndAddTask,
    // We might need other things from useTaskData if interaction is deeper, but for now, this is minimal.
  } = useTaskData();

  const { openPomodoroForTask } = usePomodoroController();

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
    openPomodoroForTask(taskId, taskTitle)
  }

  const triggerTodayFocusRefresh = () => {
    setTodayFocusRefreshKey(prev => prev + 1)
  }

  const handleSuccessfulCreate = () => {
    console.log("Content created successfully via UnifiedAddModal, refreshing TodayFocusTasks.")
    triggerTodayFocusRefresh()
    setEditingTask(null)
    window.dispatchEvent(new CustomEvent('taskDataChangedForStats'))
  }

  const handleOpenEditTaskModal = (task: TaskUtilsTask) => {
    setEditingTask(task)
    setIsUnifiedAddModalOpen(true)
    window.dispatchEvent(new CustomEvent('taskDataChangedForStats'))
  }

  const handleOpenUnifiedAddModalForNewTask = () => {
    setEditingTask(null); //确保是新建任务模式
    setIsUnifiedAddModalOpen(true);
    window.dispatchEvent(new CustomEvent('taskDataChangedForStats'))
  };

  const getProjectNameById = (projectId: number | string | undefined): string => {
    if (!projectId) return "未知项目"
    const project = projects.find(p => p.id === projectId)
    return project ? project.name : "未知项目"
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
        window.dispatchEvent(new CustomEvent('taskDataChangedForStats'))
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
    try {
      const taskToDelete = await db.get<db.Task>(db.ObjectStores.TASKS, taskId);
      if (taskToDelete) {
        taskToDelete.isDeleted = 1;
        taskToDelete.deletedAt = new Date();
        await db.update(db.ObjectStores.TASKS, taskToDelete);
        triggerTodayFocusRefresh(); // Refresh UI after DB update
        console.log("Task marked as deleted in DB and UI refreshed.");
        window.dispatchEvent(new CustomEvent('taskDataChangedForStats'))
      } else {
        console.warn("Task not found for deletion, ID:", taskId);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("删除任务失败，请稍后重试。");
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
        window.dispatchEvent(new CustomEvent('taskDataChangedForStats'))
      } else {
        console.warn("Task not found for toggling frog status, ID:", taskId);
      }
    } catch (error) {
      console.error("Error toggling frog status:", error);
      toast.error("切换青蛙状态失败，请稍后重试。");
    }
  }

  // This function will be passed to child components (FrogTasksCard, TodayFocusTasks)
  // It expects a TaskUtilsTask object.
  const handleOpenTimeSelectModalForTask = (task: TaskUtilsTask) => {
    if (!task || task.id === undefined) {
        toast.error("无效的任务，无法添加到时间轴。");
        return;
    }
    if (task.completed) {
        toast.info(`任务 "${task.title}" 已完成，无法直接添加到时间轴。`);
        return;
    }
    // The openTimeSelectModal (originally handleAddTaskToTimeline from useTaskData)
    // expects a Task type from task-utils. TaskUtilsTask should be compatible.
    openTimeSelectModal(task); 
  };

  const handleTaskPropertyUpdate = async (updatedTask: TaskUtilsTask) => {
    if (updatedTask.id === undefined) return;
    try {
        const existingTask = await db.get<db.Task>(db.ObjectStores.TASKS, updatedTask.id);
        if (!existingTask) {
            console.warn(`Task ${updatedTask.id} not found for update`);
            return;
        }

        const dbTaskUpdates = toDBTaskShape(updatedTask);
        const mergedTask = { ...existingTask, ...dbTaskUpdates, id: updatedTask.id, updatedAt: new Date() };

        await db.update(db.ObjectStores.TASKS, mergedTask);
        triggerTodayFocusRefresh();
        window.dispatchEvent(new CustomEvent('taskDataChangedForStats'));
    } catch (error) {
        console.error("Failed to update task property:", error);
        toast.error("更新任务失败");
    }
  };

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[calc(100vh-250px)]">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <TaskStatsCard />
              <QuickInboxCard />
            </div>
            <div className="flex-grow flex flex-col min-h-0">
              <TodayFocusTasks
                key={todayFocusRefreshKey}
                getProjectNameById={getProjectNameById}
                onEditTask={onEditTask}
                onToggleComplete={onToggleComplete}
                onDeleteTask={onDeleteTask}
                onToggleFrogStatus={onToggleFrogStatus}
                onAddTaskToTimeline={handleOpenTimeSelectModalForTask}
                onPomodoroClick={handlePomodoroClick}
                onOpenUnifiedAddModalForNewTask={handleOpenUnifiedAddModalForNewTask}
                projects={projects}
                onUpdateTask={handleTaskPropertyUpdate}
              />
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col min-h-0">
            <TimelineCard onPomodoroClick={handlePomodoroClick} />
          </div>
        </div>

        <UnifiedAddModal 
          open={isUnifiedAddModalOpen} 
          onOpenChange={setIsUnifiedAddModalOpen} 
          onSuccessfulCreate={handleSuccessfulCreate}
          editingTask={editingTask}
          clearEditingTask={() => setEditingTask(null)}
        />
      </div>

      {/* Render the SelectTimeRangeModal globally for the dashboard */}
      <SelectTimeRangeModal
        isOpen={isSelectTimeModalOpen}
        onOpenChange={setIsSelectTimeModalOpen}
        task={taskForTimelineModal}
        onConfirm={handleConfirmTimeRangeAndAddTask}
      />
    </TaskStatsProvider>
  )
}
