"use client"

import { useState, useEffect, useCallback } from "react"
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

export function TodayDashboard() {
  const [timeRange, setTimeRange] = useState("today")
  const [pomodoroModalOpen, setPomodoroModalOpen] = useState(false)
  const [dueTasksModalOpen, setDueTasksModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null)

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

  // Placeholder functions for TodayTasksCard
  const handleViewAllTodayTasks = () => {
    // TODO: Implement logic to show all today tasks modal or navigate to a page
    console.log("View all today tasks clicked")
  }

  const handleAddTodayTask = () => {
    // TODO: Implement logic to open an add task modal, possibly pre-filled for today
    console.log("Add today task clicked")
  }

  return (
    <TaskStatsProvider>
      {/* 确保在应用启动时初始化数据库 */}
      <DatabaseInitializer />
      
      <div className="container py-6 space-y-8">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">今日</h1>
          <p className="text-muted-foreground">{formattedDate} · 早上好，今天将是充满成就的一天！</p>
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
                onViewAllClick={handleViewAllTodayTasks} 
                onAddTaskClick={handleAddTodayTask} 
              />
          </div>
        </div>

        {/* Pomodoro Modal */}
        <PomodoroModal open={pomodoroModalOpen} onOpenChange={setPomodoroModalOpen} initialTask={selectedTask} />
        
        {/* Due Tasks Modal */}
        <DueTasksModal open={dueTasksModalOpen} onOpenChange={setDueTasksModalOpen} />
      </div>
    </TaskStatsProvider>
  )
}
