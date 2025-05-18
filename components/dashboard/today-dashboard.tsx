"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PomodoroCard } from "../pomodoro/pomodoro-card"
import { PomodoroModal } from "../pomodoro/pomodoro-modal"
import { DueTasksModal } from "../task/due-tasks-modal"
import { TaskStatsProvider } from "../task/task-stats-updater"
import DatabaseInitializer from "../common/database-initializer"
import { TaskStatsCard } from "../today/task-stats-card"
import { FrogTasksCard } from "../today/frog-tasks-card"
import { DueTodayCard } from "../today/due-today-card"
import { TimelineCard } from "../today/timeline-card"
import { TodayTasksCard } from "../today/today-tasks-card"
import { UnifiedAddModal } from "../common/UnifiedAddModal"

export function TodayDashboard() {
  const [timeRange, setTimeRange] = useState("today")
  const [pomodoroModalOpen, setPomodoroModalOpen] = useState(false)
  const [dueTasksModalOpen, setDueTasksModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null)
  const [isUnifiedAddModalOpen, setIsUnifiedAddModalOpen] = useState(false)

  const today = new Date()
  const formattedDate = today.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })

  const handlePomodoroClick = (taskId: string, taskTitle: string) => {
    setSelectedTask({ id: taskId, title: taskTitle })
    setPomodoroModalOpen(true)
  }

  const handleViewAllDueTasks = () => {
    setDueTasksModalOpen(true)
  }

  const handleViewAllTasks = () => {
    console.log("View all tasks clicked");
  };

  const handleAddTask = () => {
    console.log("Add task clicked from TodayTasksCard, should this open UnifiedAddModal?");
  };

  const handleSuccessfulCreate = () => {
    console.log("Content created successfully via UnifiedAddModal, refresh dashboard data if necessary.");
  };

  return (
    <TaskStatsProvider>
      <DatabaseInitializer />
      
      <div className="container py-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">今日</h1>
            <p className="text-muted-foreground">{formattedDate} · 早上好，今天将是充满成就的一天！</p>
          </div>
          <Button onClick={() => setIsUnifiedAddModalOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> 添加
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <TaskStatsCard timeRange={timeRange} setTimeRange={setTimeRange} />
          <FrogTasksCard onPomodoroClick={handlePomodoroClick} />
          <DueTodayCard onPomodoroClick={handlePomodoroClick} onViewAll={handleViewAllDueTasks} />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <TimelineCard onPomodoroClick={handlePomodoroClick} />
          </div>
          <div className="space-y-6">
              <PomodoroCard />
              <TodayTasksCard 
                onPomodoroClick={handlePomodoroClick} 
                onViewAllClick={handleViewAllTasks}
                onAddTaskClick={handleAddTask}
              />
          </div>
        </div>

        <PomodoroModal open={pomodoroModalOpen} onOpenChange={setPomodoroModalOpen} initialTask={selectedTask} />
        <DueTasksModal open={dueTasksModalOpen} onOpenChange={setDueTasksModalOpen} />
        <UnifiedAddModal 
          open={isUnifiedAddModalOpen} 
          onOpenChange={setIsUnifiedAddModalOpen} 
          onSuccessfulCreate={handleSuccessfulCreate}
        />
      </div>
    </TaskStatsProvider>
  )
}
