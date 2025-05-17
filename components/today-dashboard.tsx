"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  Edit,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { PomodoroCard } from "./pomodoro-card"
import { PomodoroModal } from "./pomodoro-modal"
import { DueTasksModal } from "./due-tasks-modal"
import { FrogTaskModal } from "./frog-task-modal"
import { EditTaskModal } from "./edit-task-modal"
import { DeleteTaskConfirm } from "./delete-task-confirm"
import { TaskStatsProvider, useTaskStats } from "./task-stats-updater"
import DatabaseInitializer from "./database-initializer"

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
            <TimelineCard />
          </div>
          <div className="space-y-6">
              <PomodoroCard />
              <TodayTasksCard onPomodoroClick={handlePomodoroClick} />
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
  const { stats, timeRange: taskTimeRange, setTimeRange: updateTimeRange } = useTaskStats();
  
  // 同步外部时间范围到任务统计上下文
  useEffect(() => {
    if (timeRange !== taskTimeRange) {
      updateTimeRange(timeRange as any);
    }
  }, [timeRange, taskTimeRange, updateTimeRange]);
  
  // 处理时间范围变化
  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    updateTimeRange(value as any);
  };
  
  // 计算完成百分比，避免除以零错误
  const completionPercentage = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;
  
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
  );
}

function FrogTasksCard({ onPomodoroClick }: { onPomodoroClick: (taskId: string, taskTitle: string) => void }) {
  const { updateTaskStats, addTasks, removeTasks } = useTaskStats()

  // 状态管理
  const [tasks, setTasks] = useState<Array<{id: string | number, title: string, completed: boolean}>>([])
  const [loading, setLoading] = useState(true)
  const [frogTaskModalOpen, setFrogTaskModalOpen] = useState(false)
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<{ id: string; title: string } | null>(null)
  
  // 从 IndexedDB 加载青蛙任务
  const loadFrogTasks = useCallback(async () => {
    try {
      setLoading(true)
      
      // 从 IndexedDB 获取所有青蛙任务
      const { getByIndex, ObjectStores } = await import('@/lib/db')
      const frogTasks = await getByIndex(
        ObjectStores.TASKS,
        'byIsFrog',
        1  // 使用数字 1 代替布尔值 true
      )
      
      // 过滤出未删除的任务
      const activeFrogTasks = frogTasks.filter(
        (task: any) => !task.isDeleted && task.isFrog
      )
      
      // 更新状态
      setTasks(
        activeFrogTasks.map((task: any) => ({
          id: task.id,
          title: task.title,
          completed: task.completed
        }))
      )
      
    } catch (error) {
      console.error('加载青蛙任务时出错:', error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // 在组件挂载时加载青蛙任务
  useEffect(() => {
    loadFrogTasks()
  }, [loadFrogTasks])

  // 处理复选框点击 - 直接更新 IndexedDB
  const handleCheckboxChange = async (taskId: string | number) => {
    try {
      // 在本地状态中找到任务
      const task = tasks.find(t => t.id == taskId)
      if (!task) return
      
      const newCompleted = !task.completed
      
      // 先更新本地状态，使 UI 立即响应
      setTasks(prev => 
        prev.map(t => t.id == taskId 
          ? { ...t, completed: newCompleted } 
          : t
        )
      )
      
      // 更新任务统计和 IndexedDB
      updateTaskStats(taskId, newCompleted)
    } catch (error) {
      console.error('更新任务状态时出错:', error)
      // 出错时恢复本地状态
      setTasks(prev => [...prev])
    }
  }

  // 处理编辑任务
  const handleEditTask = (taskId: string | number, taskTitle: string) => {
    setCurrentTask({ id: String(taskId), title: taskTitle })
    setEditTaskModalOpen(true)
  }

  // 处理添加到时间轴
  const handleAddToTimeline = (taskId: string | number) => {
    // 这里应实现将任务添加到时间轴的逻辑
    console.log(`将任务 ${taskId} 添加到时间轴`)
  }

  // 处理删除任务
  const handleDeleteTask = (taskId: string | number, taskTitle: string) => {
    setCurrentTask({ id: String(taskId), title: taskTitle })
    setDeleteConfirmOpen(true)
  }

  // 确认删除任务
  const confirmDeleteTask = () => {
    if (currentTask) {
      // 在 IndexedDB 中标记为删除
      removeTasks([currentTask.id])
      
      // 从本地状态中移除
      setTasks(prev => prev.filter(task => task.id != currentTask.id))
      
      setDeleteConfirmOpen(false)
      setCurrentTask(null)
    }
  }

  // 保存编辑后的任务 - 更新到 IndexedDB
  const saveEditedTask = async (editedTask: any) => {
    try {
      // 找到原始任务以保留其完成状态
      const originalTask = tasks.find(t => t.id == editedTask.id);
      const completed = originalTask ? originalTask.completed : false;
      
      // 准备更新到 IndexedDB 的任务对象
      const updatedTaskData = {
        id: editedTask.id,
        title: editedTask.title,
        completed: completed, // 保留原始完成状态
        isFrog: true,
        dueDate: editedTask.dueDate || new Date()
      }
      
      // 更新任务到 IndexedDB
      await addTasks([updatedTaskData])
      
      // 重新加载任务以获取最新数据
      await loadFrogTasks()
      
      setEditTaskModalOpen(false)
      setCurrentTask(null)
    } catch (error) {
      console.error('保存编辑任务时出错:', error)
    }
  }
  
  // 添加新的青蛙任务 - 保存到 IndexedDB
  const addFrogTasks = async (taskIds: string[]) => {
    try {
      // 如果是创建的新任务，直接添加到本地状态
      const newLocalTasks = taskIds
        .filter(id => id.startsWith('new-'))
        .map(id => ({
          id,
          title: id.substring(4),
          completed: false,
          isFrog: true
        }))
      
      if (newLocalTasks.length > 0) {
        // 添加到 IndexedDB
        await addTasks(newLocalTasks)
      }
      
      // 重新加载任务以获取最新数据
      await loadFrogTasks()
    } catch (error) {
      console.error('添加或加载青蛙任务时出错:', error)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">今日青蛙任务</CardTitle>
        <CardDescription>最重要但可能最难开始的任务</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Frown className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">您还没有设置青蛙任务</p>
            <Button variant="link" size="sm" onClick={() => setFrogTaskModalOpen(true)}>
              立即添加
            </Button>
          </div>
        ) : (
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
                  onClick={() => onPomodoroClick(String(task.id), task.title)}
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
        )}
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
  const { updateTaskStats } = useTaskStats();
  
  // 状态管理
  const [tasks, setTasks] = useState<Array<{
    id: string | number, 
    title: string, 
    completed: boolean, 
    priority?: string,
    time?: string
  }>>([]);
  const [loading, setLoading] = useState(true);
  
  // 从 IndexedDB 加载今日到期任务
  const loadDueTasks = useCallback(async () => {
    try {
      setLoading(true);
      
      // 获取今日日期（不含时间）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      // 从 IndexedDB 获取今日到期任务
      const { getAll, ObjectStores } = await import('@/lib/db');
      const allTasks = await getAll(ObjectStores.TASKS);
      
      // 过滤出未删除的今日到期任务
      const dueTasks = allTasks.filter((task: any) => {
        // 检查任务是否未被删除
        if (task.isDeleted) return false;
        
        // 如果有截止日期，检查是否在今天
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate >= today && dueDate < tomorrow;
        }
        
        return false;
      });
      
      // 转换优先级格式，并按优先级排序
      const mappedTasks = dueTasks.map((task: any) => {
        // 将数据库中的优先级映射为显示格式
        let priority = 'medium';
        if (task.priority === 'importantUrgent') {
          priority = 'high';
        } else if (task.priority === 'importantNotUrgent') {
          priority = 'medium';
        } else if (task.priority === 'notImportantNotUrgent') {
          priority = 'low';
        }
        
        // 格式化时间（如果有）
        let timeStr = '';
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          timeStr = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        return {
          id: task.id,
          title: task.title,
          completed: task.completed,
          priority,
          time: timeStr
        };
      });
      
      // 更新状态
      setTasks(mappedTasks);
      
    } catch (error) {
      console.error('加载到期任务时出错:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 初始加载任务
  useEffect(() => {
    loadDueTasks();
  }, [loadDueTasks]);
  
  // 处理复选框点击 - 更新任务完成状态
  const handleCheckboxChange = async (taskId: string | number) => {
    // 在本地状态中找到任务
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;
    
    const newCompleted = !task.completed;
    
    // 先更新本地状态，使 UI 立即响应
    setTasks(prev => 
      prev.map(t => t.id == taskId 
        ? { ...t, completed: newCompleted } 
        : t
      )
    );
    
    try {
      // 更新 IndexedDB
      await updateTaskStats(taskId, newCompleted);
    } catch (error) {
      console.error('更新任务状态时出错:', error);
      
      // 发生错误时回滚 UI 状态
      setTasks(prev => 
        prev.map(t => t.id == taskId 
          ? { ...t, completed: task.completed } 
          : t
        )
      );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">今日到期任务</CardTitle>
        <CardDescription>需要今天完成的任务</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">今天没有到期的任务</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`due-${task.id}`} 
                  checked={task.completed} 
                  onCheckedChange={() => handleCheckboxChange(task.id)}
                />
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
                    {task.time && (
                      <span className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {task.time}
                      </span>
                    )}
                  </div>
                </div>
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
                    <DropdownMenuItem>编辑</DropdownMenuItem>
                    <DropdownMenuItem>添加到时间轴</DropdownMenuItem>
                    <DropdownMenuItem>推迟</DropdownMenuItem>
                    <DropdownMenuItem>删除</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onViewAll}>
          查看全部到期任务
        </Button>
      </CardFooter>
    </Card>
  );
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
