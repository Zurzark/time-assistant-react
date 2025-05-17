"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  Clock,
  Tag,
  Flag,
  Trash,
  Edit,
  X,
  Lightbulb,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const tasks = [
  {
    id: 1,
    title: "完成产品设计方案",
    description: "为新版应用完成用户界面设计和交互流程",
    priority: "high",
    dueDate: "2025-05-17",
    estimatedTime: 120,
    project: "产品开发",
    status: "in-progress",
    tags: ["设计", "UI/UX"],
  },
  {
    id: 2,
    title: "团队周会",
    description: "与团队讨论本周进度和下周计划",
    priority: "medium",
    dueDate: "2025-05-17",
    estimatedTime: 60,
    project: "团队管理",
    status: "todo",
    tags: ["会议"],
  },
  {
    id: 3,
    title: "编写项目文档",
    description: "完成项目技术文档和用户手册",
    priority: "medium",
    dueDate: "2025-05-17",
    estimatedTime: 90,
    project: "产品开发",
    status: "todo",
    tags: ["文档"],
  },
  {
    id: 4,
    title: "学习React新特性",
    description: "学习React 19的新特性和最佳实践",
    priority: "low",
    dueDate: "2025-05-17",
    estimatedTime: 60,
    project: "个人发展",
    status: "todo",
    tags: ["学习", "技术"],
  },
  {
    id: 5,
    title: "健身",
    description: "进行每日健身锻炼",
    priority: "medium",
    dueDate: "2025-05-17",
    estimatedTime: 60,
    project: "健康",
    status: "todo",
    tags: ["个人"],
  },
  {
    id: 6,
    title: "回复邮件",
    description: "回复重要客户和合作伙伴的邮件",
    priority: "high",
    dueDate: "2025-05-16",
    estimatedTime: 30,
    project: "沟通",
    status: "completed",
    tags: ["沟通"],
  },
  {
    id: 7,
    title: "准备演讲材料",
    description: "为下周的产品发布会准备演讲材料",
    priority: "high",
    dueDate: "2025-05-20",
    estimatedTime: 120,
    project: "市场营销",
    status: "todo",
    tags: ["演讲", "市场"],
  },
]

const priorityColors = {
  high: "text-red-500",
  medium: "text-amber-500",
  low: "text-green-500",
}

const priorityBg = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-green-500",
}

const priorityLabels = {
  high: "高",
  medium: "中",
  low: "低",
}

const statusLabels = {
  todo: "待办",
  "in-progress": "进行中",
  completed: "已完成",
}

export function TasksView() {
  const [viewType, setViewType] = useState("list")
  const [openDialog, setOpenDialog] = useState(false)
  const [editTask, setEditTask] = useState(null)

  const handleNewTask = () => {
    setEditTask(null)
    setOpenDialog(true)
  }

  const handleEditTask = (task) => {
    setEditTask(task)
    setOpenDialog(true)
  }

  return (
    <div className="flex flex-col p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">任务管理</h1>
          <p className="text-muted-foreground">管理和组织您的所有任务</p>
        </div>
        <Button className="gap-2" onClick={handleNewTask}>
          <Plus className="h-4 w-4" />
          <span>新建任务</span>
        </Button>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>所有任务</CardTitle>
                <CardDescription>共 {tasks.length} 个任务</CardDescription>
              </div>
              <Tabs defaultValue="all" className="w-[400px]">
                <TabsList>
                  <TabsTrigger value="all">全部</TabsTrigger>
                  <TabsTrigger value="todo">待办</TabsTrigger>
                  <TabsTrigger value="in-progress">进行中</TabsTrigger>
                  <TabsTrigger value="completed">已完成</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="搜索任务..." className="pl-8" />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    视图
                    <MoreHorizontal className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewType("list")}>列表视图</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewType("kanban")}>看板视图</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {viewType === "list" ? (
              <div className="rounded-md border">
                <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 text-sm font-medium">
                  <div className="col-span-1"></div>
                  <div className="col-span-5">任务</div>
                  <div className="col-span-1">优先级</div>
                  <div className="col-span-2">截止日期</div>
                  <div className="col-span-2">项目</div>
                  <div className="col-span-1">操作</div>
                </div>
                <div className="divide-y">
                  {tasks.map((task) => (
                    <div key={task.id} className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-muted/30">
                      <div className="col-span-1">
                        <Checkbox id={`task-${task.id}`} />
                      </div>
                      <div className="col-span-5">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground truncate">{task.description}</div>
                        <div className="flex gap-1 mt-1">
                          {task.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <div className={cn("flex items-center gap-1", priorityColors[task.priority])}>
                          <div className={cn("h-2 w-2 rounded-full", priorityBg[task.priority])}></div>
                          <span>{priorityLabels[task.priority]}</span>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{task.dueDate}</span>
                      </div>
                      <div className="col-span-2">
                        <Badge variant="secondary">{task.project}</Badge>
                      </div>
                      <div className="col-span-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTask(task)}>
                              <Edit className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Trash className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["todo", "in-progress", "completed"].map((status) => (
                  <div key={status} className="flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{statusLabels[status]}</h3>
                      <Badge variant="outline">{tasks.filter((t) => t.status === status).length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {tasks
                        .filter((t) => t.status === status)
                        .map((task) => (
                          <div
                            key={task.id}
                            className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="font-medium">{task.title}</div>
                              <div className={cn("flex items-center gap-1", priorityColors[task.priority])}>
                                <div className={cn("h-2 w-2 rounded-full", priorityBg[task.priority])}></div>
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">{task.description}</div>
                            <div className="mt-3 flex flex-wrap gap-1">
                              {task.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="mt-3 flex items-center justify-between text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span>{task.dueDate}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span>
                                  {Math.floor(task.estimatedTime / 60)}h {task.estimatedTime % 60}m
                                </span>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <Badge variant="secondary">{task.project}</Badge>
                              <Button variant="ghost" size="icon" onClick={() => handleEditTask(task)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editTask ? "编辑任务" : "创建新任务"}</DialogTitle>
            <DialogDescription>{editTask ? "修改任务详情" : "添加新任务到您的任务列表"}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">任务标题</Label>
              <Input id="title" defaultValue={editTask?.title || ""} placeholder="输入任务标题" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">任务描述</Label>
              <Textarea
                id="description"
                defaultValue={editTask?.description || ""}
                placeholder="输入任务描述"
                rows={3}
              />
              <div className="flex items-center text-xs text-muted-foreground">
                <Lightbulb className="h-3 w-3 mr-1" />
                AI 可以帮助您分解复杂任务
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dueDate">截止日期</Label>
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input id="dueDate" type="date" defaultValue={editTask?.dueDate || ""} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estimatedTime">预估时间</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="estimatedTime"
                    type="number"
                    defaultValue={editTask ? Math.floor(editTask.estimatedTime / 60) : ""}
                    placeholder="小时"
                    className="w-20 mr-2"
                  />
                  <span className="mr-2">小时</span>
                  <Input
                    type="number"
                    defaultValue={editTask ? editTask.estimatedTime % 60 : ""}
                    placeholder="分钟"
                    className="w-20 mr-2"
                  />
                  <span>分钟</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  AI 可以帮助您预估时间
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">优先级</Label>
                <div className="flex items-center">
                  <Flag className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Select defaultValue={editTask?.priority || "medium"}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择优先级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="low">低</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project">项目</Label>
                <div className="flex items-center">
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Select defaultValue={editTask?.project || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择项目" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="产品开发">产品开发</SelectItem>
                      <SelectItem value="团队管理">团队管理</SelectItem>
                      <SelectItem value="个人发展">个人发展</SelectItem>
                      <SelectItem value="健康">健康</SelectItem>
                      <SelectItem value="沟通">沟通</SelectItem>
                      <SelectItem value="市场营销">市场营销</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>标签</Label>
              <div className="flex flex-wrap gap-2 border rounded-md p-2">
                {(editTask?.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" />
                  </Badge>
                ))}
                <Input placeholder="添加标签..." className="w-24 h-7 border-none text-sm" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>子任务</Label>
              <div className="space-y-2 border rounded-md p-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="subtask-1" />
                  <Label htmlFor="subtask-1" className="text-sm">
                    准备设计草图
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="subtask-2" />
                  <Label htmlFor="subtask-2" className="text-sm">
                    创建交互原型
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="添加子任务..." className="h-7 text-sm" />
                  <Button size="sm" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              取消
            </Button>
            <Button onClick={() => setOpenDialog(false)}>{editTask ? "保存修改" : "创建任务"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
