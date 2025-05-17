"use client"

import { useState } from "react"
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckSquare,
  ChevronDown,
  Clock,
  Edit,
  Flag,
  LayoutGrid,
  LayoutList,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  Timer,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { PomodoroModal } from "@/components/pomodoro-modal"

interface Task {
  id: number
  title: string
  description?: string
  completed: boolean
  priority: "important-urgent" | "important-not-urgent" | "not-important-urgent" | "not-important-not-urgent"
  dueDate?: Date
  project?: string
  tags?: string[]
  subtasks?: { id: number; title: string; completed: boolean }[]
  isFrog?: boolean
}

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      title: "完成项目提案",
      description: "为客户准备详细的项目提案文档",
      completed: false,
      priority: "important-urgent",
      dueDate: new Date(2025, 4, 18),
      project: "客户项目",
      tags: ["工作", "文档"],
      isFrog: true,
      subtasks: [
        { id: 101, title: "收集需求", completed: true },
        { id: 102, title: "制定时间表", completed: false },
        { id: 103, title: "估算预算", completed: false },
      ],
    },
    {
      id: 2,
      title: "准备团队会议",
      description: "准备下周团队会议的议程和材料",
      completed: false,
      priority: "important-not-urgent",
      dueDate: new Date(2025, 4, 20),
      project: "团队管理",
      tags: ["会议", "准备"],
    },
    {
      id: 3,
      title: "回复客户邮件",
      completed: false,
      priority: "not-important-urgent",
      dueDate: new Date(2025, 4, 17),
      tags: ["邮件", "客户"],
    },
    {
      id: 4,
      title: "更新个人博客",
      completed: false,
      priority: "not-important-not-urgent",
      project: "个人项目",
      tags: ["写作", "个人"],
    },
    {
      id: 5,
      title: "学习新技术",
      description: "花时间学习最新的前端框架",
      completed: false,
      priority: "important-not-urgent",
      project: "个人发展",
      tags: ["学习", "技术"],
    },
    {
      id: 6,
      title: "整理工作笔记",
      completed: true,
      priority: "not-important-not-urgent",
      dueDate: new Date(2025, 4, 15),
      tags: ["整理", "文档"],
    },
    {
      id: 7,
      title: "准备明天的演讲",
      description: "为明天的客户演示准备演讲稿和幻灯片",
      completed: false,
      priority: "important-urgent",
      dueDate: new Date(2025, 4, 18),
      project: "客户项目",
      tags: ["演讲", "准备"],
      isFrog: true,
    },
  ])

  const [selectedView, setSelectedView] = useState("next-actions")
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<"today" | "this-week" | "next-7-days" | "no-date" | null>(null)
  const [sortBy, setSortBy] = useState("priority")
  const [viewMode, setViewMode] = useState("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: "",
    description: "",
    priority: "important-not-urgent",
    completed: false,
  })
  const [date, setDate] = useState<Date>()
  const [pomodoroModalOpen, setPomodoroModalOpen] = useState(false)
  const [selectedTaskForPomodoro, setSelectedTaskForPomodoro] = useState("")
  const [selectedTask, setSelectedTaskState] = useState<{ id: string; title: string } | null>(null)

  // Get unique projects
  const projects = Array.from(new Set(tasks.filter((task) => task.project).map((task) => task.project))) as string[]

  // Get unique tags
  const tags = Array.from(
    new Set(tasks.filter((task) => task.tags).flatMap((task) => task.tags as string[])),
  ) as string[]

  // Filter tasks based on selected view, project, tag, date, and search query
  const filteredTasks = tasks.filter((task) => {
    // Filter by view
    if (selectedView === "next-actions" && task.completed) return false
    if (selectedView === "completed" && !task.completed) return false
    if (selectedView === "someday-maybe" && task.priority !== "not-important-not-urgent") return false
    if (selectedView === "waiting" && task.priority !== "not-important-urgent") return false

    // Filter by project
    if (selectedProject && task.project !== selectedProject) return false

    // Filter by tag
    if (selectedTag && (!task.tags || !task.tags.includes(selectedTag))) return false

    // Filter by date
    if (selectedDate === "today" && (!task.dueDate || task.dueDate.toDateString() !== new Date().toDateString()))
      return false
    if (
      selectedDate === "this-week" &&
      (!task.dueDate ||
        task.dueDate < new Date() ||
        task.dueDate > new Date(new Date().setDate(new Date().getDate() + 7)))
    )
      return false
    if (
      selectedDate === "next-7-days" &&
      (!task.dueDate ||
        task.dueDate < new Date() ||
        task.dueDate > new Date(new Date().setDate(new Date().getDate() + 7)))
    )
      return false
    if (selectedDate === "no-date" && task.dueDate) return false

    // Filter by search query
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (!task.description || !task.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
      return false

    return true
  })

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder = {
        "important-urgent": 0,
        "important-not-urgent": 1,
        "not-important-urgent": 2,
        "not-important-not-urgent": 3,
      }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    } else if (sortBy === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.getTime() - b.dueDate.getTime()
    } else if (sortBy === "alphabetical") {
      return a.title.localeCompare(b.title)
    } else {
      return 0
    }
  })

  const toggleTaskCompletion = (id: number) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)))
  }

  const toggleSubtaskCompletion = (taskId: number, subtaskId: number) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId && task.subtasks) {
          return {
            ...task,
            subtasks: task.subtasks.map((subtask) =>
              subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
            ),
          }
        }
        return task
      }),
    )
  }

  const handleCreateTask = () => {
    if (newTask.title?.trim()) {
      const createdTask: Task = {
        id: Date.now(),
        title: newTask.title,
        description: newTask.description,
        completed: false,
        priority: newTask.priority as Task["priority"],
        dueDate: date,
        project: newTask.project,
        tags: newTask.tags,
        subtasks: [],
      }
      setTasks([...tasks, createdTask])
      setNewTask({
        title: "",
        description: "",
        priority: "important-not-urgent",
        completed: false,
      })
      setDate(undefined)
      setIsCreateDialogOpen(false)
    }
  }

  const handlePomodoroClick = (taskId: string, taskTitle: string) => {
    setSelectedTaskState({ id: taskId, title: taskTitle })
    setPomodoroModalOpen(true)
  }

  const handlePomodoroClickOld = (taskName: string) => {
    setSelectedTaskForPomodoro(taskName)
    setPomodoroModalOpen(true)
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">任务</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                创建任务
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>创建新任务</DialogTitle>
                <DialogDescription>添加一个新任务到您的任务列表中</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">任务标题</Label>
                  <Input
                    id="title"
                    placeholder="输入任务标题"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    placeholder="输入任务描述（可选）"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="priority">优先级</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({ ...newTask, priority: value as Task["priority"] })}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="选择优先级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="important-urgent">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-sm bg-red-500 mr-2" />
                            重要且紧急
                          </div>
                        </SelectItem>
                        <SelectItem value="important-not-urgent">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-sm bg-amber-500 mr-2" />
                            重要不紧急
                          </div>
                        </SelectItem>
                        <SelectItem value="not-important-urgent">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-sm bg-blue-500 mr-2" />
                            不重要但紧急
                          </div>
                        </SelectItem>
                        <SelectItem value="not-important-not-urgent">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-sm bg-green-500 mr-2" />
                            不重要不紧急
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dueDate">截止日期</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : <span>选择日期</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent mode="single" selected={date} onSelect={setDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="project">项目</Label>
                    <Select
                      value={newTask.project}
                      onValueChange={(value) => setNewTask({ ...newTask, project: value })}
                    >
                      <SelectTrigger id="project">
                        <SelectValue placeholder="选择项目（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project} value={project}>
                            {project}
                          </SelectItem>
                        ))}
                        <SelectItem value="new">+ 创建新项目</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags">标签</Label>
                    <Select>
                      <SelectTrigger id="tags">
                        <SelectValue placeholder="选择标签（可选）" />
                      </SelectTrigger>
                      <SelectContent>
                        {tags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                        <SelectItem value="new">+ 创建新标签</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateTask}>创建任务</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-muted-foreground">管理和组织您的所有任务</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left sidebar */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>视图</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-1">
                <Button
                  variant={selectedView === "next-actions" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedView("next-actions")}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  下一步行动
                </Button>
                <Button
                  variant={selectedView === "all" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedView("all")}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  所有任务
                </Button>
                <Button
                  variant={selectedView === "completed" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedView("completed")}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  已完成任务
                </Button>
                <Button
                  variant={selectedView === "someday-maybe" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedView("someday-maybe")}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  将来/也许
                </Button>
                <Button
                  variant={selectedView === "waiting" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedView("waiting")}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  等待中
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>按项目查看</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-1">
                {projects.map((project) => (
                  <Button
                    key={project}
                    variant={selectedProject === project ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedProject(selectedProject === project ? null : project)}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    {project}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>按标签查看</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-1">
                {tags.map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTag === tag ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    {tag}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>按日期筛选</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-1">
                <Button
                  variant={selectedDate === "today" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedDate(selectedDate === "today" ? null : "today")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  今日到期
                </Button>
                <Button
                  variant={selectedDate === "this-week" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedDate(selectedDate === "this-week" ? null : "this-week")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  本周到期
                </Button>
                <Button
                  variant={selectedDate === "next-7-days" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedDate(selectedDate === "next-7-days" ? null : "next-7-days")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  未来7天
                </Button>
                <Button
                  variant={selectedDate === "no-date" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedDate(selectedDate === "no-date" ? null : "no-date")}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  无截止日期
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-3">
              <Button variant="ghost" className="w-full justify-start">
                <Trash2 className="h-4 w-4 mr-2" />
                回收站
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CardTitle>
                    {selectedView === "next-actions"
                      ? "下一步行动"
                      : selectedView === "completed"
                        ? "已完成任务"
                        : selectedView === "someday-maybe"
                          ? "将来/也许"
                          : selectedView === "waiting"
                            ? "等待中"
                            : "所有任务"}
                  </CardTitle>
                  <Badge variant="outline">{sortedTasks.length}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="搜索任务..."
                      className="w-[200px] pl-8 rounded-md"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSortBy("priority")}>按优先级排序</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("dueDate")}>按截止日期排序</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy("alphabetical")}>按字母顺序排序</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                      size="icon"
                      className="rounded-none rounded-l-md"
                      onClick={() => setViewMode("list")}
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button
                      variant={viewMode === "board" ? "secondary" : "ghost"}
                      size="icon"
                      className="rounded-none rounded-r-md"
                      onClick={() => setViewMode("board")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === "list" ? (
                <div className="space-y-4">
                  {sortedTasks.length > 0 ? (
                    sortedTasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-start space-x-3 p-3 rounded-lg transition-colors",
                          task.completed ? "bg-muted/50" : "hover:bg-muted/30",
                        )}
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTaskCompletion(task.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <h3
                                  className={cn(
                                    "text-base font-medium",
                                    task.completed && "line-through text-muted-foreground",
                                  )}
                                >
                                  {task.isFrog && "🐸 "}
                                  {task.title}
                                </h3>
                              </div>
                              {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handlePomodoroClickOld(task.title)}
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
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    编辑
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Flag className="h-4 w-4 mr-2" />
                                    {task.isFrog ? "取消标记为青蛙" : "标记为青蛙"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Calendar className="h-4 w-4 mr-2" />
                                    添加到时间轴
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    删除
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div
                              className={cn(
                                "h-3 w-3 rounded-sm",
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
                                  重要 <ArrowDown className="h-3 w-3 mx-1" /> 紧急{" "}
                                  <ArrowDown className="h-3 w-3 mx-1" />
                                </span>
                              )}
                            </span>

                            {task.dueDate && (
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {task.dueDate.toLocaleDateString()}
                              </Badge>
                            )}

                            {task.project && (
                              <Badge variant="outline" className="text-xs">
                                <Flag className="h-3 w-3 mr-1" />
                                {task.project}
                              </Badge>
                            )}

                            {task.tags &&
                              task.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                          </div>

                          {task.subtasks && task.subtasks.length > 0 && (
                            <div className="mt-3 pl-2 border-l-2 border-muted">
                              <div className="text-xs font-medium mb-1 flex items-center">
                                <ChevronDown className="h-3 w-3 mr-1" />
                                子任务 ({task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length})
                              </div>
                              <div className="space-y-1">
                                {task.subtasks.map((subtask) => (
                                  <div key={subtask.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`subtask-${subtask.id}`}
                                      checked={subtask.completed}
                                      onCheckedChange={() => toggleSubtaskCompletion(task.id, subtask.id)}
                                      className="h-3 w-3"
                                    />
                                    <label
                                      htmlFor={`subtask-${subtask.id}`}
                                      className={cn(
                                        "text-xs",
                                        subtask.completed && "line-through text-muted-foreground",
                                      )}
                                    >
                                      {subtask.title}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="rounded-full bg-primary/10 p-3 mb-4">
                        <CheckSquare className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">没有找到任务</h3>
                      <p className="text-muted-foreground mb-4 max-w-md">
                        {searchQuery
                          ? "没有找到匹配的任务，请尝试不同的搜索条件"
                          : "您当前没有任务，点击创建任务按钮添加新任务"}
                      </p>
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        创建任务
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                        重要且紧急
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sortedTasks
                        .filter((task) => task.priority === "important-urgent")
                        .map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "border rounded-lg p-3 bg-white dark:bg-gray-800 transition-colors",
                              task.completed ? "bg-muted/50" : "hover:bg-muted/30",
                            )}
                          >
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => toggleTaskCompletion(task.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h3
                                    className={cn(
                                      "text-sm font-medium",
                                      task.completed && "line-through text-muted-foreground",
                                    )}
                                  >
                                    {task.isFrog && "🐸 "}
                                    {task.title}
                                  </h3>
                                  <div className="flex items-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handlePomodoroClickOld(task.title)}
                                    >
                                      <Timer className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {task.dueDate && (
                                    <Badge variant="outline" className="text-xs">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {task.dueDate.toLocaleDateString()}
                                    </Badge>
                                  )}
                                  {task.project && (
                                    <Badge variant="outline" className="text-xs">
                                      {task.project}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      {sortedTasks.filter((task) => task.priority === "important-urgent").length === 0 && (
                        <div className="text-center py-3 text-sm text-muted-foreground">没有重要且紧急的任务</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                        重要不紧急
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sortedTasks
                        .filter((task) => task.priority === "important-not-urgent")
                        .map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "border rounded-lg p-3 bg-white dark:bg-gray-800 transition-colors",
                              task.completed ? "bg-muted/50" : "hover:bg-muted/30",
                            )}
                          >
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => toggleTaskCompletion(task.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h3
                                    className={cn(
                                      "text-sm font-medium",
                                      task.completed && "line-through text-muted-foreground",
                                    )}
                                  >
                                    {task.isFrog && "🐸 "}
                                    {task.title}
                                  </h3>
                                  <div className="flex items-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handlePomodoroClickOld(task.title)}
                                    >
                                      <Timer className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {task.dueDate && (
                                    <Badge variant="outline" className="text-xs">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {task.dueDate.toLocaleDateString()}
                                    </Badge>
                                  )}
                                  {task.project && (
                                    <Badge variant="outline" className="text-xs">
                                      {task.project}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      {sortedTasks.filter((task) => task.priority === "important-not-urgent").length === 0 && (
                        <div className="text-center py-3 text-sm text-muted-foreground">没有重要不紧急的任务</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-blue-500" />
                        不重要但紧急
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sortedTasks
                        .filter((task) => task.priority === "not-important-urgent")
                        .map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "border rounded-lg p-3 bg-white dark:bg-gray-800 transition-colors",
                              task.completed ? "bg-muted/50" : "hover:bg-muted/30",
                            )}
                          >
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => toggleTaskCompletion(task.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h3
                                    className={cn(
                                      "text-sm font-medium",
                                      task.completed && "line-through text-muted-foreground",
                                    )}
                                  >
                                    {task.isFrog && "🐸 "}
                                    {task.title}
                                  </h3>
                                  <div className="flex items-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handlePomodoroClickOld(task.title)}
                                    >
                                      <Timer className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {task.dueDate && (
                                    <Badge variant="outline" className="text-xs">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {task.dueDate.toLocaleDateString()}
                                    </Badge>
                                  )}
                                  {task.project && (
                                    <Badge variant="outline" className="text-xs">
                                      {task.project}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      {sortedTasks.filter((task) => task.priority === "not-important-urgent").length === 0 && (
                        <div className="text-center py-3 text-sm text-muted-foreground">没有不重要但紧急的任务</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-green-500" />
                        不重要不紧急
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {sortedTasks
                        .filter((task) => task.priority === "not-important-not-urgent")
                        .map((task) => (
                          <div
                            key={task.id}
                            className={cn(
                              "border rounded-lg p-3 bg-white dark:bg-gray-800 transition-colors",
                              task.completed ? "bg-muted/50" : "hover:bg-muted/30",
                            )}
                          >
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={() => toggleTaskCompletion(task.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h3
                                    className={cn(
                                      "text-sm font-medium",
                                      task.completed && "line-through text-muted-foreground",
                                    )}
                                  >
                                    {task.isFrog && "🐸 "}
                                    {task.title}
                                  </h3>
                                  <div className="flex items-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handlePomodoroClickOld(task.title)}
                                    >
                                      <Timer className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {task.dueDate && (
                                    <Badge variant="outline" className="text-xs">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {task.dueDate.toLocaleDateString()}
                                    </Badge>
                                  )}
                                  {task.project && (
                                    <Badge variant="outline" className="text-xs">
                                      {task.project}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      {sortedTasks.filter((task) => task.priority === "not-important-not-urgent").length === 0 && (
                        <div className="text-center py-3 text-sm text-muted-foreground">没有不重要不紧急的任务</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <div className="flex items-center justify-between w-full">
                <div className="text-sm text-muted-foreground">
                  {sortedTasks.filter((task) => task.completed).length} 已完成 / {sortedTasks.length} 总计
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加任务
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      <PomodoroModal
        open={pomodoroModalOpen}
        onOpenChange={setPomodoroModalOpen}
        initialTask={selectedTaskForPomodoro}
      />
    </div>
  )
}
