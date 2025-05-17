"use client"

import { useState, useEffect, useRef } from "react"
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  Clock,
  Coffee,
  Frown,
  Lightbulb,
  Loader2,
  MoreHorizontal,
  Play,
  Smile,
  Timer,
  X,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { PomodoroCard } from "./pomodoro-card"
import { PomodoroModal } from "./pomodoro-modal"
import { DueTasksModal } from "./due-tasks-modal"
import { FrogTaskModal } from "./frog-task-modal"
import { EditTaskModal } from "./edit-task-modal"
import { DeleteTaskConfirm } from "./delete-task-confirm"
import { TaskStatsProvider, useTaskStats } from "./task-stats-updater"
import { allTasks } from "./mock-tasks"

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

  // 使用模拟数据初始化任务统计
  useEffect(() => {
    // 这里我们可以从API获取数据，暂时使用mock数据
  }, [])

  return (
    <TaskStatsProvider>
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
          <div className="md:col-span-1 md:row-span-2">
            <TimelineCard />
          </div>
          <div className="md:col-span-2 space-y-6">
            <div className="grid gap-6 md:grid-cols-2 items-start">
              <PomodoroCard />
              <TodayTasksCard onPomodoroClick={handlePomodoroClick} />
            </div>
            <AiSuggestionsCard />
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

function TaskStatsCard({ timeRange, setTimeRange }: { timeRange: string; setTimeRange: (value: string) => void }) {
  const { stats, timeRange: taskTimeRange, setTimeRange: updateTimeRange, addTasks } = useTaskStats()
  
  // 初始化任务数据
  useEffect(() => {
    // 在组件挂载时加载模拟任务数据
    addTasks(allTasks)
  }, [addTasks])
  
  // 同步外部时间范围到任务统计上下文
  useEffect(() => {
    if (timeRange !== taskTimeRange) {
      updateTimeRange(timeRange as any)
    }
  }, [timeRange, taskTimeRange, updateTimeRange])
  
  // 处理时间范围变化
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value)
    updateTimeRange(value as any)
  }
  
  // 计算完成百分比，避免除以零错误
  const completionPercentage = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">任务统计</CardTitle>
        <Select value={timeRange} onValueChange={handleTimeRangeChange}>
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue placeholder="时间范围" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">今日</SelectItem>
            <SelectItem value="week">本周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
            <SelectItem value="all">全部</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{stats.total}</span>
            <span className="text-xs text-muted-foreground">总任务数</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-green-500">{stats.completed}</span>
            <span className="text-xs text-muted-foreground">已完成</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-amber-500">{stats.pending}</span>
            <span className="text-xs text-muted-foreground">待处理</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="w-full bg-muted rounded-full h-2.5">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        <div className="w-full text-right text-xs text-muted-foreground mt-1">
          {completionPercentage}%
        </div>
      </CardFooter>
    </Card>
  )
}

function FrogTasksCard({ onPomodoroClick }: { onPomodoroClick: (taskId: string, taskTitle: string) => void }) {
  const { updateTaskStats, recalculateStats, addTasks, removeTasks } = useTaskStats()

  // 状态管理
  const [tasks, setTasks] = useState([
    { id: "1", title: "完成产品设计方案", completed: false },
    { id: "2", title: "准备明天的演讲", completed: false },
    { id: "3", title: "回复重要邮件", completed: true },
  ])
  const [frogTaskModalOpen, setFrogTaskModalOpen] = useState(false)
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<{ id: string; title: string } | null>(null)
  
  // 记录是否已初始化，避免重复计算
  const initializedRef = useRef(false)

  // 初始化任务状态 - 只在组件首次加载时运行一次
  useEffect(() => {
    if (!initializedRef.current) {
      // 将青蛙任务添加到任务统计中，设置今天为默认截止日期
      const frogTasksWithDates = tasks.map(task => ({
        ...task,
        id: task.id,
        title: task.title,
        completed: task.completed,
        isFrog: true,
        // 将其截止日期设置为今天，确保它们被计入今日任务
        dueDate: new Date().toISOString().split('T')[0]
      }))
      
      // 添加到任务统计
      addTasks(frogTasksWithDates)
      initializedRef.current = true
    }
  }, [addTasks, tasks]) // 依赖于addTasks和初始tasks

  // 处理复选框点击 - 更新任务状态和统计数据
  const handleCheckboxChange = (taskId: string) => {
    setTasks(prev => {
      const newTasks = prev.map(task => {
        if (task.id === taskId) {
          const newCompleted = !task.completed
          
          // 更新任务统计 - 通过完整的任务对象
          const updatedTask = {
            id: taskId,
            title: task.title,
            completed: newCompleted,
            isFrog: true,
            dueDate: new Date().toISOString().split('T')[0] // 确保它在今日统计中
          }
          
          // 更新任务统计
          addTasks([updatedTask])
          
          return { ...task, completed: newCompleted }
        }
        return task
      })
      return newTasks
    })
  }

  // 处理编辑任务
  const handleEditTask = (taskId: string, taskTitle: string) => {
    setCurrentTask({ id: taskId, title: taskTitle })
    setEditTaskModalOpen(true)
  }

  // 处理添加到时间轴
  const handleAddToTimeline = (taskId: string) => {
    // 这里应实现将任务添加到时间轴的逻辑
    console.log(`将任务 ${taskId} 添加到时间轴`)
    // 简化实现：仅显示一个提示
    alert(`任务已添加到时间轴`)
  }

  // 处理删除任务 - 同步更新任务统计
  const handleDeleteTask = (taskId: string, taskTitle: string) => {
    setCurrentTask({ id: taskId, title: taskTitle })
    setDeleteConfirmOpen(true)
  }

  // 确认删除任务 - 从任务统计中移除
  const confirmDeleteTask = () => {
    if (currentTask) {
      // 从任务统计中移除
      removeTasks([currentTask.id])
      
      // 从UI中移除
      setTasks(prev => prev.filter(task => task.id !== currentTask.id))
    }
  }

  // 保存编辑后的任务 - 更新任务统计
  const saveEditedTask = (editedTask: any) => {
    // 更新本地任务列表
    setTasks(prev => {
      const newTasks = prev.map(task => 
        task.id === editedTask.id ? { ...task, title: editedTask.title } : task
      )
      return newTasks
    })
    
    // 查找被编辑的任务的完整信息
    const task = tasks.find(t => t.id === editedTask.id)
    if (task) {
      // 更新任务统计
      const updatedTask = {
        ...task,
        title: editedTask.title,
        isFrog: true,
        dueDate: editedTask.dueDate || new Date().toISOString().split('T')[0]
      }
      
      // 更新任务统计
      addTasks([updatedTask])
    }
  }

  // 添加新的青蛙任务 - 现在由FrogTaskModal内部处理统计更新
  const addFrogTasks = (taskIds: string[]) => {
    // 在实际应用中，这里应从状态管理系统获取完整任务信息
    // 简化实现：创建模拟任务
    const newTasks = taskIds.map(id => ({
      id,
      title: id.startsWith('new-') ? id.substring(4) : `新任务 ${id}`,
      completed: false
    }))
    
    // 更新UI
    setTasks(prev => [...prev, ...newTasks])
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">今日青蛙任务</CardTitle>
        <CardDescription>最重要但可能最难开始的任务</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          {tasks.map((task) => (
            <div 
              key={task.id} 
              className="flex items-center space-x-2 group transition-all duration-200"
            >
              <Checkbox 
                id={`frog-${task.id}`} 
                checked={task.completed}
                onCheckedChange={() => handleCheckboxChange(task.id)}
                className="transition-all duration-200"
              />
              <label
                htmlFor={`frog-${task.id}`}
                className={cn(
                  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer transition-all duration-200",
                  task.completed && "line-through text-muted-foreground",
                )}
              >
                🐸 {task.title}
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onPomodoroClick(task.id, task.title)}
              >
                <Timer className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditTask(task.id, task.title)}>
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddToTimeline(task.id)}>
                    添加到时间轴
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-500"
                    onClick={() => handleDeleteTask(task.id, task.title)}
                  >
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => setFrogTaskModalOpen(true)}  
        >
          添加青蛙任务
        </Button>
      </CardFooter>

      {/* 青蛙任务模态框 */}
      <FrogTaskModal 
        open={frogTaskModalOpen}
        onOpenChange={setFrogTaskModalOpen}
        onAddFrogTasks={addFrogTasks}
      />
      
      {/* 编辑任务模态框 */}
      <EditTaskModal
        open={editTaskModalOpen}
        onOpenChange={setEditTaskModalOpen}
        task={currentTask}
        onSave={saveEditedTask}
      />
      
      {/* 删除确认对话框 */}
      <DeleteTaskConfirm
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        taskTitle={currentTask?.title || ""}
        onConfirm={confirmDeleteTask}
      />
    </Card>
  )
}

function DueTodayCard({ onPomodoroClick, onViewAll }: { onPomodoroClick: (taskId: string, taskTitle: string) => void, onViewAll: () => void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">今日到期任务</CardTitle>
        <CardDescription>需要今天完成的任务</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          {[
            { id: "4", title: "提交周报", priority: "high", time: "17:00", completed: false },
            { id: "5", title: "客户电话会议", priority: "medium", time: "14:30", completed: false },
            { id: "6", title: "更新项目文档", priority: "low", time: "12:00", completed: true },
          ].map((task) => (
            <div key={task.id} className="flex items-center space-x-2">
              <Checkbox id={`due-${task.id}`} checked={task.completed} />
              <div className="flex-1">
                <label
                  htmlFor={`due-${task.id}`}
                  className={cn(
                    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1",
                    task.completed && "line-through text-muted-foreground",
                  )}
                >
                  {task.title}
                </label>
                <div className="flex items-center mt-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs mr-2",
                      task.priority === "high"
                        ? "border-red-500 text-red-500"
                        : task.priority === "medium"
                          ? "border-amber-500 text-amber-500"
                          : "border-green-500 text-green-500",
                    )}
                  >
                    {task.priority === "high" ? "紧急" : task.priority === "medium" ? "中等" : "低优先级"}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {task.time}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPomodoroClick(task.id, task.title)}
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
                  <DropdownMenuItem>编辑</DropdownMenuItem>
                  <DropdownMenuItem>添加到时间轴</DropdownMenuItem>
                  <DropdownMenuItem>推迟</DropdownMenuItem>
                  <DropdownMenuItem>删除</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onViewAll}>
          查看全部到期任务
        </Button>
      </CardFooter>
    </Card>
  )
}

function TimelineCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-md font-medium">今日时间轴</CardTitle>
          <Button variant="outline" size="sm">
            AI优化日程
          </Button>
        </div>
        <CardDescription>AI智能规划的今日日程</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="relative">
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-muted"></div>

          {[
            { id: 1, time: "09:00 - 09:30", title: "晨间计划", type: "planning", completed: true },
            { id: 2, time: "09:30 - 10:30", title: "完成项目提案", type: "work", completed: false, current: true },
            { id: 3, time: "10:30 - 10:45", title: "休息", type: "break", completed: false },
            { id: 4, time: "10:45 - 12:00", title: "客户电话会议", type: "meeting", completed: false },
            { id: 5, time: "12:00 - 13:00", title: "午餐", type: "break", completed: false },
            { id: 6, time: "13:00 - 14:30", title: "准备明天的演讲", type: "work", completed: false },
            { id: 7, time: "14:30 - 15:30", title: "团队会议", type: "meeting", completed: false },
            { id: 8, time: "15:30 - 15:45", title: "休息", type: "break", completed: false },
            { id: 9, time: "15:45 - 17:00", title: "回复重要邮件", type: "work", completed: false },
          ].map((block) => (
            <div key={block.id} className="relative pl-8 pb-6">
              <div
                className={cn(
                  "absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center",
                  block.completed
                    ? "bg-green-100 text-green-600"
                    : block.current
                      ? "bg-blue-100 text-blue-600"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {block.completed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : block.current ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : block.type === "break" ? (
                  <Coffee className="h-4 w-4" />
                ) : block.type === "meeting" ? (
                  <Calendar className="h-4 w-4" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
              </div>

              <div
                className={cn(
                  "rounded-lg border p-3",
                  block.current
                    ? "border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800"
                    : block.type === "break"
                      ? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800"
                      : "border-muted bg-background",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{block.title}</span>
                  <span className="text-xs text-muted-foreground">{block.time}</span>
                </div>

                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      block.type === "work"
                        ? "border-blue-500 text-blue-500"
                        : block.type === "meeting"
                          ? "border-purple-500 text-purple-500"
                          : block.type === "break"
                            ? "border-green-500 text-green-500"
                            : "border-amber-500 text-amber-500",
                    )}
                  >
                    {block.type === "work"
                      ? "工作"
                      : block.type === "meeting"
                        ? "会议"
                        : block.type === "break"
                          ? "休息"
                          : "计划"}
                  </Badge>

                  <div className="flex items-center space-x-1">
                    {block.current && (
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>编辑</DropdownMenuItem>
                        <DropdownMenuItem>调整时间</DropdownMenuItem>
                        <DropdownMenuItem>删除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" size="sm" className="w-full">
          添加时间块
        </Button>
      </CardFooter>
    </Card>
  )
}

function AiSuggestionsCard() {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium flex items-center">
          <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
          AI助手建议
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          <div className="rounded-lg bg-white dark:bg-gray-800 p-3 shadow-sm">
            <div className="flex items-start space-x-2">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-1.5">
                <Smile className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm">上午是您的高效时段，建议优先处理"完成项目提案"这个重要任务。</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white dark:bg-gray-800 p-3 shadow-sm">
            <div className="flex items-start space-x-2">
              <div className="bg-amber-100 dark:bg-amber-900 rounded-full p-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm">您今天的日程安排较为紧凑，记得在任务间安排短暂休息，保持精力。</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white dark:bg-gray-800 p-3 shadow-sm">
            <div className="flex items-start space-x-2">
              <div className="bg-red-100 dark:bg-red-900 rounded-full p-1.5">
                <Frown className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm">您的收集篮中有5项未处理的内容，建议在今天结束前花时间整理。</p>
                <Button variant="link" size="sm" className="h-6 px-0 text-xs">
                  查看收集篮
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TodayTasksCard({ onPomodoroClick }: { onPomodoroClick: (taskId: string, taskTitle: string) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-md font-medium">今日任务</CardTitle>
          <Button variant="ghost" size="sm">
            查看全部
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          {[
            { id: "7", title: "回复客户邮件", priority: "important-urgent", completed: false },
            { id: "8", title: "更新项目进度", priority: "important-not-urgent", completed: false },
            { id: "9", title: "检查团队报告", priority: "not-important-urgent", completed: false },
            { id: "10", title: "整理工作笔记", priority: "not-important-not-urgent", completed: true },
          ].map((task) => (
            <div key={task.id} className="flex items-start space-x-2">
              <Checkbox id={`task-${task.id}`} checked={task.completed} className="mt-0.5" />
              <div className="flex-1">
                <label
                  htmlFor={`task-${task.id}`}
                  className={cn(
                    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                    task.completed && "line-through text-muted-foreground",
                  )}
                >
                  {task.title}
                </label>
                <div className="flex items-center mt-1">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-sm mr-2",
                      task.priority === "important-urgent"
                        ? "bg-red-500"
                        : task.priority === "important-not-urgent"
                          ? "bg-amber-500"
                          : task.priority === "not-important-urgent"
                            ? "bg-blue-500"
                            : "bg-green-500",
                    )}
                  />
                  <span className="text-xs text-muted-foreground">
                    {task.priority === "important-urgent" ? (
                      <span className="flex items-center">
                        重要 <ArrowUp className="h-3 w-3 mx-1" /> 紧急 <ArrowUp className="h-3 w-3 mx-1" />
                      </span>
                    ) : task.priority === "important-not-urgent" ? (
                      <span className="flex items-center">
                        重要 <ArrowUp className="h-3 w-3 mx-1" /> 紧急 <ArrowDown className="h-3 w-3 mx-1" />
                      </span>
                    ) : task.priority === "not-important-urgent" ? (
                      <span className="flex items-center">
                        重要 <ArrowDown className="h-3 w-3 mx-1" /> 紧急 <ArrowUp className="h-3 w-3 mx-1" />
                      </span>
                    ) : (
                      <span className="flex items-center">
                        重要 <ArrowDown className="h-3 w-3 mx-1" /> 紧急 <ArrowDown className="h-3 w-3 mx-1" />
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPomodoroClick(task.id, task.title)}
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
                    <DropdownMenuItem>编辑</DropdownMenuItem>
                    <DropdownMenuItem>标记为青蛙</DropdownMenuItem>
                    <DropdownMenuItem>添加到时间轴</DropdownMenuItem>
                    <DropdownMenuItem>删除</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" size="sm" className="w-full">
          添加任务
        </Button>
      </CardFooter>
    </Card>
  )
}
