"use client"

import { useState } from "react"
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

export function TodayDashboard() {
  const [timeRange, setTimeRange] = useState("today")
  const [pomodoroModalOpen, setPomodoroModalOpen] = useState(false)
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

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">今日</h1>
        <p className="text-muted-foreground">{formattedDate} · 早上好，今天将是充满成就的一天！</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <TaskStatsCard timeRange={timeRange} setTimeRange={setTimeRange} />
        <FrogTasksCard onPomodoroClick={handlePomodoroClick} />
        <DueTodayCard onPomodoroClick={handlePomodoroClick} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <TimelineCard />
        </div>
        <div className="space-y-6">
          <PomodoroCard />
          <AiSuggestionsCard />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <TodayTasksCard onPomodoroClick={handlePomodoroClick} />
        </div>
      </div>

      {/* Pomodoro Modal */}
      <PomodoroModal open={pomodoroModalOpen} onOpenChange={setPomodoroModalOpen} initialTask={selectedTask} />
    </div>
  )
}

function TaskStatsCard({ timeRange, setTimeRange }: { timeRange: string; setTimeRange: (value: string) => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">任务统计</CardTitle>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue placeholder="时间范围" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">今日</SelectItem>
            <SelectItem value="week">本周</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">12</span>
            <span className="text-xs text-muted-foreground">总任务数</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-green-500">5</span>
            <span className="text-xs text-muted-foreground">已完成</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-amber-500">7</span>
            <span className="text-xs text-muted-foreground">待处理</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="w-full bg-muted rounded-full h-2.5">
          <div className="bg-primary h-2.5 rounded-full" style={{ width: "42%" }}></div>
        </div>
      </CardFooter>
    </Card>
  )
}

function FrogTasksCard({ onPomodoroClick }: { onPomodoroClick: (taskId: string, taskTitle: string) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">今日青蛙任务</CardTitle>
        <CardDescription>最重要但可能最难开始的任务</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          {[
            { id: "1", title: "完成产品设计方案", completed: false },
            { id: "2", title: "准备明天的演讲", completed: false },
            { id: "3", title: "回复重要邮件", completed: true },
          ].map((task) => (
            <div key={task.id} className="flex items-center space-x-2">
              <Checkbox id={`frog-${task.id}`} checked={task.completed} />
              <label
                htmlFor={`frog-${task.id}`}
                className={cn(
                  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1",
                  task.completed && "line-through text-muted-foreground",
                )}
              >
                🐸 {task.title}
              </label>
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
                  <DropdownMenuItem>删除</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" size="sm" className="w-full">
          添加青蛙任务
        </Button>
      </CardFooter>
    </Card>
  )
}

function DueTodayCard({ onPomodoroClick }: { onPomodoroClick: (taskId: string, taskTitle: string) => void }) {
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
        <Button variant="outline" size="sm" className="w-full">
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
